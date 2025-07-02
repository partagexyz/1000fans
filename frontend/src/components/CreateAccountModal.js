// src/components/CreateAccountModal.js
import { useState, useEffect } from 'react';
import { useWeb3Auth } from '../wallets/web3auth';
import styles from '../styles/app.module.css';

export const CreateAccountModal = ({ isOpen, onClose, onAccountCreated }) => {
  const { keyPair, setupAccount, logout, user } = useWeb3Auth();
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [checkLoading, setCheckLoading] = useState(false);
  const [error, setError] = useState('');
  const [isAccountCreated, setIsAccountCreated] = useState(false);
  const [showOnRamp, setShowOnRamp] = useState(false);
  const [existingAccount, setExistingAccount] = useState(null);

  useEffect(() => {
    if (isOpen && user && keyPair) {
      setIsAccountCreated(false);
      setError('');
      setUsername('');
      setShowOnRamp(false);
      //console.log('Web3Auth keyPair:', keyPair.getPublicKey().toString());
      //console.log('Web3Auth user:', user);
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

      const { exists, accountId } = JSON.parse(text);
      if (exists) {
        //console.log('Existing account found:', accountId);
        setExistingAccount(accountId);
        await setupAccount(accountId);
        setIsAccountCreated(true);
        setShowOnRamp(true);
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
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Allow username (e.g., "user") or full accountId (e.g., "user.1000fans.near" or implicit)
    const accountId = username.includes('.') || /^[a-f0-9]{64}$/.test(username) ? username : `${username}.1000fans.near`;
    if (!/^[a-z0-9_-]{2,64}\.1000fans\.near$/.test(accountId) && !/^[a-f0-9]{64}$/.test(accountId)) {
      setError('Invalid account ID format (e.g., user.1000fans.near or 64-char implicit ID)');
      setIsLoading(false);
      return;
    }

    try {
      const publicKey = keyPair?.getPublicKey().toString();
      const email = user?.email;
      console.log('Submitting:', { accountId, publicKey, email });
      if (!publicKey || !publicKey.startsWith('ed25519:') || publicKey.length !== 52) {
        throw new Error(`Invalid or missing public key: ${publicKey}`);
      }
      if (!email) {
        throw new Error('User email not available');
      }

      const response = await fetch('/api/auth/create-web3auth-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId, publicKey, email }),
      });

      const text = await response.text();
      console.log('Server response:', text);
      if (!response.ok) {
        let errorData;
        try {
          errorData = JSON.parse(text);
          throw new Error(errorData.error || errorData.message || 'Failed to create account');
        } catch {
          throw new Error(`Unexpected server response: ${text}`);
        }
      }

      const { accountId: createdAccountId } = JSON.parse(text);
      await setupAccount(createdAccountId);
      setIsAccountCreated(true);
      setShowOnRamp(true);
      onAccountCreated(createdAccountId);
    } catch (err) {
      console.error('Error creating account:', err);
      setError(`Failed to create account: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOnRamp = () => {
    // Redirect to MoonPay or Ramp
    const onRampUrl = `https://buy.moonpay.com?apiKey=${process.env.REACT_APP_MOONPAY_API_KEY}&currencyCode=NEAR&walletAddress=${username}`;
    window.open(onRampUrl, '_blank');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">{existingAccount ? 'Welcome Back' : 'Create Your NEAR Account'}</h5>
            <button
              type="button"
              className="btn-close"
              onClick={handleClose}
              aria-label="Close"
            ></button>
          </div>
          <div className="modal-body">
            {checkLoading ? (
              <div>Loading account information...</div>
            ) : existingAccount ? (
              <div>
                <p>Account {existingAccount} already exists!</p>
                <p>Fund your wallet with NEAR to mint tokens and access exclusive content.</p>
                <button className="btn btn-primary w-100" onClick={handleOnRamp}>
                  Fund Wallet with MoonPay
                </button>
              </div>
            ) : !isAccountCreated ? (
              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label className="form-label">Choose your account ID</label>
                  <input
                    type="text"
                    className="form-control"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase())}
                    placeholder="e.g., user or user.1000fans.near"
                    required
                  />
                  <div className="form-text">Your account will be: {username ? (username.includes('.') || /^[a-f0-9]{64}$/.test(username) ? username : `${username}.1000fans.near`) : '<username>.1000fans.near'}</div>
                </div>
                {error && <div className="alert alert-danger">{error}</div>}
                <button type="submit" className="btn btn-primary w-100" disabled={isLoading || !keyPair}>
                  {isLoading ? 'Creating...' : 'Create Account'}
                </button>
              </form>
            ) : (
              <div>
                <p>Account {username} created successfully!</p>
                <p>Fund your wallet with NEAR to mint tokens and access exclusive content.</p>
                <button className="btn btn-primary w-100" onClick={handleOnRamp}>
                  Fund Wallet with MoonPay
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};