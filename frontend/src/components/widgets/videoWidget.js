// a video player widget to display on the home page
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
        handleResize(); // Check on initial render
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const calculateVideoDimensions = () => {
        if (widgetSize === 'desktop') {
            return { width: '665px', height: '430px' };
        } else {
            const screenWidth = window.innerWidth;
            const screenHeight = window.innerHeight;
            
            // Determine which dimension should be the limiting factor based on aspect ratio
            if (screenWidth / screenHeight > 16/9) { // Screen is wider than 16:9
                const height = screenHeight;
                const width = height * 16 / 9;
                return { width: `${width}px`, height: `${height}px` };
            } else { // Screen is narrower or equal to 16:9
                const width = screenWidth;
                const height = width * 9 / 16;
                return { width: `${width}px`, height: `${height}px` };
            }
        }
    };

    // Calculate dimensions on render or when the orientation or size changes
    const videoStyles = calculateVideoDimensions();
    
    return (
        <Draggable>
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
                        className={`${styles.closeButton} ${styles.overlapClose}`}
                    >
                        X
                    </button>
                </div>
            </div>
        </Draggable>
    );
};

export default VideoWidget;