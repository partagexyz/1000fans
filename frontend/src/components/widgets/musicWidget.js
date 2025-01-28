import React, { memo, useState, useEffect } from 'react';
import Player from '../player';
import styles from '../../styles/widget.module.css';
import Draggable from 'react-draggable';

const MusicWidget = memo(({ url, changeTrack, trackIndex, playOnLoad, closeWidget }) => {
    const [showPlaylist, setShowPlaylist] = useState(false); // State to toggle playlist visibility
    const [widgetSize, setWidgetSize] = useState('small');

    useEffect(() => {
        const handleResize = () => {
            setWidgetSize(window.innerWidth <= 768 ? 'full' : 'small'); // Adjust breakpoint as needed
        };
        window.addEventListener('resize', handleResize);
        handleResize(); // Check on initial render
        return () => window.removeEventListener('resize', handleResize);
    }, []);
    
    const togglePlaylist = () => {
        setShowPlaylist(!showPlaylist);
    };

    return (
        <Draggable>
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
                    className={`${styles.closeButton} ${styles.overlapClose}`}
                >
                    X
                </button>
            </div>
        </Draggable>
    );
});

export default MusicWidget;