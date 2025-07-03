// pages/api/auth/create-web3auth-user.js
import { MongoClient } from "mongodb";
import { connect, KeyPair, keyStores, utils } from "near-api-js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { accountId, publicKey, email } = req.body;
  console.log("Request received:", { accountId, publicKey, email });

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

  let client;
  try {
    // Validate environment variables
    if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is not set");
    if (!process.env.RELAYER_PRIVATE_KEY) throw new Error("RELAYER_PRIVATE_KEY is not set");
    console.log("Environment variables validated");

    // Connect to MongoDB
    console.log("Attempting MongoDB connection...");
    client = new MongoClient(process.env.MONGODB_URI, { connectTimeoutMS: 5000 });
    await client.connect();
    console.log("MongoDB connected");
    const db = client.db("1000fans");
    const usersCollection = db.collection("users");

    // Check for duplicates
    console.log("Checking for existing account...");
    const existingAccount = await usersCollection.findOne({ $or: [{ accountId }, { publicKey }, { email }] });
    if (existingAccount) {
      await client.close();
      return res.status(400).json({ message: `Account already exists for ${existingAccount.email || existingAccount.accountId}` });
    }

    // Set up NEAR connection
    console.log("Setting up NEAR connection...");
    const keyStore = new keyStores.InMemoryKeyStore();
    const relayerAccountId = "1000fans.near";
    const relayerKeyPair = KeyPair.fromString(process.env.RELAYER_PRIVATE_KEY);
    //console.log("Relayer public key:", relayerKeyPair.getPublicKey().toString());
    await keyStore.setKey("mainnet", relayerAccountId, relayerKeyPair);

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
      near = await connect({ ...connectionConfig, nodeUrl: connectionConfig.fallbackNodeUrl });
      console.log("Connected to fallback NEAR RPC");
    }

    const relayerAccount = await near.account(relayerAccountId);
    console.log("Relayer account loaded:", relayerAccount.accountId);

    // Verify relayer balance
    const state = await relayerAccount.state();
    const balance = Number(state.amount) / 1e24;
    console.log(`Relayer balance: ${balance} NEAR`);
    if (balance < 0.139) { // 0.1 for account + 0.007 for nft_mint + 0.007 for nft_mint_callback + 0.025 for add_group_member
      throw new Error(`Insufficient balance in ${relayerAccountId}: ${balance} NEAR`);
    }

    // Create NEAR account
    console.log("Creating NEAR account:", accountId);
    try {
      await relayerAccount.createAccount(
        accountId,
        publicKey,
        utils.format.parseNearAmount("0.1")
      );
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
      if (!mintResult.status.SuccessValue) {
        throw new Error("Mint transaction failed: No SuccessValue returned");
      }
      let token;
      try {
        token = JSON.parse(Buffer.from(mintResult.status.SuccessValue).toString());
      } catch (parseError) {
        console.error("Failed to parse mint result:", parseError, mintResult.status.SuccessValue);
        throw new Error(`Failed to parse mint result: ${parseError.message}`);
      }
      if (!token || !token.token_id) {
        throw new Error("Failed to retrieve token ID from mint result");
      }
      const tokenId = token.token_id;
      console.log(`Minted token: ${tokenId} for ${accountId}`);

      // Store in MongoDB
      console.log("Storing user in MongoDB...");
      const userDoc = {
        accountId,
        publicKey,
        email,
        tokenId,
        createdAt: new Date(),
      };
      const result = await usersCollection.insertOne(userDoc);
      console.log(`User created: ${accountId}, MongoDB ID: ${result.insertedId}`);

      await client.close();
      return res.status(200).json({ success: true, accountId, tokenId });
    } catch (error) {
      console.error("Token minting error:", { error: error.message, stack: error.stack });
      // Delete account if mint fails
      try {
        await relayerAccount.deleteAccount(accountId, "1000fans.near");
        console.log(`Deleted account ${accountId} due to mint failure`);
      } catch (deleteError) {
        console.error("Failed to delete account:", deleteError);
      }
      throw new Error(`Failed to mint token: ${error.message}`);
    }
  } catch (error) {
    console.error("Error in create-web3auth-user:", { error: error.message, stack: error.stack });
    if (client) await client.close();
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
}