// src/components/LoginModal.js
import React, { useState } from 'react';
import { useNear } from '../wallets/near';
import { useWeb3Auth } from '../wallets/web3auth';
import styles from '../styles/modal.module.css';

export const LoginModal = ({ isOpen, onClose, onLoginWithProvider }) => {
  const { wallet } = useNear();
  const { web3auth } = useWeb3Auth();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen || !web3auth) return null;

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    if (!email) return;
    setIsLoading(true);
    try {
      await onLoginWithProvider('email_passwordless', { login_hint: email });
      onClose();
    } catch (error) {
      console.error('Email login failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalDialog}>
        <div className={styles.modalContent}>
          <div className={styles.modalHeader}>
            <h5 className={styles.modalTitle}>Log in to 1000fans</h5>
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
            <div className={`${styles.formGroup} ${styles.centeredFormGroup}`}>
              <button
                className={styles.buttonSecondary}
                onClick={() => {
                  wallet?.signIn();
                  onClose();
                }}
              >
                <i className="bi bi-wallet2"></i>
                Connect Your Wallet
              </button>
              <div className={styles.divider}>
                <div className={styles.dividerLine}></div>
                <div className={styles.dividerText}>or</div>
                <div className={styles.dividerLine}></div>
              </div>
              <form className={styles.fullWidthForm} onSubmit={handleEmailLogin}>
                <div className={styles.formGroup}>
                  <input
                    type="email"
                    className={styles.formControl}
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <button
                  type="submit"
                  className={styles.buttonPrimary}
                  disabled={isLoading}
                >
                  <i className="bi bi-envelope"></i>
                  {isLoading ? 'Sending...' : 'Login with Email'}
                </button>
              </form>
            </div>
          </div>
          <div className={styles.modalFooter}>
            <button type="button" className={styles.buttonSecondary} onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};