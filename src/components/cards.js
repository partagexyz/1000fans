import styles from '@/styles/app.module.css';
import { useState } from 'react';
import MusicWidget from './widgets/musicWidget';

export const Cards = ({ handleCardClick, musicWidgetProps }) => {
  return (
    <div className={styles.grid}>
      <CardWidget 
        cardType="music" 
        title="Music Collection" 
        description="Explore our exclusive collection of songs and playlists." 
        widgetProps={musicWidgetProps}  
      />
      <CardWidget 
        cardType="videos" 
        title="Exclusive Videos" 
        description="Watch behind-the-scenes and unreleased video content." 

      />
      <CardWidget 
        cardType="events" 
        title="Private Events" 
        description="Join private events and meet-and-greets with your favorite artists." 

      />
      <CardWidget 
        cardType="chat" 
        title="Chat Room" 
        description="Connect with other fans in real-time." 

      />
    </div>
  );
};

// CardWidget component
const CardWidget = ({ cardType, title, description, widgetProps }) => {
  const [isWidgetOpen, setWidgetOpen] = useState(false);

  const toggleWidget = () => setWidgetOpen(!isWidgetOpen);

  return (
    <>
      <div className={styles.card} onClick={toggleWidget} style={{ cursor: 'pointer' }}>
        <h2>{title} <span>-&gt;</span></h2>
        <p>{description}</p>
      </div>
      {isWidgetOpen && 
        <MusicWidget 
          {...widgetProps}
          closeWidget={() => setWidgetOpen(false)} 
        />
      }
    </>
  );
};