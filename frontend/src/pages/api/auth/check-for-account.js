// pages/api/auth/check-for-account.js
import { MongoClient } from "mongodb";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { email, publicKey } = req.body;
  console.log("Check account request:", { email, publicKey });

  if (!email && !publicKey) {
    console.log("Invalid request: missing email and publicKey");
    return res.status(400).json({ message: "Email or public key is required" });
  }
  if (publicKey && (!publicKey.startsWith('ed25519:') || publicKey.length !== 52)) {
    console.log("Invalid public key format:", publicKey);
    return res.status(400).json({ message: `Invalid public key format: ${publicKey}` });
  }

  let client;
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI is not set");
    }
    console.log("Attempting MongoDB connection...");
    client = new MongoClient(process.env.MONGODB_URI, { connectTimeoutMS: 5000 });
    await client.connect();
    console.log("MongoDB connected");
    const db = client.db("1000fans");
    const usersCollection = db.collection("users");

    const query = {};
    if (email) query.email = email;
    if (publicKey) query.publicKey = publicKey;

    // Check if an account exists with the given public key
    console.log("Querying MongoDB with:", query);
    const existingUser = await usersCollection.findOne(query);

    await client.close();
    if (existingUser) {
      console.log("Found existing user:", existingUser.accountId);
      return res.status(200).json({ exists: true, accountId: existingUser.accountId });
    }

    console.log("No account found for query:", query);
    return res.status(200).json({ exists: false });
  } catch (error) {
    console.error("Error checking account:", { error: error.message, stack: error.stack });
    if (client) await client.close();
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
}