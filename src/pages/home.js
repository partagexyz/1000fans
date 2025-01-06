import Image from 'next/image';
import styles from '@/styles/app.module.css';
import { Cards } from '@/components/cards';
import Hero from '/public/hero.jpg';

import { useEffect, useState, useContext } from 'react';
import { NearContext } from '@/wallets/near';
import { useRouter } from 'next/router';

export default function Home() {
  const { signedAccountId, wallet } = useContext(NearContext);
  const router = useRouter();
  const [isMember, setIsMember] = useState(false);

  useEffect(() => {
    const checkMembership = async () => {
      if (signedAccountId && wallet) {
        const ownsToken = await wallet.ownsToken(signedAccountId, 'partage-lock.testnet');
        setIsMember(ownsToken);
      }
    };
    checkMembership();
  }, [signedAccountId, wallet]);

  const handleCardClick = (path) => {
    if (signedAccountId) {
      if (isMember) {
        router.push(path); // redirect when logged in and owns token
      } else {
        alert('You need to a fans token to access this page. Visit the shop to get one!');
      }
    } else {
      wallet.signIn(); // trigger login when not logged in
    }
  };

  return (
    <main className={styles.main}>
      <div className={styles.grid}>
        <Cards handleCardClick={handleCardClick} />
      </div>

      <div className={styles.center}>
        {/*<Image
          className={styles.logo}
          src={Hero}
          alt="Hero Image"
          width={1024} // adjust width and height according to logo size
          height={768}
          priority
        />*/}
      </div>
    </main>
  );
}