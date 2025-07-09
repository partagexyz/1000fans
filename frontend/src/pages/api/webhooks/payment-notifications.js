// pages/api/webhooks/payment-notifications.js
import { MongoClient } from 'mongodb';
import { Circle, CircleEnvironments } from '@circle-fin/circle-sdk';
import { createHmac } from 'crypto';
import { verify } from '@noble/secp256k1';
import { v4 as uuidv4 } from 'uuid';
import winston from 'winston';

const circle = new Circle(
  process.env.CIRCLE_API_KEY,
  CircleEnvironments.production
);

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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    logger.warn('Invalid method for webhook', { method: req.method });
    return res.status(405).json({ message: 'Method not allowed' });
  }

  // Verify webhook signature
  const signature = req.headers['x-circle-signature'];
  const keyId = req.headers['x-circle-key-id'];
  if (!signature || !keyId) {
    logger.error('Missing signature or key ID', { headers: req.headers });
    return res.status(401).json({ message: 'Missing signature or key ID' });
  }

  let client;
  try {
    // Fetch public key for signature verification
    const publicKeyResponse = await circle.notifications.getPublicKey(keyId);
    const publicKey = publicKeyResponse.data.publicKey;

    // Verify ECDSA signature
    const message = JSON.stringify(req.body);
    const messageHash = createHmac('sha256', Buffer.from(message)).digest('hex');
    const isValid = verify(
      Buffer.from(signature, 'base64'),
      Buffer.from(messageHash, 'hex'),
      Buffer.from(publicKey, 'base64')
    );
    if (!isValid) {
      logger.error('Invalid webhook signature', { keyId, signature });
      return res.status(401).json({ message: 'Invalid signature' });
    }

    // Handle webhook notification
    const { notificationType, payment, payout } = req.body;
    logger.info('Received webhook', { notificationType, paymentId: payment?.id, payoutId: payout?.id });

    client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db('1000fans');
    const paymentsCollection = db.collection('payments');

    if (notificationType === 'payments') {
      const { id: paymentId, status } = payment;
      logger.info(`Processing payment webhook: ${paymentId}, status: ${status}`);

      // Update payment status
      const updateResult = await paymentsCollection.updateOne(
        { paymentId },
        { $set: { status, updatedAt: new Date() } }
      );
      if (updateResult.matchedCount === 0) {
        logger.warn(`Payment ${paymentId} not found in MongoDB`);
      }

      if (status === 'confirmed' || status === 'paid') {
        const paymentDoc = await paymentsCollection.findOne({ paymentId });
        if (!paymentDoc) {
          throw new Error(`Payment ${paymentId} not found`);
        }
        const { amount, accountId } = paymentDoc;

        // Trigger USDC transfer
        const transferResponse = await fetch(`${process.env.NEXT_PUBLIC_PROXY_BASE_URL}/api/payments/transfer-usdc`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paymentId,
            amount,
            destinationAddress: '1000fans.near',
            idempotencyKey: uuidv4(),
          }),
        });
        if (!transferResponse.ok) {
          const errorData = await transferResponse.json();
          throw new Error(`USDC transfer failed: ${errorData.message}`);
        }
        logger.info(`Initiated transfer for payment ${paymentId}`);
      }
    } else if (notificationType === 'payouts') {
      const { id: payoutId, status, paymentIntentId } = payout;
      logger.info(`Processing payout webhook: ${payoutId}, status: ${status}`);

      // Update payout status
      const updateResult = await paymentsCollection.updateOne(
        { paymentId: paymentIntentId },
        { $set: { payoutStatus: status, updatedAt: new Date() } }
      );
      if (updateResult.matchedCount === 0) {
        logger.warn(`Payment for payout ${payoutId} not found in MongoDB`);
      }
    } else {
      logger.warn(`Unhandled notification type: ${notificationType}`);
    }

    await client.close();
    return res.status(200).json({ message: 'Webhook processed' });
  } catch (error) {
    logger.error('Webhook processing error:', { error: error.message, stack: error.stack });
    if (client) await client.close();
    return res.status(500).json({ message: 'Webhook processing error', error: error.message });
  }
}