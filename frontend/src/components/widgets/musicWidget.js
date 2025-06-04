// src/components/widgets/musicWidget.js
import React, { memo, useState, useEffect } from 'react';
import Player from '../player';
import styles from '../../styles/widget.module.css';
import Draggable from 'react-draggable';

const MusicWidget = memo(({ url, changeTrack, trackIndex, playOnLoad, closeWidget }) => {
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [widgetSize, setWidgetSize] = useState('small');

  useEffect(() => {
    const handleResize = () => {
      setWidgetSize(window.innerWidth <= 768 ? 'full' : 'small');
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const togglePlaylist = () => {
    setShowPlaylist(!showPlaylist);
  };

  const WidgetWrapper = widgetSize === 'full' ? 'div' : Draggable;

  return (
    <WidgetWrapper cancel=".closeButton, .icon, .sendButton, .registerButton, input, button">
      <div className={`${styles.widget} ${widgetSize === 'full' ? styles.fullScreen : ''}`}>
        <Player
          url={url}
          changeTrack={changeTrack}
          trackIndex={trackIndex}
          playOnLoad={playOnLoad}
          showPlaylist={showPlaylist}
          togglePlaylist={togglePlaylist}
        />
        <button
          onClick={closeWidget}
          onTouchStart={(e) => {
            e.preventDefault();
            closeWidget();
          }}
          className={`${styles.closeButton} ${styles.overlapClose}`}
        >
          X
        </button>
      </div>
    </WidgetWrapper>
  );
});

MusicWidget.displayName = 'MusicWidget';

export default MusicWidget;