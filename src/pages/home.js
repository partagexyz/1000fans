import { useEffect, useState, useContext } from 'react';
import { NearContext } from '@/wallets/near';
import styles from '@/styles/app.module.css';
import { Cards } from '@/components/cards';
import fs from 'fs';
import path from 'path';

export default function Home({ audios, videos }) {
  const { signedAccountId, wallet } = useContext(NearContext);
  const [isMember, setIsMember] = useState(false);
  const [currentAudioIndex, setCurrentAudioIndex] = useState(0);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
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

  const changeAudio = (index) => {
    setCurrentAudioIndex(index);
    setPlayOnLoad(true);
  };

  const changeVideo = (index) => {
    setCurrentVideoIndex(index);
    setPlayOnLoad(true);
  };

  const widgetProps = {
    music: { url: audios, changeTrack: changeAudio, trackIndex: currentAudioIndex, playOnLoad },
    videos: { url: videos, changeTrack: changeVideo, trackIndex: currentVideoIndex, playOnLoad },
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
  // read audio metadata from a local file during build time
  const audioPath = path.join(process.cwd(), 'scripts', 'audioMetadata.json');
  const audioMetadata = JSON.parse(fs.readFileSync(audioPath, 'utf8'));

  const audios = Object.entries(audioMetadata).map(([filename, data]) => ({
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

  // read video metadata from a local file during build time
  const videoPath = path.join(process.cwd(), 'scripts', 'videoMetadata.json');
  const videoMetadata = JSON.parse(fs.readFileSync(videoPath, 'utf8'));

  const videos = Object.entries(videoMetadata).map(([filename, data]) => ({
    id: data.id,
    title: data.title || filename,
    url: data.url || `/videos/${filename}`,
    metadata: JSON.stringify({
      title: data.title || filename,
      image: data.image || '/videos/nocoverfound.jpg'
    })
  }));

  return {
    props: {
      audios,
      videos
    },
    revalidate: 3600, // revalidate the tracklist every hour
  };
}