// pages/api/auth/process-payment.js
import { MongoClient } from 'mongodb';
import { Circle, CircleEnvironments } from '@circle-fin/circle-sdk';
import { v4 as uuidv4 } from 'uuid';

const circle = new Circle(
  process.env.CIRCLE_API_KEY,
  CircleEnvironments.production
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { accountId, publicKey, email, amount, cardNumber, expiry, cvv, idempotencyKey } = req.body;

  // Validate inputs
  if (!accountId || !publicKey || !email || !amount || !cardNumber || !expiry || !cvv || !idempotencyKey) {
    return res.status(400).json({ message: 'Missing required fields' });
  }
  if (!/^[a-z0-9_-]{2,64}\.1000fans\.near$/.test(accountId) && !/^[a-f0-9]{64}$/.test(accountId)) {
    return res.status(400).json({ message: 'Invalid NEAR account ID format' });
  }
  if (!publicKey.startsWith('ed25519:') || publicKey.length !== 52) {
    return res.status(400).json({ message: 'Invalid public key format' });
  }
  /*//uncomment to enforce a fixed amount range
  if (isNaN(amount) || amount < 5 || amount > 20) {
    return res.status(400).json({ message: 'Amount must be between 5 and 20 USD' });
  }*/

  let client;
  try {
    // Connect to MongoDB
    client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db('1000fans');
    const usersCollection = db.collection('users');

    // Check for duplicates
    const existingAccount = await usersCollection.findOne({ $or: [{ accountId }, { publicKey }, { email }] });
    if (existingAccount) {
      await client.close();
      return res.status(400).json({ message: `Account already exists for ${existingAccount.email || existingAccount.accountId}` });
    }

    // Create card
    const cardResponse = await circle.payments.createCard({
      idempotencyKey: uuidv4(),
      number: cardNumber,
      cvv,
      expiry: {
        month: expiry.split('/')[0],
        year: expiry.split('/')[1],
      },
      billingDetails: {
        name: email.split('@')[0],
        city: 'Unknown',
        country: 'US',
        line1: 'Unknown',
        postalCode: '00000',
      },
    });
    if (cardResponse.data.status !== 'pending') {
      throw new Error('Card creation failed');
    }
    const cardId = cardResponse.data.id;

    // Create payment
    const paymentResponse = await circle.payments.createPayment({
      idempotencyKey,
      amount: { amount: String(amount), currency: 'USD' },
      source: { id: cardId, type: 'card' },
      description: `Fund wallet for ${accountId}`,
      metadata: { email },
    });
    if (paymentResponse.data.status !== 'pending' && paymentResponse.data.status !== 'confirmed') {
      throw new Error(`Payment creation failed: ${paymentResponse.data.status}`);
    }
    const paymentId = paymentResponse.data.id;

    // Store payment in MongoDB
    const paymentDoc = {
      accountId,
      publicKey,
      email,
      paymentId,
      amount: Number(amount),
      status: paymentResponse.data.status,
      createdAt: new Date(),
    };
    const result = await usersCollection.insertOne(paymentDoc);
    console.log(`Payment stored: ${paymentId}, MongoDB ID: ${result.insertedId}`);

    await client.close();
    return res.status(200).json({ success: true, paymentId });
  } catch (error) {
    console.error('Payment processing error:', error);
    if (client) await client.close();
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
}