// src/components/paymentModal.js
import React, { useState, useEffect, useRef } from 'react';
import { loadStripeOnramp } from '@stripe/crypto';
import styles from '../styles/modal.module.css';

const stripeOnrampPromise = loadStripeOnramp(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

export const PaymentModal = ({ isOpen, onClose, onSubmit, onSkip, accountId, email, theme }) => {
  const [amount, setAmount] = useState('10.00');
  const [clientSecret, setClientSecret] = useState(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const onrampSessionRef = useRef(null);

  useEffect(() => {
    if (isOpen && amount) {
      // Create onramp session when modal opens
      const createSession = async () => {
        setIsLoading(true);
        setError('');
        try {
          const response = await fetch('/api/payments/create-onramp-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              accountId,
              email,
              amount,
              destinationAddress: '0x9a1761ca62c0f3fe06D508Ba335aD0eBdA690b45', // Replace with actual Ethereum address if needed
            }),
          });
          const data = await response.json();
          if (!response.ok) {
            throw new Error(data.message || 'Failed to create onramp session');
          }
          setClientSecret(data.clientSecret);
          onrampSessionRef.current = { sessionId: data.sessionId, amount: parseFloat(amount) };
        } catch (err) {
          setError(`Failed to initialize payment: ${err.message}`);
        } finally {
          setIsLoading(false);
        }
      };
      createSession();
    }
  }, [isOpen, amount, accountId, email]);

  useEffect(() => {
    // Update theme when it changes
    if (onrampSessionRef.current?.session && theme) {
      onrampSessionRef.current.session.setAppearance({ theme });
    }
  }, [theme]);

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalDialog}>
        <div className={`${styles.modalContent} ${styles.paymentModal}`}>
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
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Amount (USD)</label>
              <select
                className={styles.formControl}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={isLoading || error.includes('not available') || error.includes('local development') || error.includes('API key')}
              >
                <option value="5.00">5.00 USD</option>
                <option value="10.00">10.00 USD</option>
                <option value="20.00">20.00 USD</option>
              </select>
            </div>
            {error && (
              <div className={styles.alertDanger}>
                {error}
              </div>
            )}
            {isLoading ? (
              <div>Loading payment interface...</div>
            ) : clientSecret ? (
              <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <CryptoElements stripeOnramp={stripeOnrampPromise}>
                  <OnrampElement
                    clientSecret={clientSecret}
                    appearance={{ theme: theme || 'dark' }}
                    style={{ maxWidth: '500px', height: '500px', zIndex: 1 }}
                    onSessionUpdate={({ payload }) => {
                      console.log('Onramp session updated:', payload.session.status);
                      if (payload.session.status === 'fulfillment_complete') {
                        onSubmit(onrampSessionRef.current.sessionId, onrampSessionRef.current.amount);
                        onClose();
                      }
                    }}
                  />
                </CryptoElements>
                <button
                  type="button"
                  className={styles.buttonSecondary}
                  onClick={() => {
                    onSkip();
                    onClose();
                  }}
                  disabled={isLoading}
                  style={{ 
                    marginTop: '10px',
                    width: '100%',
                    maxWidth: '500px'
                  }}
                >
                  Skip Funding
                </button>
              </div>
            ) : (
              !error && <div>Initializing payment...</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// React context for StripeOnramp
const CryptoElementsContext = React.createContext(null);

export const CryptoElements = ({ stripeOnramp, children }) => {
  const [ctx, setContext] = React.useState(() => ({ onramp: null }));

  React.useEffect(() => {
    let isMounted = true;
    Promise.resolve(stripeOnramp).then((onramp) => {
      if (onramp && isMounted) {
        setContext((ctx) => (ctx.onramp ? ctx : { onramp }));
      }
    });
    return () => {
      isMounted = false;
    };
  }, [stripeOnramp]);

  return <CryptoElementsContext.Provider value={ctx}>{children}</CryptoElementsContext.Provider>;
};

export const useStripeOnramp = () => {
  const context = React.useContext(CryptoElementsContext);
  return context?.onramp;
};

export const OnrampElement = ({ clientSecret, appearance, onSessionUpdate, ...props }) => {
  const stripeOnramp = useStripeOnramp();
  const onrampElementRef = useRef(null);

  useEffect(() => {
    const containerRef = onrampElementRef.current;
    if (!containerRef || !clientSecret || !stripeOnramp) {
      console.warn('OnrampElement: Missing container, clientSecret, or stripeOnramp');
      return;
    }

    // Ensure container is a valid DOM node
    if (!(containerRef instanceof HTMLElement)) {
      console.error('OnrampElement: containerRef is not an HTMLElement');
      return;
    }

    containerRef.innerHTML = '';
    const session = stripeOnramp.createSession({ clientSecret, appearance });
    try {
      session.mount(containerRef);
      onrampElementRef.current.session = session; // Store session for theme updates
      // Listen for session updates
      session.addEventListener('onramp_session_updated', onSessionUpdate);
    } catch (err) {
      console.error('Failed to mount Stripe onramp:', err);
    }

    return () => {
      session.removeEventListener('onramp_session_updated', onSessionUpdate);
    };
  }, [clientSecret, stripeOnramp, appearance, onSessionUpdate]);

  return <div {...props} ref={onrampElementRef}></div>;
};