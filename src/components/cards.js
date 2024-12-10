import Link from 'next/link';
import styles from '@/styles/app.module.css';
import Image from 'next/image';
import MusicIcon from '/public/music.png';
import VideoIcon from '/public/video.png';
import EventIcon from '/public/event.png';

export const Cards = () => {
  return (
    <div className={styles.grid}>
      <Link
        href="/music"
        className={styles.card}
        rel="noopener noreferrer"
      >
        <div className={styles.cardIcon}>
          <Image src={MusicIcon} alt="Music" width={64} height={64} />
        </div>
        <h2>
          Music Collection <span>-&gt;</span>
        </h2>
        <p>Explore exclusive tracks and playlists.</p>
      </Link>

      <Link
        href="/videos"
        className={styles.card}
        rel="noopener noreferrer"
      >
        <div className={styles.cardIcon}>
          <Image src={VideoIcon} alt="Videos" width={64} height={64} />
        </div>
        <h2>
          Exclusive Videos <span>-&gt;</span>
        </h2>
        <p>Watch behind-the-scenes and unreleased content.</p>
      </Link>

      <Link
        href="/events"
        className={styles.card}
        rel="noopener noreferrer"
      >
        <div className={styles.cardIcon}>
          <Image src={EventIcon} alt="Events" width={64} height={64} />
        </div>
        <h2>
          Events <span>-&gt;</span>
        </h2>
        <p>Join private events and meet-and-greets.</p>
      </Link>
    </div>
  );
};