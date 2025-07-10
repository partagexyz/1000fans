// pages/api/webhooks/payment-notifications.js
import { MongoClient } from 'mongodb';
import { buffer } from 'micro';
import Stripe from 'stripe';
import winston from 'winston';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' });

// Configure Winston logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: '/var/log/1000fans-webhooks.log' }),
    new winston.transports.Console(),
  ],
});

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    logger.warn('Invalid method for webhook', { method: req.method });
    return res.status(405).json({ message: 'Method not allowed' });
  }

  let client;
  try {
    // Verify webhook signature
    const rawBody = await buffer(req);
    const signature = req.headers['stripe-signature'];
    const webhookSecret = process.env.WEBHOOK_SECRET;
    let event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (err) {
      logger.error('Webhook signature verification failed', { error: err.message });
      return res.status(400).json({ message: 'Webhook signature verification failed' });
    }

    // Handle webhook notification
    logger.info('Received webhook', { type: event.type, id: event.id });

    client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db('1000fans');
    const paymentsCollection = db.collection('payments');

    if (event.type === 'crypto.onramp_session_updated') {
      const session = event.data.object;
      const { id: sessionId, status, transaction_details } = session;
      logger.info(`Processing onramp session webhook: ${sessionId}, status: ${status}`);

      // Update payment status
      const updateResult = await paymentsCollection.updateOne(
        { sessionId },
        { $set: { status, transactionId: transaction_details.transaction_id, updatedAt: new Date() } }
      );
      if (updateResult.matchedCount === 0) {
        logger.warn(`Session ${sessionId} not found in MongoDB`);
      }
    } else {
      logger.warn(`Unhandled webhook type: ${event.type}`);
    }

    await client.close();
    return res.status(200).json({ message: 'Webhook processed' });
  } catch (error) {
    logger.error('Webhook processing error:', { error: error.message, stack: error.stack });
    if (client) await client.close();
    return res.status(500).json({ message: 'Webhook processing error', error: error.message });
  }
}