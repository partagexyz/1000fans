// src/components/paymentModal.js
import React, { useState } from 'react';
import styles from '../styles/modal.module.css';

export const PaymentModal = ({ isOpen, onClose, onSubmit, onSkip }) => {
  const [amount, setAmount] = useState('10.00');
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

    // Validate inputs
    if (!cardNumber || !/^\d{16}$/.test(cardNumber.replace(/\s/g, ''))) {
      setError('Invalid card number (16 digits required)');
      setIsLoading(false);
      return;
    }
    if (!expiry || !/^\d{2}\/\d{2}$/.test(expiry)) {
      setError('Invalid expiry date (MM/YY)');
      setIsLoading(false);
      return;
    }
    if (!cvv || !/^\d{3,4}$/.test(cvv)) {
      setError('Invalid CVV (3-4 digits required)');
      setIsLoading(false);
      return;
    }
    const amountNum = parseFloat(amount);
    /*
    if (isNaN(amountNum) || amountNum < 5 || amountNum > 20) {
      setError('Amount must be between 5 and 20 USD');
      setIsLoading(false);
      return;
    }
    */
    try {
      await onSubmit({ amount: amountNum.toFixed(2), cardNumber, expiry, cvv });
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
            <h5 className={styles.modalTitle}>Fund Your Wallet (optional)</h5>
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
            <form onSubmit={handleSubmit}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Amount (USD)</label>
                <select
                  className={styles.formControl}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                >
                  <option value="5.00">5.00 USD</option>
                  <option value="10.00">10.00 USD</option>
                  <option value="20.00">20.00 USD</option>
                </select>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Card Number</label>
                <input
                  type="text"
                  className={styles.formControl}
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value.replace(/\s/g, ''))}
                  placeholder="1234 5678 9012 3456"
                  maxLength="16"
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
                  maxLength="5"
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
                  maxLength="4"
                  required
                />
              </div>
              {error && <div className={styles.alertDanger}>{error}</div>}
              <div className={styles.buttonGroup}>
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
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};