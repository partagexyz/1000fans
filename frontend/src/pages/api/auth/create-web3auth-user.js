// pages/api/auth/create-web3auth-user.js
import { MongoClient } from "mongodb";
import { connect, KeyPair, keyStores, utils } from "near-api-js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { accountId, publicKey } = req.body;

  // Validate NEAR account ID format
  if (!/^[a-z0-9_-]{2,64}\.near$/.test(accountId) && !/^[a-f0-9]{64}$/.test(accountId)) {
    return res.status(400).json({ error: "Invalid NEAR account ID format" });
  }

  try {
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db("1000fans");
    const usersCollection = db.collection("users");

    // Check if accountId already exists
    const existingAccount = await usersCollection.findOne({ accountId });
    if (existingAccount) {
      await client.close();
      return res.status(400).json({ error: "Account ID already exists" });
    }

    // Create NEAR account
    const myKeyStore = new keyStores.InMemoryKeyStore();
    const relayerKeyPair = KeyPair.fromString(process.env.RELAYER_PRIVATE_KEY);
    await myKeyStore.setKey("mainnet", "anonymous.1000fans.near", relayerKeyPair);

    const connectionConfig = {
      networkId: "mainnet",
      keyStore: myKeyStore,
      nodeUrl: "https://rpc.mainnet.near.org",
      walletUrl: "https://wallet.mainnet.near.org",
      helperUrl: "https://helper.mainnet.near.org",
      explorerUrl: "https://explorer.mainnet.near.org",
    };

    const near = await connect(connectionConfig);
    const relayerAccount = await near.account("anonymous.1000fans.near");

    // Create account on NEAR blockchain
    await relayerAccount.createAccount(
      accountId,
      publicKey,
      utils.format.parseNearAmount("0.1") // Initial balance
    );

    // Store in database
    await usersCollection.insertOne({
      accountId,
      publicKey,
      createdAt: new Date(),
    });

    await client.close();
    return res.status(200).json({ success: true, accountId });
  } catch (error) {
    console.error("Error creating account:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}