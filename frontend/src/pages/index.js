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
  const [chatHistory, setChatHistory] = useState([]);

  useEffect(() => {
    const checkMembership = async () => {
      if (signedAccountId && wallet) {
        const ownsToken = await wallet.ownsToken(signedAccountId, '1000fans.testnet');
        setIsMember(ownsToken);
        if (ownsToken) {
          fetchChatHistory(); // Fetch chat history when user is a member
        }
      }
    };
    checkMembership();
  }, [signedAccountId, wallet]);

  useEffect(() => {
    // Polling for chat updates every 5 seconds (adjust as needed)
    let intervalId;
    if (isMember) {
      intervalId = setInterval(fetchChatHistory, 5000);
    }
    return () => clearInterval(intervalId); // Cleanup on component unmount
  }, [isMember]);

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

  const fetchChatHistory = async () => {
    try {
      const response = await fetch('https://astq6uqxkf.execute-api.eu-north-1.amazonaws.com/prod/chat/getHistory');
      const data = await response.json();
      const chatData = JSON.parse(data.body);
      console.log('Fetched chat history:', data);
      // Handle case where data might not be an array or might be empty
      setChatHistory(chatData);
    } catch (error) {
      console.error('Failed to fetch chat history:', error);
      // Reset to empty array on error
      setChatHistory([]);
    }
  };

  const sendMessage = async (messageData) => {
    try {
      const response = await fetch('https://astq6uqxkf.execute-api.eu-north-1.amazonaws.com/prod/chat/sendMessage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(messageData)
      });
      const result = await response.json();
      if (response.ok) {
        console.log('Message sent successfully:', result);
        fetchChatHistory(); // Refetch chat history to update the UI
      } else {
        throw new Error(result.error || 'Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const widgetProps = {
    music: { url: music, changeTrack: changeAudio, trackIndex: currentAudioIndex, playOnLoad },
    videos: { url: videos, changeTrack: changeVideo, trackIndex: currentVideoIndex, playOnLoad },
    events: { events },
    chat: { 
      messages: chatHistory, 
      sendMessage: sendMessage } // Pass the sendMessage function to be used in ChatWidget
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