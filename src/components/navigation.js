import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState, useContext } from 'react';
import { NearContext } from '@/wallets/near';
import Icon from '/public/favicon.ico';
import styles from '@/styles/app.module.css';

export const Navigation = () => {
  const { signedAccountId, wallet } = useContext(NearContext);
  const [action, setAction] = useState(() => { });
  const [label, setLabel] = useState('Loading...');

 // login/logout button using the signIn and signOut methods from the wallet selector
  useEffect(() => {
    if (!wallet) return;

    if (signedAccountId) {
      setAction(() => wallet.signOut);
      setLabel(`Logout ${signedAccountId}`);
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
            <Image 
              priority 
              src={Icon} 
              alt="Theosis Icon" 
              width={51} 
              height={51} 
              className={styles['navbar-icon']} 
            />
            {/*<span className={`${styles['navbar-brand']} mb-0 h1 ms-2`}>1000 FANS</span>*/}
          </div>
        </Link>
        <div className={styles['navbar-actions']}>
          <Link href="/shop" passHref legacyBehavior>
            <a className={`${styles['nav-link']} ${styles['nav-link-shop']}`}>Shop</a>
          </Link>
          <button className={styles['action-button']} onClick={action}>{label}</button>
        </div>
      </div>
    </nav>
  );
};