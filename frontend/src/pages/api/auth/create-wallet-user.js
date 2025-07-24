// pages/api/auth/create-wallet-user.js
import { MongoClient } from "mongodb";
import { connect, KeyPair, keyStores, utils } from "near-api-js";
import { wrapKey } from '../../../utils/crypto';

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { accountId, email } = req.body;
  console.log(`Request received: accountId=${accountId}, email=${email || "none"}`);

  if (!accountId) {
    return res.status(400).json({ message: "Account ID is required" });
  }
  if (!/^[a-z0-9_-]{2,64}\.near$/.test(accountId) && !/^[a-f0-9]{64}$/.test(accountId)) {
    return res.status(400).json({ message: "Invalid NEAR account ID format" });
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

    // Check if user already exists
    console.log("Checking for existing account...");
    let existingUser = await usersCollection.findOne({ accountId });
    if (existingUser) {
      console.log(`User ${accountId} already exists in MongoDB`);
      return res.status(200).json({
        accountId,
        tokenId: existingUser.tokenId,
        isGroupMember: existingUser.isGroupMember,
        publicKey: existingUser.publicKey,
        wrappedKey: existingUser.wrappedKey
      });
    }

    // Set up NEAR connection
    console.log("Setting up NEAR connection...");
    const keyStore = new keyStores.InMemoryKeyStore();
    const relayerAccountId = "1000fans.near";
    let relayerKeyPair;
    try {
      relayerKeyPair = KeyPair.fromString(process.env.RELAYER_PRIVATE_KEY);
      await keyStore.setKey("mainnet", relayerAccountId, relayerKeyPair);
    } catch (error) {
      throw new Error(`Invalid RELAYER_PRIVATE_KEY: ${error.message}`);
    }

    const near = await connect({
      networkId: "mainnet",
      keyStore,
      nodeUrl: "https://rpc.mainnet.near.org",
      walletUrl: "https://wallet.mainnet.near.org",
      helperUrl: "https://helper.mainnet.near.org",
      explorerUrl: "https://explorer.mainnet.near.org",
    });
    console.log("Connected to NEAR RPC");

    const relayerAccount = await near.account(relayerAccountId);
    console.log("Relayer account loaded:", relayerAccountId);

    // Verify relayer balance
    const state = await relayerAccount.state();
    const balance = Number(state.amount) / 1e24;
    console.log(`Relayer balance: ${balance} NEAR`);
    if (balance < 0.145) {
      throw new Error(`Insufficient balance in ${relayerAccountId}: ${balance} NEAR`);
    }

    // Get user's public key
    let publicKey = null;
    try {
      console.log(`Fetching public key for ${accountId}`);
      const accessKeyResponse = await near.connection.provider.query({
        request_type: "view_access_key_list",
        finality: "final",
        account_id: accountId
      });
      const accessKeys = accessKeyResponse.keys || [];
      if (accessKeys.length === 0) {
        throw new Error("No access keys found for account");
      }
      // Prefer FullAccess key, fallback to first available key
      const targetKey = accessKeys.find(key => key.access_key.permission === 'FullAccess') || accessKeys[0];
      publicKey = targetKey.public_key;
      console.log(`Public key retrieved: ${publicKey}`);
    } catch (error) {
      console.warn(`Failed to fetch public key: ${error.message}, checking token metadata`);
      // Fallback: Check token metadata
      const tokens = await near.connection.provider.query({
        request_type: "call_function",
        account_id: "theosis.1000fans.near",
        method_name: "nft_tokens_for_owner",
        args_base64: Buffer.from(JSON.stringify({ account_id: accountId, from_index: null, limit: 1 })).toString("base64"),
        finality: "optimistic",
      });
      const tokenData = JSON.parse(Buffer.from(tokens.result).toString());
      if (tokenData.length > 0 && tokenData[0].metadata.extra) {
        const metadata = JSON.parse(tokenData[0].metadata.extra);
        publicKey = metadata.publicKey || null;
      }
      if (!publicKey) {
        console.warn(`No public key available for ${accountId}, proceeding without wrapped key`);
      }
    }

    // Log publicKey for debugging
    console.log(`Public key before token metadata: ${publicKey}`);

    // Check token ownership
    let tokenId = existingUser?.tokenId;
    if (!tokenId) {
      console.log("Checking token ownership for:", accountId);
      const tokens = await near.connection.provider.query({
        request_type: "call_function",
        account_id: "theosis.1000fans.near",
        method_name: "nft_tokens_for_owner",
        args_base64: Buffer.from(JSON.stringify({ account_id: accountId, from_index: null, limit: 1 })).toString("base64"),
        finality: "optimistic",
      });
      const tokenData = JSON.parse(Buffer.from(tokens.result).toString());
      tokenId = tokenData.length > 0 ? tokenData[0].token_id : null;
    }

    // Mint fan token if none exists
    if(!tokenId) {
      console.log(`No token found for ${accountId}, minting new token...`);
      const extra = JSON.stringify({ group_id: "theosis", publicKey });
      console.log(`Token metadata extra: ${extra}`);
      const tokenMetadata = {
        title: "1000fans Access Token",
        description: "Grants access to theosis.1000fans.near",
        media: null,
        media_hash: null,
        copies: 1,
        issued_at: null,
        expires_at: null,
        starts_at: null,
        updated_at: null,
        extra,
        reference: null,
        reference_hash: null,
      };
      const groupId = "theosis";
      const contractId = "theosis.1000fans.near";
      const mintDeposit = utils.format.parseNearAmount("0.06"); // 0.007 for mint + 0.007 for callback + 0.025 for add_group_member

      const mintResult = await relayerAccount.functionCall({
        contractId,
        methodName: "nft_mint",
        args: {
          token_owner_id: accountId,
          token_metadata: tokenMetadata,
          group_id: groupId,
        },
        gas: "100000000000000",
        attachedDeposit: mintDeposit,
      });

      // Log receipts for debugging
      console.log("Mint transaction receipts:", JSON.stringify(mintResult.transaction_outcome?.outcome?.logs || [], null, 2));
      console.log("Mint transaction status:", JSON.stringify(mintResult.status, null, 2));

      // Extract token ID
      if (mintResult.status?.SuccessValue) {
        try {
          const decodedValue = Buffer.from(mintResult.status.SuccessValue, 'base64').toString();
          console.log('Decoded mint result:', decodedValue);
          const token = JSON.parse(decodedValue);
          tokenId = token.token_id;
          if (!tokenId) throw new Error('Token ID missing in mint result');
        } catch (parseError) {
          console.error('Failed to parse mint result:', parseError);
          const logs = mintResult.transaction_outcome?.outcome?.logs || [];
          const tokenLog = logs.find(log => log.includes('token_id'));
          if (tokenLog) {
            const match = tokenLog.match(/"token_id":"([^"]+)"/);
            tokenId = match ? match[1] : null;
          }
          if (!tokenId) throw new Error(`Failed to parse mint result: ${parseError.message}`);
        }
      } else {
        throw new Error(`Failed to mint token: ${error.message}`);
      }
      console.log(`Minted token: ${tokenId} for ${accountId}`);
    } else {
      console.log(`User ${accountId} already owns token ${tokenId}`);
    }

    // verify group membership
    let isGroupMember = existingUser?.isGroupMember;
    if (!isGroupMember) {
      console.log(`Checking group membership for ${accountId}`);
      isGroupMember = await near.connection.provider.query({
        request_type: "call_function",
        account_id: "theosis.devbot.near",
        method_name: "is_authorized",
        args_base64: Buffer.from(JSON.stringify({ group_id: "theosis", user_id: accountId })).toString("base64"),
        finality: "optimistic",
      }).then(res => JSON.parse(Buffer.from(res.result).toString()));
    }

    // Add to group
    if (!isGroupMember) {
      console.log(`Adding ${accountId} to theosis group`);
      const groupResult = await relayerAccount.functionCall({
        contractId: "theosis.devbot.near",
        methodName: "add_group_member",
        args: { group_id: "theosis", user_id: accountId },
        gas: "50000000000000",
        attachedDeposit: utils.format.parseNearAmount("0.025"),
      });
      console.log("Group add receipts:", JSON.stringify(groupResult.transaction_outcome?.outcome?.logs || [], null, 2));
      isGroupMember = true;
    } else {
      console.log(`User ${accountId} is already a member of theosis group`);
    }

    // Fetch and wrap group key
    let wrappedKey = null;
    if (publicKey) {
      try {
        console.log("Fetching group key for theosis...");
        const groupKey = await relayerAccount.viewFunction(
          "theosis.devbot.near",
          "get_group_key",
          { group_id: "theosis", user_id: accountId }
        );
        console.log("Group key fetched:", groupKey);
        wrappedKey = wrapKey(groupKey, publicKey);
        console.log("Group key wrapped successfully:", wrappedKey);
      } catch (error) {
        console.warn("Failed to fetch or wrap group key:", error.message);
        // Continue without wrapped key to avoid blocking
      }
    } else {
      console.warn("No public key available, skipping key wrapping");
    }

    // Update or insert user in MongoDB
    console.log(`Storing user ${accountId} in MongoDB`);
    const userDoc = {
      accountId,
      email: email || null,
      tokenId,
      isGroupMember,
      publicKey,
      wrappedKey,
      createdAt: existingUser ? existingUser.createdAt : new Date(),
      updatedAt: new Date(),
    };
    if (existingUser) {
      const result = await usersCollection.updateOne(
        { accountId },
        { $set: { tokenId, isGroupMember, publicKey, wrappedKey, updatedAt: new Date() } }
      );
      console.log(`Updated user: ${accountId}, Modified: ${result.modifiedCount}`);
    } else {
      const result = await usersCollection.insertOne(userDoc);
      console.log(`User created: ${accountId}, MongoDB ID: ${result.insertedId}`);
    }

    return res.status(200).json({ accountId, tokenId, isGroupMember, publicKey, wrappedKey });
  } catch (error) {
    console.error('Error in create-wallet-user:', { message: error.message, stack: error.stack });
    return res.status(500).json({ message: "Error creating wallet user", error: error.message });
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