// src/components/CreateAccountModal.js
import React, { useState, useEffect } from 'react';
import { useWeb3Auth } from '../wallets/web3auth';
import styles from '../styles/app.module.css';

export const CreateAccountModal = ({ isOpen, onClose, onAccountCreated }) => {
  const { keyPair, setupAccount, logout } = useWeb3Auth();
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isAccountCreated, setIsAccountCreated] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsAccountCreated(false);
      setError('');
      setUsername('');
    }
  }, [isOpen]);

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

    if (!/^[a-z0-9_-]{2,64}\.near$/.test(username) && !/^[a-f0-9]{64}$/.test(username)) {
      setError('Invalid NEAR account ID format (e.g., user.near or 64-char implicit ID)');
      setIsLoading(false);
      return;
    }

    try {
      const publicKey = keyPair?.getPublicKey().toString();
      const response = await fetch('/api/auth/create-web3auth-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId: username, publicKey }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create account');
      }

      const { accountId } = await response.json();
      await setupAccount(accountId);
      setIsAccountCreated(true);
      onAccountCreated(accountId);
      onClose();
    } catch (err) {
      console.error('Error creating account:', err);
      setError(`Failed to create account: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Create Your NEAR Account</h5>
            <button
              type="button"
              className="btn-close"
              onClick={handleClose}
              aria-label="Close"
            ></button>
          </div>
          <div className="modal-body">
            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label className="form-label">Choose your account ID</label>
                <input
                  type="text"
                  className="form-control"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase())}
                  placeholder="e.g., user.near"
                  required
                />
                <div className="form-text">
                  Your account will be: {username || '<username>.near'}
                </div>
              </div>
              {error && <div className="alert alert-danger">{error}</div>}
              <button
                type="submit"
                className="btn btn-primary w-100"
                disabled={isLoading || !keyPair}
              >
                {isLoading ? 'Creating...' : 'Create Account'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};