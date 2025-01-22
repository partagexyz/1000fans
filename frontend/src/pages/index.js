import { useEffect, useState, useContext } from 'react';
import { NearContext } from '../wallets/near';
import styles from '../styles/app.module.css';
import { Cards } from '../components/cards';
import { fetchFileFromS3 } from '../utils/fetchMetadata';

export default function Index({ music, videos, events }) {
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
    music: { url: music, changeTrack: changeAudio, trackIndex: currentAudioIndex, playOnLoad },
    videos: { url: videos, changeTrack: changeVideo, trackIndex: currentVideoIndex, playOnLoad },
    events: { events },
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
  const bucketName = process.env.AWS_S3_BUCKET_NAME;
  const metadataFiles = [
    { key: 'audioMetadata.json', stateKey: 'music' },
    { key: 'videoMetadata.json', stateKey: 'videos' },
    { key: 'eventsMetadata.json', stateKey: 'events' }
  ];
  
  const metadata = {};
  for (const { key, stateKey } of metadataFiles) {
    const data = await fetchFileFromS3(bucketName, key);

    if (data) {
      if (stateKey === 'music' || stateKey === 'videos') {
        metadata[stateKey] = Object.entries(data).map(([filename, info]) => ({
          id: info.id,
          title: info.title || filename,
          artist: stateKey === 'music' ? (info.artist || 'Unknown Artist') : '',
          duration: info.duration || 'Unknown',
          url: info.url,
          metadata: JSON.stringify({
            title: info.title || filename,
            image: info.image || `https://1000fans-theosis.s3.amazonaws.com/nocoverfound.jpg`
          })
        }));
      } else if (stateKey === 'events') {
        // Wrap events in an object with an 'events' key to match the widget's expectation
        metadata[stateKey] = { events: Object.values(data) };
      }
    } else {
      // Provide an empty structure for each type when data is not available
      if(stateKey === 'events') {
        metadata[stateKey] = { events: [] };
      } else {
        metadata[stateKey] = [];
      }
    }
  }

  return {
    props: {
      music: metadata.music || [],
      videos: metadata.videos || [],
      events: metadata.events || []
    },
  };
}