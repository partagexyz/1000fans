import React, { useState } from 'react';
import Player from '../player';
import styles from '../../styles/widget.module.css';
import Draggable from 'react-draggable';

const MusicWidget = ({ url, changeTrack, trackIndex, playOnLoad, closeWidget }) => {
    const [showPlaylist, setShowPlaylist] = useState(false); // State to toggle playlist visibility

    const togglePlaylist = () => {
        setShowPlaylist(!showPlaylist);
    };

    return (
        <Draggable>
            <div className={styles.widget}>
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
}

export default MusicWidget;