// frontend/src/components/navigation.js
import Image from 'next/image';
import Link from 'next/link';
import React, { useEffect, useState } from 'react';
import { useNear } from '../wallets/near';
import { useWeb3Auth } from '../wallets/web3auth';
import { LoginModal } from './loginModal';
import { CreateAccountModal } from './createAccountModal';
import styles from '../styles/app.module.css';

export const Navigation = () => {
  const { signedAccountId, wallet, loginWithProvider, logout: nearLogout } = useNear();
  const { web3auth, logout: web3authLogout, accountId: web3authAccountId, keyPair } = useWeb3Auth();
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isCreateAccountModalOpen, setIsCreateAccountModalOpen] = useState(false);
  const [isClientLoaded, setIsClientLoaded] = useState(false);
  const [web3AuthUser, setWeb3AuthUser] = useState(null);
  const [web3AuthKeyPair, setWeb3AuthKeyPair] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [welcomeMessage, setWelcomeMessage] = useState('');

  useEffect(() => {
    setIsClientLoaded(true);
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 767);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (isClientLoaded && keyPair && !web3authAccountId && !signedAccountId) {
      setIsCreateAccountModalOpen(true);
    } else {
      setIsCreateAccountModalOpen(false);
    }
  }, [isClientLoaded, keyPair, web3authAccountId, signedAccountId]);

  useEffect(() => {
    const openLoginModal = () => setIsLoginModalOpen(true);
    //console.log('Open login modal event triggered');  
    window.addEventListener('openLoginModal', openLoginModal);
    return () => window.removeEventListener('openLoginModal', openLoginModal);
  }, []);

  const handleLoginWithProvider = async (provider, options) => {
    try {
      const result = await loginWithProvider(provider, options);
      setIsLoginModalOpen(false);
      if (result.needsAccountCreation) {
        setWeb3AuthUser(result.user);
        setWeb3AuthKeyPair(result.keyPair);
        setIsCreateAccountModalOpen(true);
      } else {
        const response = await fetch('/api/auth/check-for-account', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accountId: result.accountId }),
        });
        const data = await response.json();
        if (data.exists) {
          setWelcomeMessage(`Welcome! Account ${data.accountId} ${data.tokenId ? `owns token ${data.tokenId}` : 'has no token'}${data.isGroupMember ? ' and is a member of theosis group.' : '.'}`);
        }
      }
    } catch (error) {
      console.error(`Login with ${provider} failed:`, error);
      alert(`Login failed: ${error.message}`);
    }
  };

  const handleAccountCreated = (newAccountId) => {
    setIsCreateAccountModalOpen(false);
    setWeb3AuthUser(null);
    setWeb3AuthKeyPair(null);
    setWelcomeMessage(`Account ${newAccountId} created with fan token! You are now a member of theosis group.`);
  };

  const handleLogout = async () => {
    try {
      if (web3auth?.connected) {
        await web3authLogout();
        console.log('Web3Auth logged out');
      }
      if (signedAccountId) {
        await nearLogout();
        console.log('NEAR wallet logged out');
      }
      setWelcomeMessage('');
    } catch (error) {
      console.error('Logout failed:', error);
      alert('Logout failed: ' + error.message);
    }
  };

  const handleLoginClick = () => {
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
              {isLoggedIn ? (isMobile ? 'Logout' : `Logout ${signedAccountId || web3authAccountId}`) : 'Login'}
            </button>
          </div>
        </div>
      </nav>
      {welcomeMessage && <div className={styles.alertSuccess}>{welcomeMessage}</div>}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLoginWithProvider={handleLoginWithProvider}
      />
      <CreateAccountModal
        isOpen={isCreateAccountModalOpen}
        onClose={() => setIsCreateAccountModalOpen(false)}
        onAccountCreated={handleAccountCreated}
        user={web3AuthUser}
        keyPair={web3AuthKeyPair}
      />
    </>
  );
};