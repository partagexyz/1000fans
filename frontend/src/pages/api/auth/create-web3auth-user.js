// pages/api/auth/create-web3auth-user.js
import { MongoClient } from "mongodb";
import { connect, KeyPair, keyStores, utils } from "near-api-js";
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' });
const COMPANY_WALLET = '0x9a1761ca62c0f3fe06D508Ba335aD0eBdA690b45';

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { accountId, publicKey, email, paymentId: sessionId, amount } = req.body;
  console.log("Request received:", { accountId, publicKey, email, sessionId, amount });

  // Validate inputs
  if (!accountId || !publicKey || !email) {
    return res.status(400).json({ message: "Account ID, public key, and email are required" });
  }
  if (!/^[a-z0-9_-]{2,64}\.1000fans\.near$/.test(accountId) && !/^[a-f0-9]{64}$/.test(accountId)) {
    return res.status(400).json({ message: "Invalid NEAR account ID format (e.g., user.1000fans.near)" });
  }
  if (!publicKey.startsWith('ed25519:') || publicKey.length !== 52) {
    return res.status(400).json({ message: `Invalid public key format: ${publicKey} (must be ed25519:<44-char-base58>)` });
  }
  if (amount && (isNaN(amount) || amount < 5 || amount > 20)) {
    return res.status(400).json({ message: "Amount must be between 5 and 20 USD" });
  }

  let client;
  try {
    // Validate environment variables
    if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is not set");
    if (!process.env.RELAYER_PRIVATE_KEY) throw new Error("RELAYER_PRIVATE_KEY is not set");
    if (!process.env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY is not set');
    console.log("Environment variables validated");

    // Connect to MongoDB
    console.log("Attempting MongoDB connection...");
    client = new MongoClient(process.env.MONGODB_URI, { connectTimeoutMS: 5000 });
    await client.connect();
    console.log('MongoDB connected');
    const db = client.db("1000fans");
    const usersCollection = db.collection("users");
    const paymentsCollection = db.collection('payments');

    // Check for duplicates
    console.log("Checking for existing account...");
    const existingAccount = await usersCollection.findOne({ $or: [{ accountId }, { publicKey }, { email }] });
    if (existingAccount) {
      return res.status(400).json({ message: `Account already exists for ${existingAccount.email || existingAccount.accountId}` });
    }

    // Verify onramp session status and destination address
    let paymentStatus = 'pending';
    if (sessionId) {
      console.log('Verifying payment:', sessionId);
      try {
        // Check MongoDB first
        const payment = await paymentsCollection.findOne({ sessionId });
        if (payment) {
          paymentStatus = payment.status;
          console.log(`Payment status in MongoDB: ${paymentStatus}`);
        }
        // If not 'fulfillment_complete', check Stripe directly
        if (!payment || payment.status !== 'fulfillment_complete') {
          const session = await stripe.crypto.onrampSessions.retrieve(sessionId);
          paymentStatus = session.status;
          console.log(`Payment status from Stripe: ${paymentStatus}`);
          // Verify destination address
          const destinationAddress = session.transaction_details?.destination_address;
          if (destinationAddress && destinationAddress.toLowerCase() !== COMPANY_WALLET.toLowerCase()) {
            return res.status(400).json({ message: `Invalid destination address: ${destinationAddress}. Must be company wallet.` });
          }
          if (paymentStatus === 'cancelled' || paymentStatus === 'expired') {
            return res.status(400).json({ message: 'Payment ${paymentStatus}, cannot create account' });
          }
          // Update MongoDB with latest status
          await paymentsCollection.updateOne(
            { sessionId },
            { $set: { status: paymentStatus, updatedAt: new Date() } },
            { upsert: true }
          );
          if (paymentStatus !== 'fulfillment_complete') {
            console.log(`Payment not yet complete: ${paymentStatus}, proceeding with account creation`);
          }
        }
      } catch (error) {
        console.error('Payment verification error:', { message: error.message, stack: error.stack });
        throw new Error(`Failed to verify payment: ${error.message}`);
      }
    } else {
      console.log('No sessionId provided, skipping payment verification');
    }

    // Set up NEAR connection
    console.log("Setting up NEAR connection...");
    const keyStore = new keyStores.InMemoryKeyStore();
    const relayerAccountId = "1000fans.near";
    let relayerKeyPair;
    try {
      relayerKeyPair = KeyPair.fromString(process.env.RELAYER_PRIVATE_KEY);
      console.log('Relayer public key:', relayerKeyPair.getPublicKey().toString());
      await keyStore.setKey('mainnet', relayerAccountId, relayerKeyPair);
    } catch (error) {
      throw new Error(`Invalid RELAYER_PRIVATE_KEY: ${error.message}`);
    }

    const connectionConfig = {
      networkId: "mainnet",
      keyStore,
      nodeUrl: "https://rpc.mainnet.near.org",
      walletUrl: "https://wallet.mainnet.near.org",
      helperUrl: "https://helper.mainnet.near.org",
      explorerUrl: "https://explorer.mainnet.near.org",
      fallbackNodeUrl: "https://rpc.near.org",
    };

    let near;
    try {
      near = await connect(connectionConfig);
      console.log("Connected to primary NEAR RPC");
    } catch (error) {
      console.error("Primary RPC failed, trying fallback:", error);
      try {
        near = await connect({ ...connectionConfig, nodeUrl: connectionConfig.fallbackNodeUrl });
        console.log('Connected to fallback NEAR RPC');
      } catch (fallbackError) {
        throw new Error(`NEAR connection failed: ${fallbackError.message}`);
      }
    }

    let relayerAccount;
    try {
      relayerAccount = await near.account(relayerAccountId);
      console.log('Relayer account loaded:', relayerAccountId);
    } catch (error) {
      throw new Error(`Failed to load relayer account: ${error.message}`);
    }

    // Verify relayer balance
    try {
      const state = await relayerAccount.state();
      const balance = Number(state.amount) / 1e24;
      console.log(`Relayer balance: ${balance} NEAR`);
      if (balance < 0.139) {
        throw new Error(`Insufficient balance in ${relayerAccountId}: ${balance} NEAR`);
      }
    } catch (error) {
      throw new Error(`Failed to check relayer balance: ${error.message}`);
    }

    // Create NEAR account
    console.log("Creating NEAR account:", accountId);
    let createdAccountId = null;
    try {
      await relayerAccount.createAccount(
        accountId,
        publicKey,
        utils.format.parseNearAmount("0.1")
      );
      createdAccountId = accountId;
      console.log(`Created NEAR account: ${accountId}`);
    } catch (error) {
      console.error("NEAR account creation error:", { error: error.message, stack: error.stack });
      throw new Error(`Failed to create NEAR account: ${error.message}`);
    }

    // Mint fan token
    console.log("Minting fan token for:", accountId);
    const tokenMetadata = {
      title: "1000fans Access Token",
      description: `Grants access to theosis.1000fans.near`,
      media: null,
      media_hash: null,
      copies: 1,
      issued_at: null,
      expires_at: null,
      starts_at: null,
      updated_at: null,
      extra: JSON.stringify({ group_id: "theosis" }),
      reference: null,
      reference_hash: null,
    };
    const groupId = "theosis";
    const contractId = "theosis.1000fans.near";
    const mintDeposit = utils.format.parseNearAmount("0.039"); // 0.007 for mint + 0.007 for nft_mint_callback + 0.025 for add_group_member
    let tokenId;
    try {
      const mintResult = await relayerAccount.functionCall({
        contractId,
        methodName: "nft_mint",
        args: {
          token_owner_id: accountId,
          token_metadata: tokenMetadata,
          group_id: groupId,
        },
        gas: "100000000000000", // 100 TGas
        attachedDeposit: mintDeposit,
      });
      console.log("Mint result:", JSON.stringify(mintResult, null, 2));

      // Extract token ID from transaction logs
      if (mintResult.status && mintResult.status.SuccessValue) {
        try {
          const decodedValue = Buffer.from(mintResult.status.SuccessValue, 'base64').toString();
          console.log('Decoded mint result:', decodedValue);
          const token = JSON.parse(decodedValue);
          tokenId = token.token_id;
          if (!tokenId) {
            throw new Error('Token ID missing in mint result');
          }
        } catch (parseError) {
          console.error('Failed to parse mint result:', parseError);
          // Fallback: Check transaction logs for token_id
          const logs = mintResult.transaction_outcome?.outcome?.logs || [];
          const tokenLog = logs.find(log => log.includes('token_id'));
          if (tokenLog) {
            const match = tokenLog.match(/"token_id":"([^"]+)"/);
            tokenId = match ? match[1] : null;
          }
          if (!tokenId) {
            throw new Error(`Failed to parse mint result: ${parseError.message}`);
          }
        }
      } else {
        console.error('Mint transaction failed:', JSON.stringify(mintResult, null, 2));
        throw new Error("Mint transaction failed or no SuccessValue");
      }
      console.log(`Minted token: ${tokenId} for ${accountId}`);
    } catch (error) {
      console.error('Token minting error:', { message: error.message, stack: error.stack });
      // Delete account if mint fails
      if (createdAccountId) {
        try {
          await relayerAccount.functionCall({
            contractId: createdAccountId,
            methodName: 'delete_account',
            args: { beneficiary_id: relayerAccountId },
            gas: '30000000000000',
            attachedDeposit: '0',
          });
          console.log(`Deleted account ${createdAccountId} due to mint failure`);
        } catch (deleteError) {
          console.error(`Failed to delete account ${createdAccountId}:`, deleteError);
        }
      }
      throw new Error(`Failed to mint token: ${error.message}`);
    }

    // Store in MongoDB
    console.log("Storing user in MongoDB...");
    try {
      const userDoc = {
        accountId,
        publicKey,
        email,
        tokenId,
        payment: sessionId ? Number(amount) : null,
        onrampSessionId: sessionId || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const result = await usersCollection.insertOne(userDoc);
      console.log(`User created: ${accountId}, MongoDB ID: ${result.insertedId}`);
    } catch (error) {
      // Delete account if MongoDB insert fails
      if (createdAccountId) {
        try {
          await relayerAccount.functionCall({
            contractId: createdAccountId,
            methodName: 'delete_account',
            args: { beneficiary_id: relayerAccountId },
            gas: '30000000000000',
            attachedDeposit: '0',
          });
          console.log(`Deleted account ${createdAccountId} due to MongoDB failure`);
        } catch (deleteError) {
          console.error(`Failed to delete account ${createdAccountId}:`, deleteError);
        }
      }
      throw new Error(`Failed to store user in MongoDB: ${error.message}`);
    }

    return res.status(200).json({ success: true, accountId, tokenId });
  } catch (error) {
    console.error('Error in create-web3auth-user:', {
      message: error.message,
      stack: error.stack,
      requestBody: req.body,
    });
    return res.status(500).json({ message: 'Failed to create NEAR account', error: error.message });
  } finally {
    if (client) {
      try {
        await client.close();
        console.log('MongoDB connection closed');
      } catch (closeError) {
        console.error('Failed to close MongoDB connection:', closeError);
      }
    }
  }
}