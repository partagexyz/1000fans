import Link from 'next/link';
import styles from '@/styles/app.module.css';

export const Cards = () => {
  return (
    <div className={styles.grid}>
      <Link
        href="/music"
        className={styles.card}
        rel="noopener noreferrer"
      >
        <h2>
          Music Collection <span>-&gt;</span>
        </h2>
        <p>Explore our exclusive collection of songs and playlists.</p>
      </Link>

      <Link
        href="/videos"
        className={styles.card}
        rel="noopener noreferrer"
      >
        <h2>
          Exclusive Videos <span>-&gt;</span>
        </h2>
        <p>Watch behind-the-scenes and unreleased video content.</p>
      </Link>

      <Link
        href="/events"
        className={styles.card}
        rel="noopener noreferrer"
      >
        <h2>
          Events <span>-&gt;</span>
        </h2>
        <p>Join private events and meet-and-greets with your favorite artists.</p>
      </Link>
    </div>
  );
};