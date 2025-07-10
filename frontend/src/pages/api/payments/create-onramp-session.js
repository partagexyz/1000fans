// pages/api/payments/create-onramp-session.js
import { MongoClient } from 'mongodb';
import { v4 as uuidv4 } from 'uuid';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { accountId, email, amount, destinationAddress } = req.body;

  // Validate inputs
  if (!accountId || !email || !amount || !destinationAddress) {
    return res.status(400).json({ message: 'Missing required fields' });
  }
  if (!/^[a-z0-9_-]{2,64}\.1000fans\.near$/.test(accountId) && !/^[a-f0-9]{64}$/.test(accountId)) {
    return res.status(400).json({ message: 'Invalid NEAR account ID format' });
  }
  const amountNum = parseFloat(amount);
  if (isNaN(amountNum) || amountNum < 5 || amountNum > 20) {
    return res.status(400).json({ message: 'Amount must be between 5 and 20 USD' });
  }

  let client;
  let customerIp;
  try {
    // Connect to MongoDB
    client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db('1000fans');
    const paymentsCollection = db.collection('payments');

    // Get client IP
    customerIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
    if (customerIp === '::1' || customerIp === '127.0.0.1' || customerIp === 'unknown') {
      console.warn('Invalid local IP detected:', customerIp);
      throw new Error(
        'Funding is not available in local development without a public IP. Please use ngrok or deploy to production.'
      );
    }

    console.log('Creating onramp session with:', {
      accountId,
      email,
      amount: amountNum,
      destinationAddress,
      customerIp,
      headers: req.headers,
    });

    // Create onramp session
    const response = await fetch('https://api.stripe.com/v1/crypto/onramp_sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        'wallet_addresses[ethereum]': destinationAddress,
        source_currency: 'usd', // Try 'eur' for Spain if USD fails
        destination_currency: 'usdc',
        destination_network: 'ethereum',
        'destination_currencies[]': 'usdc',
        'destination_networks[]': 'ethereum',
        source_amount: amountNum.toFixed(2),
        'customer_information[email]': email,
        customer_ip_address: customerIp,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('Stripe API error:', {
        status: response.status,
        statusText: response.statusText,
        error: data.error,
        customerIp,
      });
      let errorMessage = data.error?.message || 'Failed to create onramp session';
      if (
        data.error?.code === 'crypto_onramp_unsupported_country' ||
        data.error?.code === 'crypto_onramp_unsupportable_customer'
      ) {
        errorMessage = 'Funding is not available for your current location. Please skip funding or try from a supported region (US or EU).';
      }
      throw new Error(errorMessage);
    }

    // Store session in MongoDB
    const sessionDoc = {
      sessionId: data.id,
      accountId,
      email,
      amount: amountNum,
      status: data.status,
      destinationAddress,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await paymentsCollection.insertOne(sessionDoc);

    await client.close();
    return res.status(200).json({ success: true, clientSecret: data.client_secret, sessionId: data.id });
  } catch (error) {
    console.error('Onramp session creation error:', {
      message: error.message,
      stack: error.stack,
      requestBody: req.body,
      customerIp: customerIp || 'undefined',
    });
    if (client) await client.close();
    return res.status(500).json({ message: error.message || 'Failed to create onramp session' });
  }
}