// src/components/paymentModal.js
import React, { useState } from 'react';
import styles from '../styles/modal.module.css';

export const PaymentModal = ({ isOpen, onClose, onSubmit, onSkip }) => {
  const [amount, setAmount] = useState('5.00');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    if (!cardNumber || !expiry || !cvv || !amount) {
      setError('Please fill in all fields');
      setIsLoading(false);
      return;
    }
    if (parseFloat(amount) < 5 || parseFloat(amount) > 20) {
      setError('Amount must be between 5 and 20 USD');
      setIsLoading(false);
      return;
    }
    try {
      await onSubmit({ amount, cardNumber, expiry, cvv });
      onClose();
    } catch (err) {
      setError(`Payment failed: ${err.message}`);
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalDialog}>
        <div className={styles.modalContent}>
          <div className={styles.modalHeader}>
            <h5 className={styles.modalTitle}>Fund Your Wallet</h5>
            <button
              type="button"
              className={styles.closeButton}
              onClick={onClose}
              aria-label="Close"
            >
              x
            </button>
          </div>
          <div className={styles.modalBody}>
            <p>Fund your wallet with 5–20 USD to support your account (optional).</p>
            <form onSubmit={handleSubmit}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Amount (USD)</label>
                <input
                  type="number"
                  step="0.01"
                  className={styles.formControl}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="5.00"
                  min="5"
                  max="20"
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Card Number</label>
                <input
                  type="text"
                  className={styles.formControl}
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  placeholder="1234 5678 9012 3456"
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Expiry (MM/YY)</label>
                <input
                  type="text"
                  className={styles.formControl}
                  value={expiry}
                  onChange={(e) => setExpiry(e.target.value)}
                  placeholder="12/25"
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>CVV</label>
                <input
                  type="text"
                  className={styles.formControl}
                  value={cvv}
                  onChange={(e) => setCvv(e.target.value)}
                  placeholder="123"
                  required
                />
              </div>
              {error && <div className={styles.alertDanger}>{error}</div>}
              <button
                type="submit"
                className={styles.buttonPrimary}
                disabled={isLoading}
              >
                {isLoading ? 'Processing...' : 'Send Funds'}
              </button>
              <button
                type="button"
                className={styles.buttonSecondary}
                onClick={() => {
                  onSkip();
                  onClose();
                }}
                disabled={isLoading}
              >
                Skip Funding
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};