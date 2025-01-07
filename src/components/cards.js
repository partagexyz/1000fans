import styles from '@/styles/app.module.css';
import { useState } from 'react';
import MusicWidget from './widgets/musicWidget';

export const Cards = ({ handleCardClick, widgetProps, isMember }) => {
  return (
    <div className={styles.grid}>
      <CardWidget 
        cardType="music" 
        title="Music Collection" 
        description="Explore our exclusive collection of songs and playlists." 
        widgetProps={widgetProps.music}
        onToggleWidget={handleCardClick}
        isMember={isMember}  
      />
      <CardWidget 
        cardType="videos" 
        title="Exclusive Videos" 
        description="Watch behind-the-scenes and unreleased video content." 
        widgetProps={widgetProps.videos}
        onToggleWidget={handleCardClick}
        isMember={isMember}
      />
      <CardWidget 
        cardType="events" 
        title="Private Events" 
        description="Join private events and meet-and-greets with your favorite artists." 
        widgetProps={widgetProps.events}
        onToggleWidget={handleCardClick}
        isMember={isMember}
      />
      <CardWidget 
        cardType="chat" 
        title="Chat Room" 
        description="Connect with other fans in real-time." 
        widgetProps={widgetProps.chat}
        onToggleWidget={handleCardClick}
        isMember={isMember}
      />
    </div>
  );
};

// CardWidget component
const CardWidget = ({ cardType, title, description, widgetProps, onToggleWidget, isMember }) => {
  const [isWidgetOpen, setWidgetOpen] = useState(false);

  const toggleWidget = () => {
    onToggleWidget();
    if (isMember) {
      setWidgetOpen(!isWidgetOpen); // toggle widget if member
    } else {
      setWidgetOpen(false); // close widget if not a member
    }
  };

  return (
    <>
      <div className={styles.card} onClick={toggleWidget} style={{ cursor: 'pointer' }}>
        <h2>{title} <span>-&gt;</span></h2>
        <p>{description}</p>
      </div>
      {cardType === 'music' && isWidgetOpen && 
        <MusicWidget 
          {...widgetProps}
          closeWidget={() => setWidgetOpen(false)} 
        />
      }
    </>
  );
};