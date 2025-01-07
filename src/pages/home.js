import { useEffect, useState, useContext } from 'react';
import { NearContext } from '@/wallets/near';
import styles from '@/styles/app.module.css';
import { Cards } from '@/components/cards';
import fs from 'fs';
import path from 'path';

export default function Home({ tracks }) {
  const { signedAccountId, wallet } = useContext(NearContext);
  const [isMember, setIsMember] = useState(false);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [playOnLoad, setPlayOnLoad] = useState(false);

  useEffect(() => {
    const checkMembership = async () => {
      if (signedAccountId && wallet) {
        const ownsToken = await wallet.ownsToken(signedAccountId, 'partage-lock.testnet');
        setIsMember(ownsToken);
      }
    };
    checkMembership();
  }, [signedAccountId, wallet]);

  const handleCardClick = () => {
    if (signedAccountId) {
      if (isMember) {
        // perform handlecardclick when logged in and owns token.
      } else {
        alert('You need to a fans token to access this content. Visit the shop to get one!');
      }
    } else {
      wallet.signIn(); // trigger login when not logged in
    }
  };

  const changeTrack = (index) => {
    setCurrentTrackIndex(index);
    setPlayOnLoad(true);
  };

  const widgetProps = {
    music: { url: tracks, changeTrack, trackIndex: currentTrackIndex, playOnLoad },
    videos: {},
    events: {},
    chat: {}
  };

  return (
    <main className={styles.main}>
      <div className={styles.grid}>
        <Cards 
          handleCardClick={handleCardClick}
          widgetProps={widgetProps}
          isMember={isMember}
        />
      </div>
    </main>
  );
}

export async function getStaticProps() {
  // read metadata from a local file during build time
  const filePath = path.join(process.cwd(), 'scripts', 'metadata.json');
  const metadata = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  const tracks = Object.entries(metadata).map(([filename, data]) => ({
    id: data.id,
    title: data.title || filename,
    artist: data.artist || 'Unknown Artist',
    duration: data.duration || 'Unknown',
    url: data.url || `/music/${filename}`,
    metadata: JSON.stringify({
      title: data.title || filename,
      image: data.image || '/music/nocoverfound.jpg'
    })
  }));

  return {
    props: {
      tracks,
    },
    revalidate: 3600, // revalidate the tracklist every hour
  };
}