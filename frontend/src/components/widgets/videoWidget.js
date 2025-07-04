// src/components/widgets/videoWidget.js
import React, { useState, useEffect } from 'react';
import Player from '../player';
import Draggable from 'react-draggable';
import styles from '../../styles/widget.module.css';

const VideoWidget = ({ url, changeTrack, trackIndex, playOnLoad, closeWidget }) => {
  const [widgetSize, setWidgetSize] = useState('desktop');
  const [isPortrait, setIsPortrait] = useState(window.innerHeight > window.innerWidth);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 768) {
        setWidgetSize('mobile');
        setIsPortrait(window.innerHeight > window.innerWidth);
      } else {
        setWidgetSize('desktop');
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const calculateVideoDimensions = () => {
    if (widgetSize === 'desktop') {
      return { width: '911px', height: 'auto' };
    } else {
      const screenWidth = window.innerWidth;
      const availableHeight = window.innerHeight - 160; // Subtract header + footer
      if (screenWidth / availableHeight > 16 / 9) {
        const height = availableHeight;
        const width = height * 16 / 9;
        return { width: `${Math.min(width, screenWidth)}px`, height: `${height}px` };
      } else {
        const width = screenWidth;
        const height = width * 9 / 16;
        return { width: `${width}px`, height: `${Math.min(height, availableHeight)}px` };
      }
    }
  };

  const videoStyles = calculateVideoDimensions();

  const WidgetWrapper = widgetSize === 'mobile' ? 'div' : Draggable;

  return (
    <WidgetWrapper cancel=".closeButton, .icon, .sendButton, .registerButton, input, button">
      <div className={`${styles.widget} ${widgetSize === 'mobile' ? styles.fullScreen : ''}`} style={videoStyles}>
        <div className={styles['video-player-wrapper']}>
          <Player
            url={url}
            changeTrack={changeTrack}
            trackIndex={trackIndex}
            playOnLoad={playOnLoad}
            className={styles['video-player']}
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
      </div>
    </WidgetWrapper>
  );
};

export default VideoWidget;