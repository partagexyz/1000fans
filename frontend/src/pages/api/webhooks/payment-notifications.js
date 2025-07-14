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
    // Validate environment variables
    if (!process.env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY is not set');
    if (!process.env.WEBHOOK_SECRET) throw new Error('WEBHOOK_SECRET is not set');
    if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is not set');

    // Verify webhook signature
    const rawBody = await buffer(req);
    const signature = req.headers['stripe-signature'];
    const webhookSecret = process.env.WEBHOOK_SECRET;
    let event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
      logger.info('Webhook signature verified', { eventId: event.id, type: event.type });
    } catch (err) {
      logger.error('Webhook signature verification failed', {
        message: err.message,
        signature,
        webhookSecret: process.env.WEBHOOK_SECRET ? 'Defined' : 'Undefined',
      });
      return res.status(400).json({ message: 'Webhook signature verification failed' });
    }

    // Connect to MongoDB
    client = new MongoClient(process.env.MONGODB_URI, { connectTimeoutMS: 5000 });
    await client.connect();
    const db = client.db('1000fans');
    const paymentsCollection = db.collection('payments');

    // Handle webhook events
    if (event.type === 'crypto.onramp_session_updated') {
      const session = event.data.object;
      const { id: sessionId, status, transaction_details } = session;
      logger.info('Processing onramp session webhook', {
        sessionId,
        status,
        transactionId: transaction_details?.transaction_id || 'none',
        destinationAddress: transaction_details?.destination_address || 'none',
      });

      try {
        const updateResult = await paymentsCollection.updateOne(
          { sessionId },
          {
            $set: {
              status,
              transactionId: transaction_details?.transaction_id || null,
              destinationAddress: transaction_details?.destination_address || null,
              updatedAt: new Date(),
            },
          },
          { upsert: true }
        );
        logger.info('Payment status updated in MongoDB', {
          sessionId,
          status,
          matchedCount: updateResult.matchedCount,
          modifiedCount: updateResult.modifiedCount,
          upsertedId: updateResult.upsertedId,
        });

        // Clean up aborted transactions
        if (status === 'cancelled' || status === 'expired') {
          try {
            await paymentsCollection.deleteOne({ sessionId, status: { $in: ['cancelled', 'expired'] } });
            logger.info(`Deleted aborted payment record: ${sessionId}`);
          } catch (deleteError) {
            logger.error(`Failed to delete aborted payment: ${sessionId}`, { message: deleteError.message });
          }
        }
      } catch (error) {
        logger.error('Failed to update payment status', { sessionId, message: error.message, stack: error.stack });
        throw new Error(`Failed to update payment status: ${error.message}`);
      }
    } else {
      logger.warn(`Unhandled webhook type: ${event.type}`, { eventId: event.id });
    }

    return res.status(200).json({ message: 'Webhook processed successfully' });
  } catch (error) {
    logger.error('Webhook processing error', {
      message: error.message,
      stack: error.stack,
      eventType: event?.type,
      eventId: event?.id,
    });
    return res.status(500).json({ message: 'Webhook processing error', error: error.message });
  } finally {
    if (client) {
      try {
        await client.close();
        logger.info('MongoDB connection closed');
      } catch (closeError) {
        logger.error('Failed to close MongoDB connection', { message: closeError.message });
      }
    }
  }
}