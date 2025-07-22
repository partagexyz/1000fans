// pages/api/auth/check-for-account.js
import { MongoClient } from "mongodb";
import { connect, keyStores } from "near-api-js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { email, publicKey, accountId } = req.body;
  console.log("Check account request:", { email, publicKey, accountId });

  if (!email && !publicKey && !accountId) {
    console.log("Invalid request: missing email, publicKey, or accountId");
    return res.status(400).json({ message: "Email, public key, or account ID is required" });
  }
  if (publicKey && (!publicKey.startsWith('ed25519:') || publicKey.length !== 52)) {
    console.log("Invalid public key format:", publicKey);
    return res.status(400).json({ message: `Invalid public key format: ${publicKey}` });
  }
  if (accountId && !/^[a-z0-9_-]{2,64}\.1000fans\.near$/.test(accountId) && !/^[a-f0-9]{64}$/.test(accountId)) {
    console.log("Invalid account ID format:", accountId);
    return res.status(400).json({ message: `Invalid account ID format: ${accountId}` });
  }

  let client;
  try {
    if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is not set");
    console.log("Attempting MongoDB connection...");
    client = new MongoClient(process.env.MONGODB_URI, { connectTimeoutMS: 5000 });
    await client.connect();
    console.log("MongoDB connected");
    const db = client.db("1000fans");
    const usersCollection = db.collection("users");

    const query = {};
    if (email) query.email = email;
    if (publicKey) query.publicKey = publicKey;
    if (accountId) query.accountId = accountId;

    // Check if an account exists with the given public key
    console.log("Querying MongoDB with:", query);
    const existingUser = await usersCollection.findOne(query);
    let response = { 
      exists: !!existingUser, 
      accountId: existingUser?.accountId, 
      tokenId: existingUser?.tokenId, 
      isGroupMember: false 
    };

    // check token ownership and group membership if accountId exists
    if (response.accountId) {
      const near = await connect({
        networkId: "mainnet",
        nodeUrl: "https://rpc.mainnet.near.org",
        keyStore: new keyStores.InMemoryKeyStore(),
      });
      const tokens = await near.connection.provider.query({
        request_type: "call_function",
        account_id: "theosis.1000fans.near",
        method_name: "nft_tokens_for_owner",
        args_base64: Buffer.from(JSON.stringify({ account_id: response.accountId, from_index: null, limit: 1 })).toString("base64"),
        finality: "optimistic",
      });
      const tokenData = JSON.parse(Buffer.from(tokens.result).toString());
      response.tokenId = tokenData.length > 0 ? tokenData[0].token_id : null;
      response.isGroupMember = await near.connection.provider.query({
        request_type: "call_function",
        account_id: "theosis.devbot.near",
        method_name: "is_authorized",
        args_base64: Buffer.from(JSON.stringify({ group_id: "theosis", user_id: response.accountId })).toString("base64"),
        finality: "optimistic",
      }).then(res => JSON.parse(Buffer.from(res.result).toString()));
    }

    await client.close();
    console.log("Response:", response);
    return res.status(200).json(response)
  } catch (error) {
    console.error("Error checking account:", { error: error.message, stack: error.stack });
    if (client) await client.close();
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
}