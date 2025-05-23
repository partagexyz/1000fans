import Image from 'next/image';
import Link from 'next/link';
import React, { useEffect, useState, useContext } from 'react';
import { NearContext } from '../wallets/near';
import styles from '../styles/app.module.css';

export const Navigation = () => {
  const { signedAccountId, wallet } = useContext(NearContext);
  const [action, setAction] = useState(() => {});
  const [label, setLabel] = useState('Loading...');

 // login/logout button using the signIn and signOut methods from the wallet selector
  useEffect(() => {
    if (!wallet) return;

    if (signedAccountId) {
      setAction(() => wallet.signOut);
      setLabel(`Logout`);
    } else {
      setAction(() => wallet.signIn);
      setLabel('Login');
    }
  }, [signedAccountId, wallet]);

  return (
    <nav className={styles.navbar}>
      <div className={styles['navbar-content']}>
        <Link href="/" passHref legacyBehavior>
          <div className={styles['navbar-brand']}>
            {/* Use a string path instead of importing the icon directly */}
            <Image 
              priority 
              src="/favicon.ico" 
              alt="Theosis Icon" 
              width={80} 
              height={10} 
              className={styles['navbar-icon']} 
              onError={(e) => { e.target.style.display = 'none'; }} // Hide if image fails to load
            />
            {/*<span className={`${styles['navbar-brand']} mb-0 h1 ms-2`}>1000 FANS</span>*/}
          </div>
        </Link>
        <div className={styles['navbar-actions']}>
          <Link href="/console" passHref legacyBehavior>
            <a className={`${styles['nav-link']} ${styles['nav-link-shop']}`}>Console</a>
          </Link>
          <button className={styles['action-button']} onClick={action}>{label}</button>
        </div>
      </div>
    </nav>
  );
};