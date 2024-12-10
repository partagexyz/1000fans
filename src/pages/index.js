import Image from 'next/image';
import styles from '@/styles/app.module.css';
import { Cards } from '@/components/cards';
import MentalaLogo from '/public/mentala.png';

export default function Home() {
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
        <Cards />
      </div>
    </main>
  );
}