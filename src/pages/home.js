import Image from 'next/image';
import styles from '@/styles/app.module.css';
import { Cards } from '@/components/cards';
import MentalaLogo from '/public/mentala.png';

import { useEffect, useState, useContext } from 'react';
import { NearContext } from '@/wallets/near';
import { useRouter } from 'next/router';

export default function Home() {
  const { wallet } = useContext(NearContext);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkLoginStatus = async () => {
      if (wallet && wallet.selector) {
        const walletSelector = wallet.selector;
        const currentState = walletSelector.store.getState();
        const isSignedIn = currentState.accounts.find(account => account.active) !== undefined;
        setIsLoggedIn(isSignedIn);
      }
    };

    checkLoginStatus();

    if (wallet && wallet.selector) {
      const walletSelector = wallet.selector;
      const unsubscribe = walletSelector.store.observable.subscribe((state) => {
        const isSignedIn = state.accounts.find(account => account.active) !== undefined;
        setIsLoggedIn(isSignedIn);
      });
  
      return () => unsubscribe(); //cleanup subscription
    }
  }, [wallet]);

  const handleCardClick = (path) => {
    if (isLoggedIn) {
      router.push(path);
    } else {
      wallet.signIn();
    }
  };

  return (
    <main className={styles.main}>
      <div className={styles.description}> </div>

      <div className={styles.center}>
        <Image
          className={styles.logo}
          src={MentalaLogo}
          alt="Mentala Logo"
          // adjust width and height according to logo
          width={512}
          height={512}
          priority
        />
      </div>

      <div className={styles.grid}>
        <Cards handleCardClick={handleCardClick} />
      </div>
    </main>
  );
}