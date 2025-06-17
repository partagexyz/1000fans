// pages/api/auth/create-wallet-user.js
import { MongoClient } from "mongodb";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { accountId } = req.body;

  if (!accountId) {
    return res.status(400).json({ message: "Account ID is required" });
  }

  try {
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db("1000fans");
    const usersCollection = db.collection("users");

    // Check if user already exists
    const existingUser = await usersCollection.findOne({ accountId });
    if (existingUser) {
      await client.close();
      return res.status(200).json({ message: "User already exists", accountId });
    }

    // Create the user document
    const userDoc = {
      accountId,
      createdAt: new Date(),
      // Add any additional fields as needed (e.g., settings or metadata)
    };

    // Insert the user into the database
    const result = await usersCollection.insertOne(userDoc);
    console.log(`Wallet user document created with _id: ${result.insertedId}`);

    await client.close();
    return res.status(200).json({
      accountId,
      dbId: result.insertedId,
    });
  } catch (error) {
    console.error("Database error:", error);
    await client.close();
    return res.status(500).json({
      message: "Error creating wallet user",
      error: error.message,
    });
  }
}