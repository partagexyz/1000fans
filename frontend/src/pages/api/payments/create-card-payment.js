// pages/api/payments/create-card-payment.js
import { MongoClient } from 'mongodb';
import { v4 as uuidv4 } from 'uuid';

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
  const amountNum = parseFloat(amount);
  if (isNaN(amount) || amount < 5 || amount > 20) {
    return res.status(400).json({ message: 'Amount must be between 5 and 20 USD' });
  }
  if (!/^\d{16}$/.test(cardNumber.replace(/\s/g, ''))) {
    return res.status(400).json({ message: 'Invalid card number (16 digits required)' });
  }
  if (!/^\d{2}\/\d{2}$/.test(expiry)) {
    return res.status(400).json({ message: 'Invalid expiry date (MM/YY)' });
  }
  if (!/^\d{3,4}$/.test(cvv)) {
    return res.status(400).json({ message: 'Invalid CVV (3-4 digits required)' });
  }

  let client;
  try {
    const circleApiKey = process.env.CIRCLE_API_KEY;
    if (!circleApiKey) throw new Error('CIRCLE_API_KEY is not set');

    // Parse expiry
    const [expMonth, expYear] = expiry.split('/');
    const fullExpYear = `20${expYear}`;

    // Step 1: Create card
    const cardResponse = await fetch('https://api.circle.com/v1/cards', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${circleApiKey}`,
        'Content-Type': 'application/json',
        'X-Request-Id': uuidv4(),
      },
      body: JSON.stringify({
        idempotencyKey: uuidv4(),
        number: cardNumber,
        cvv,
        expMonth: parseInt(expMonth, 10),
        expYear: parseInt(fullExpYear, 10),
        billingDetails: {
          name: email.split('@')[0],
          city: 'Unknown',
          country: 'US',
          line1: 'Unknown',
          postalCode: '00000',
        },
        metadata: { email },
      }),
    });

    const cardData = await cardResponse.json();
    if (!cardResponse.ok) {
      throw new Error(cardData.message || 'Failed to create card');
    }
    const cardId = cardData.data.id;

    // Step 2: Create payment
    const paymentResponse = await fetch('https://api.circle.com/v1/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${circleApiKey}`,
        'Content-Type': 'application/json',
        'X-Request-Id': uuidv4(),
      },
      body: JSON.stringify({
        idempotencyKey,
        amount: { amount: amountNum.toFixed(2), currency: 'USD' },
        source: { id: cardId, type: 'card' },
        description: `Fund wallet for ${accountId}`,
        metadata: { email },
      }),
    });

    const paymentData = await paymentResponse.json();
    if (!paymentResponse.ok) {
      throw new Error(paymentData.message || 'Payment creation failed');
    }
    const paymentId = paymentData.data.id;
    let paymentStatus = paymentData.data.status;

    // Step 3: Poll for payment confirmation
    const maxAttempts = 10;
    let attempts = 0;
    while (paymentStatus === 'pending' && attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      const statusResponse = await fetch(`https://api.circle.com/v1/payments/${paymentId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${circleApiKey}`,
          'Accept': 'application/json',
          'X-Request-Id': uuidv4(),
        },
      });
      const statusData = await statusResponse.json();
      if (!statusResponse.ok) {
        throw new Error(statusData.message || 'Failed to check payment status');
      }
      paymentStatus = statusData.data.status;
      attempts++;
    }
    if (paymentStatus !== 'confirmed' && paymentStatus !== 'paid') {
      throw new Error(`Payment not confirmed, status: ${paymentStatus}`);
    }

    // Connect to MongoDB
    client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db('1000fans');
    const paymentsCollection = db.collection('payments');

    // Store payment in MongoDB
    const paymentDoc = {
      accountId,
      publicKey,
      email,
      paymentId,
      amount: amountNum,
      status: paymentStatus,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await paymentsCollection.insertOne(paymentDoc);

    await client.close();
    return res.status(200).json({ success: true, paymentId });
  } catch (error) {
    console.error('Payment processing error:', error);
    if (client) await client.close();
    return res.status(500).json({ message: 'Payment processing failed', error: error.message });
  }
}