// pages/api/auth/create-web3auth-user.js
import { MongoClient } from "mongodb";
import { connect, KeyPair, keyStores, utils } from "near-api-js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { accountId, publicKey, email, paymentId, amount } = req.body;
  console.log("Request received:", { accountId, publicKey, email, paymentId, amount });

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
    console.log("Environment variables validated");

    // Connect to MongoDB
    console.log("Attempting MongoDB connection...");
    client = new MongoClient(process.env.MONGODB_URI, { connectTimeoutMS: 5000 });
    try {
      await client.connect();
      console.log('MongoDB connected');
    } catch (error) {
      throw new Error(`MongoDB connection failed: ${error.message}`);
    }
    const db = client.db("1000fans");
    const usersCollection = db.collection("users");
    const paymentsCollection = db.collection('payments');

    // Check for duplicates
    console.log("Checking for existing account...");
    try {
      const existingAccount = await usersCollection.findOne({ $or: [{ accountId }, { publicKey }, { email }] });
      if (existingAccount) {
        return res.status(400).json({ message: `Account already exists for ${existingAccount.email || existingAccount.accountId}` });
      }
    } catch (error) {
      throw new Error(`Failed to check for existing account: ${error.message}`);
    }

    // Verify payment status
    if (paymentId) {
      console.log('Verifying payment:', paymentId);
      try {
        const payment = await paymentsCollection.findOne({ paymentId });
        if (!payment || payment.status !== 'confirmed') {
          return res.status(400).json({ message: 'Payment not confirmed' });
        }
      } catch (error) {
        throw new Error(`Failed to verify payment: ${error.message}`);
      }
    } else {
      console.log('No paymentId provided, skipping payment verification');
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
      console.log("Mint result:", mintResult);

      // Extract token ID from transaction logs
      let tokenId;
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
          throw new Error(`Failed to parse mint result: ${parseError.message}`);
        }
      } else {
        throw new Error("Mint transaction failed or no SuccessValue");
      }
      console.log(`Minted token: ${tokenId} for ${accountId}`);

      // Store in MongoDB
      console.log("Storing user in MongoDB...");
      try {
        const userDoc = {
          accountId,
          publicKey,
          email,
          tokenId,
          payment: paymentId ? Number(amount) : null,
          createdAt: new Date(),
        };
        const result = await usersCollection.insertOne(userDoc);
        console.log(`User created: ${accountId}, MongoDB ID: ${result.insertedId}`);
      } catch (error) {
        throw new Error(`Failed to store user in MongoDB: ${error.message}`);
      }
      //await client.close();
      return res.status(200).json({ success: true, accountId, tokenId });
    } catch (error) {
      console.error("Token minting error:", { error: error.message, stack: error.stack });
      // Delete account if mint fails
      if (createdAccountId) {
        try {
          await relayerAccount.functionCall({
            contractId: createdAccountId,
            methodName: "delete_account",
            args: { beneficiary_id: relayerAccountId },
            gas: "30000000000000", // 30 TGas
            attachedDeposit: "0",
          });
          console.log(`Deleted account ${createdAccountId} due to mint failure`);
        } catch (deleteError) {
          console.error(`Failed to delete account ${createdAccountId}:`, deleteError);
        }
      }
      throw new Error(`Failed to mint token: ${error.message}`);
    }
  } catch (error) {
    console.error("Error in create-web3auth-user:", { error: error.message, stack: error.stack });
    if (client) await client.close();
    return res.status(500).json({ message: "Internal server error", error: error.message });
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