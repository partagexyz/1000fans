// pages/api/auth/check-for-account.js
import { MongoClient } from "mongodb";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { publicKey } = req.body;

  try {
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db("1000fans");
    const usersCollection = db.collection("users");

    // Check if an account exists with the given public key
    const existingUser = await usersCollection.findOne({ publicKey });

    if (existingUser) {
      await client.close();
      return res.status(200).json({ exists: true, accountId: existingUser.accountId });
    }

    await client.close();
    return res.status(200).json({ exists: false });
  } catch (error) {
    console.error("Error checking account:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}