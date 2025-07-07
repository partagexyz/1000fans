// pages/api/webhooks/payment-notifications.js
import { MongoClient } from 'mongodb';
import { Circle, CircleEnvironments } from '@circle-fin/circle-sdk';
import { createHmac } from 'crypto';
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

    // Verify signature
    const message = JSON.stringify(req.body);
    const computedSignature = createHmac('sha256', Buffer.from(publicKey, 'base64'))
      .update(message)
      .digest('base64');
    if (computedSignature !== signature) {
      logger.error('Invalid webhook signature', { keyId, signature, computedSignature });
      return res.status(401).json({ message: 'Invalid signature' });
    }

    // Handle webhook notification
    const { notificationType, payment, payout } = req.body;
    logger.info('Received webhook', { notificationType, paymentId: payment?.id, payoutId: payout?.id });

    client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db('1000fans');
    const usersCollection = db.collection('users');

    if (notificationType === 'payments') {
      const { id: paymentId, status, paymentIntentId } = payment;
      logger.info(`Processing payment webhook: ${paymentId}, status: ${status}`);

      // Update payment status in MongoDB
      const updateResult = await usersCollection.updateOne(
        { paymentId },
        { $set: { status, updatedAt: new Date() } }
      );
      if (updateResult.matchedCount === 0) {
        logger.warn(`Payment ${paymentId} not found in MongoDB`);
      }

      if (status === 'confirmed' || status === 'paid') {
        // Retrieve payment details
        const paymentDoc = await usersCollection.findOne({ paymentId });
        if (!paymentDoc) {
          throw new Error(`Payment ${paymentId} not found`);
        }
        const { amount, accountId } = paymentDoc;

        // Add 1000fans.near to address book
        const recipientResponse = await circle.addressBook.createRecipient({
          idempotencyKey: `recipient-${accountId}-${Date.now()}`,
          chain: 'NEAR',
          address: '1000fans.near',
          metadata: { email: 'contact@1000fans.near', nickname: '1000fans' },
        });
        const recipientId = recipientResponse.data.id;

        // Wait for recipient to be active (in production, may take up to 24 hours)
        let recipientStatus = recipientResponse.data.status;
        if (recipientStatus !== 'active') {
          logger.info(`Recipient ${recipientId} pending, waiting for activation`);
          for (let i = 0; i < 12; i++) { // Wait up to 60 seconds for testing
            await new Promise((resolve) => setTimeout(resolve, 5000));
            const statusResponse = await circle.addressBook.getRecipient(recipientId);
            recipientStatus = statusResponse.data.status;
            if (recipientStatus === 'active') break;
          }
          if (recipientStatus !== 'active') {
            logger.error(`Recipient ${recipientId} not active after waiting`);
            throw new Error('Recipient not active');
          }
        }
        logger.info(`Recipient ${recipientId} active`);

        // Get master wallet ID
        const configResponse = await circle.core.getConfiguration();
        const masterWalletId = configResponse.data.payments.masterWalletId;

        // Create transfer to 1000fans.near
        const transferResponse = await circle.transfers.createTransfer({
          idempotencyKey: `transfer-${paymentId}-${Date.now()}`,
          source: { type: 'wallet', id: masterWalletId },
          destination: { type: 'address_book', id: recipientId },
          amount: { amount: String(amount), currency: 'USD' },
        });
        logger.info(`Initiated transfer for payment ${paymentId}: ${transferResponse.data.id}`);
      }
    } else if (notificationType === 'payouts') {
      const { id: payoutId, status, paymentIntentId } = payout;
      logger.info(`Processing payout webhook: ${payoutId}, status: ${status}`);

      // Update payout status in MongoDB
      const updateResult = await usersCollection.updateOne(
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
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
}