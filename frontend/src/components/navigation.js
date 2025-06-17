// frontend/src/components/navigation.js
import Image from 'next/image';
import Link from 'next/link';
import React, { useEffect, useState } from 'react';
import { NearContext, useNear } from '../wallets/near';
import { useWeb3Auth } from '../wallets/web3auth';
import { LoginModal } from './LoginModal';
import { CreateAccountModal } from './CreateAccountModal';
import styles from '../styles/app.module.css';

export const Navigation = () => {
  const { signedAccountId, wallet, loginWithProvider, logout: nearLogout } = useNear();
  const { web3auth, logout: web3authLogout, accountId: web3authAccountId, keyPair } = useWeb3Auth();
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isCreateAccountModalOpen, setIsCreateAccountModalOpen] = useState(false);
  const [isClientLoaded, setIsClientLoaded] = useState(false);

  useEffect(() => {
    setIsClientLoaded(true);
  }, []);

  useEffect(() => {
    if (isClientLoaded && keyPair && !web3authAccountId && !signedAccountId) {
      setIsCreateAccountModalOpen(true);
    } else {
      setIsCreateAccountModalOpen(false);
    }
  }, [isClientLoaded, keyPair, web3authAccountId, signedAccountId]);

  useEffect(() => {
    const openLoginModal = () => {
      console.log('Open login modal event triggered'); // Debug
      setIsLoginModalOpen(true);
    };
    window.addEventListener('openLoginModal', openLoginModal);
    return () => window.removeEventListener('openLoginModal', openLoginModal);
  }, []);

  const handleLoginWithProvider = async (provider, options) => {
    console.log('Attempting login with provider:', provider); // Debug
    try {
      const result = await loginWithProvider(provider, options);
      setIsLoginModalOpen(false);
      if (result.needsAccountCreation) {
        setIsCreateAccountModalOpen(true);
      }
    } catch (error) {
      console.error(`Login with ${provider} failed:`, error);
    }
  };

  const handleAccountCreated = (newAccountId) => {
    setIsCreateAccountModalOpen(false);
  };

  const handleLogout = async () => {
    try {
      if (web3auth?.connected) {
        await web3authLogout();
      }
      if (signedAccountId) {
        await nearLogout();
      }
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleLoginClick = () => {
    console.log('Login button clicked'); // Debug
    setIsLoginModalOpen(true);
  };

  const isLoggedIn = isClientLoaded && (web3auth?.connected || signedAccountId);

  if (!isClientLoaded) return null;

  return (
    <>
      <nav className={styles.navbar}>
        <div className={styles['navbar-content']}>
          <Link href="/" passHref legacyBehavior>
            <div className={styles['navbar-brand']}>
              <Image
                priority
                src="/favicon.ico"
                alt="Theosis Icon"
                width={80}
                height={10}
                className={styles['navbar-icon']}
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            </div>
          </Link>
          <div className={styles['navbar-actions']}>
            <Link href="/console" passHref legacyBehavior>
              <a className={`${styles['nav-link']} ${styles['nav-link-shop']}`}>Console</a>
            </Link>
            <button
              className={styles['action-button']}
              onClick={isLoggedIn ? handleLogout : handleLoginClick}
            >
              {isLoggedIn ? `Logout ${signedAccountId || web3authAccountId}` : 'Login'}
            </button>
          </div>
        </div>
      </nav>

      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLoginWithProvider={handleLoginWithProvider}
      />

      <CreateAccountModal
        isOpen={isCreateAccountModalOpen}
        onClose={() => setIsCreateAccountModalOpen(false)}
        onAccountCreated={handleAccountCreated}
      />
    </>
  );
};