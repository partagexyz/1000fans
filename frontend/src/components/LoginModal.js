// src/components/LoginModal.js
import React, { useState } from 'react';
import { useNear } from '../wallets/near';
import { useWeb3Auth } from '../wallets/web3auth';
import styles from '../styles/app.module.css';

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
    <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Log in to 1000fans</h5>
            <button
              type="button"
              className="btn-close"
              onClick={onClose}
              aria-label="Close"
            ></button>
          </div>
          <div className="modal-body">
            <div className="mb-4">
              <h6 className="mb-3">Login Options</h6>
              <button
                className="btn btn-primary btn-lg w-100 mb-3 d-flex align-items-center justify-content-center gap-2"
                onClick={() => {
                  onLoginWithProvider('google');
                  onClose();
                }}
              >
                <i className="bi bi-google"></i>
                Continue with Google
              </button>
              <div className="text-center my-4">
                <div className="d-flex align-items-center">
                  <div className="border-top flex-grow-1"></div>
                  <div className="mx-3 text-muted">or</div>
                  <div className="border-top flex-grow-1"></div>
                </div>
              </div>
              <form onSubmit={handleEmailLogin} className="mb-3">
                <div className="mb-3">
                  <input
                    type="email"
                    className="form-control"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="btn btn-primary w-100 d-flex align-items-center justify-content-center gap-2"
                  disabled={isLoading}
                >
                  <i className="bi bi-envelope"></i>
                  {isLoading ? 'Sending...' : 'Continue with Email'}
                </button>
              </form>
              <div className="text-center my-4">
                <div className="d-flex align-items-center">
                  <div className="border-top flex-grow-1"></div>
                  <div className="mx-3 text-muted">or</div>
                  <div className="border-top flex-grow-1"></div>
                </div>
              </div>
              <button
                className="btn btn-secondary btn-lg w-100 d-flex align-items-center justify-content-center gap-2"
                onClick={() => {
                  wallet?.signIn();
                  onClose();
                }}
              >
                <i className="bi bi-wallet2"></i>
                Connect NEAR Wallet
              </button>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};