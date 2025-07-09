// pages/api/payments/transfer-usdc.js
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

  const { paymentId, amount, destinationAddress, idempotencyKey } = req.body;

  if (!paymentId || !amount || !destinationAddress || !idempotencyKey) {
    return res.status(400).json({ message: 'Missing required fields' });
  }
  if (destinationAddress !== '1000fans.near') {
    return res.status(400).json({ message: 'Invalid destination address' });
  }

  try {
    // add recipient to address book
    const recipientResponse = await circle.addressBook.createRecipient({
      idempotencyKey: uuidv4(),
      chain: 'NEAR',
      address: destinationAddress,
      metadata: { email: 'theosis@1000fans.near', nickname: '1000fans' },
    });
    const recipientId = recipientResponse.data.id;
    let recipientStatus = recipientResponse.data.status;
    
    // Wait for recipient to be active (may take up to 24 hours in production)
    const maxAttempts = 12; // 60 seconds for testing
    let attempts = 0;
    while (recipientStatus !== 'active' && attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 5000));
      const statusResponse = await circle.addressBook.getRecipient(recipientId);
      recipientStatus = statusResponse.data.status;
      attempts++;
    }
    if (recipientStatus !== 'active') {
      throw new Error(`Recipient not active, status: ${recipientStatus}`);
    }

    // Get master wallet ID
    const configResponse = await circle.core.getConfiguration();
    const masterWalletId = configResponse.data.payments.masterWalletId;

    // Create transfer
    const transferResponse = await circle.transfers.createTransfer({
      idempotencyKey,
      source: { type: 'wallet', id: masterWalletId },
      destination: { type: 'address_book', id: recipientId },
      amount: { amount: parseFloat(amount).toFixed(2), currency: 'USD' },
    });
    const transferId = transferResponse.data.id;
    let transferStatus = transferResponse.data.status;

    // Poll for transfer confirmation
    attempts = 0;
    while (transferStatus === 'pending' && attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      const statusResponse = await circle.transfers.getTransfer(transferId);
      transferStatus = statusResponse.data.status;
      attempts++;
    }
    if (transferStatus !== 'complete') {
      throw new Error(`Transfer not completed, status: ${transferStatus}`);
    }

    return res.status(200).json({ success: true, transferId });
  } catch (error) {
    console.error('USDC transfer error:', error);
    return res.status(500).json({ message: 'USDC transfer failed', error: error.message });
  }
}