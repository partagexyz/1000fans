import React from 'react';
import Player from '../player';
import styles from '@/styles/widget.module.css';
import Draggable from 'react-draggable';

const MusicWidget = ({ url, changeTrack, trackIndex, playOnLoad, closeWidget }) => {
    console.log('MusicWidget URL:', url);
    return (
        <Draggable>
            <div className={styles.widget}>
                <button onClick={closeWidget} className={styles.closeButton}>X</button>
                <h3> Music Player</h3>
                <Player 
                    url={url} 
                    changeTrack={changeTrack} 
                    trackIndex={trackIndex} 
                    playOnLoad={playOnLoad} 
                />
            </div>
        </Draggable>
    );
}

export default MusicWidget;