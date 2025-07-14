// src/components/CreateAccountModal.js
import { useState, useEffect } from 'react';
import { useWeb3Auth } from '../wallets/web3auth';
import { PaymentModal } from './paymentModal';
import { v4 as uuidv4 } from 'uuid';
import styles from '../styles/modal.module.css';

export const CreateAccountModal = ({ isOpen, onClose, onAccountCreated, theme, toggleTheme }) => {
  const { keyPair, setupAccount, logout, user } = useWeb3Auth();
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [checkLoading, setCheckLoading] = useState(false);
  const [error, setError] = useState('');
  const [isAccountCreated, setIsAccountCreated] = useState(false);
  const [existingAccount, setExistingAccount] = useState(null);
  const [tokenId, setTokenId] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [pendingAccountId, setPendingAccountId] = useState(null);

  useEffect(() => {
    if (isOpen && user && keyPair) {
      setIsAccountCreated(false);
      setError('');
      setUsername('');
      setShowPaymentModal(false);
      //console.log('Web3Auth keyPair:', keyPair.getPublicKey().toString());
      //console.log('Web3Auth user:', user);
      setTokenId(null);
      setPendingAccountId(null);
      checkExistingAccount();
    }
  }, [isOpen, user, keyPair]);

  const checkExistingAccount = async () => {
    if (!user?.email || !keyPair) {
      //console.warn('Cannot check account: missing email or keyPair', { email: user?.email, hasKeyPair: !!keyPair });
      setError('Cannot check account. Please wait, initializing login...');
      return;
    }

    setCheckLoading(true);
    try {
      const publicKey = keyPair.getPublicKey().toString();
      const email = user.email;
      //console.log('Checking existing account:', { email, publicKey });
      const response = await fetch('/api/auth/check-for-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, publicKey }),
      });

      const text = await response.text();
      //console.log('Check account response:', text);
      if (!response.ok) {
        let errorData;
        try {
          errorData = JSON.parse(text);
          throw new Error(errorData.message || 'Failed to check account');
        } catch {
          throw new Error(`Unexpected server response: ${text}`);
        }
      }

      const { exists, accountId, tokenId } = JSON.parse(text);
      if (exists) {
        //console.log('Existing account found:', accountId);
        setExistingAccount(accountId);
        setTokenId(tokenId);
        await setupAccount(accountId);
        setIsAccountCreated(true);
        onAccountCreated(accountId);
      }
    } catch (err) {
      console.error('Error checking existing account:', err);
      setError(`Failed to check account: ${err.message}`);
    } finally {
      setCheckLoading(false);
    }
  };

  const handleClose = () => {
    if (!isAccountCreated && !username) {
      logout();
    }
    setUsername('');
    setTokenId(null);
    setShowPaymentModal(false);
    setPendingAccountId(null);
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Allow username (e.g., "user") or full accountId (e.g., "user.1000fans.near" or implicit)
    const accountId = username.includes('.') || /^[a-f0-9]{64}$/.test(username) 
      ? username 
      : `${username}.1000fans.near`;
    if (!/^[a-z0-9_-]{2,64}\.1000fans\.near$/.test(accountId) && !/^[a-f0-9]{64}$/.test(accountId)) {
      setError('Invalid account ID format (format: user.1000fans.near)');
      setIsLoading(false);
      return;
    }

    try {
      // Check if account already exists
      const publicKey = keyPair?.getPublicKey().toString();
      const email = user?.email;
      console.log('Submitting:', { accountId, publicKey, email });
      if (!publicKey || !email) {
        throw new Error('Missing public key or email');
      }

      const response = await fetch('/api/auth/check-for-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId, email, publicKey }),
      });

      const text = await response.text();
      console.log('Server response:', text);
      if (!response.ok) {
        let errorData;
        try {
          errorData = JSON.parse(text);
          throw new Error(errorData.error || errorData.message || 'Failed to check for existing accounts');
        } catch {
          throw new Error(`Unexpected server response: ${text}`);
        }
      }

      const { exists } = JSON.parse(text);
      if (exists) {
        setError(`Account ${accountId} already exists. Choose a different username.`);
        setIsLoading(false);
        return;
      }

      // Store accountId and show payment modal
      setPendingAccountId(accountId);
      setShowPaymentModal(true);
    } catch (err) {
      console.error('Error checking account:', err);
      setError(`Failed to check account: ${err.message}`);
      setIsLoading(false);
    }
  };

  const handlePayment = async (sessionId, amount) => {
    try {
      const publicKey = keyPair?.getPublicKey().toString();
      const email = user?.email;
      if (!publicKey || !email) {
        throw new Error('Missing public key or email');
      }
      // Proceed to account creation after payment
      await createAccount(pendingAccountId, publicKey, email, sessionId, amount);
    } catch (err) {
      console.error('Payment error:', err);
      throw err;
    }
  };

  const handleSkipPayment = async () => {
    try {
      const publicKey = keyPair?.getPublicKey().toString();
      const email = user?.email;
      if (!publicKey || !email) {
        throw new Error('Missing public key or email');
      }
      await createAccount(pendingAccountId, publicKey, email, null, null);
    } catch (err) {
      console.error('Skip payment error:', err);
      setError(`Failed to create account: ${err.message}`);
    }
  };

  const createAccount = async (accountId, publicKey, email, sessionId, amount) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/create-web3auth-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId, publicKey, email, paymentId: sessionId, amount }),
      });
      const text = await response.text();
      if (!response.ok) {
        throw new Error(JSON.parse(text).message || 'Failed to create account');
      }
      const { accountId: createdAccountId, tokenId } = JSON.parse(text);
      await setupAccount(createdAccountId);
      setIsAccountCreated(true);
      setTokenId(tokenId);
      onAccountCreated(createdAccountId);
    } catch (err) {
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className={styles.modalOverlay}>
        <div className={styles.modalDialog}>
          <div className={`${styles.modalContent} ${styles.accountModal}`}>
            <div className={styles.modalHeader}>
              <h5 className={styles.modalTitle}>{existingAccount ? 'Welcome Back' : 'Create Your NEAR Account'}</h5>
              <button
                type="button"
                className={styles.closeButton}
                onClick={handleClose}
                aria-label="Close"
              >
                x
              </button>
            </div>
            <div className={styles.modalBody}>
              {checkLoading ? (
                <div>Loading account information...</div>
              ) : existingAccount ? (
                <div>
                  <p>Account {existingAccount} already exists!</p>
                  <p>Your fan token {tokenId} grants access to exclusive content!</p>
                </div>
              ) : !isAccountCreated ? (
                <form onSubmit={handleSubmit}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Choose your account ID</label>
                    <input
                      type="text"
                      className={styles.formControl}
                      value={username}
                      onChange={(e) => setUsername(e.target.value.toLowerCase())}
                      placeholder="username"
                      required
                    />
                    <div className={styles.formText}>
                      Your account will be: {username ? (username.includes('.') || /^[a-f0-9]{64}$/.test(username) ? username : `${username}.1000fans.near`) : '<username>.1000fans.near'}
                    </div>
                  </div>
                  {error && <div className={styles.alertDanger}>{error}</div>}
                  <button type="submit" className={styles.buttonPrimary} disabled={isLoading || !keyPair}>
                    {isLoading ? 'Creating...' : 'Create Account'}
                  </button>
                </form>
              ) : (
                <div>
                  <p>Account {username} created successfully!</p>
                  <p>Fan token {tokenId} minted! You can now access exclusive content.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onSubmit={handlePayment}
        onSkip={handleSkipPayment}
        accountId={pendingAccountId}
        email={user?.email}
        theme={theme}
      />
    </>
  );
};