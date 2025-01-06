import styles from '@/styles/app.module.css';

export const Cards = ({ handleCardClick }) => {
  return (
    <div className={styles.grid}>
      <div
        className={styles.card}
        onClick={() => handleCardClick('/music')}
        style={{ cursor: 'pointer' }}
      >
        <h2>
          Music Collection <span>-&gt;</span>
        </h2>
        <p>Explore our exclusive collection of songs and playlists.</p>
      </div>

      <div
        className={styles.card}
        onClick={() => handleCardClick('/videos')}
        style={{ cursor: 'pointer' }}
      >
        <h2>
          Exclusive Videos <span>-&gt;</span>
        </h2>
        <p>Watch behind-the-scenes and unreleased video content.</p>
      </div>

      <div
        className={styles.card}
        onClick={() => handleCardClick('/events')}
        style={{ cursor: 'pointer' }}
      >
        <h2>
          Private Events <span>-&gt;</span>
        </h2>
        <p>Join private events and meet-and-greets with your favorite artists.</p>
      </div>

      <div
        className={styles.card}
        onClick={() => handleCardClick('/chat')}
        style={{ cursor: 'pointer' }}
      >
        <h2>
          Chat Room <span>-&gt;</span>
        </h2>
        <p>Connect with other fans in real-time.</p>
      </div>
    </div>
  );
};