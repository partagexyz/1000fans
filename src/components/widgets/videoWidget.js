// a video player widget to display on the home page
import React, { useState } from 'react';
import Player from '../player';
import Draggable from 'react-draggable';
import styles from '@/styles/widget.module.css';

const VideoWidget = ({ url, changeTrack, trackIndex, playOnLoad, closeWidget }) => {

    return (
        <Draggable>
            <div className={styles.widget}>
                <button onClick={closeWidget} className={styles.closeButton}>X</button>
                <h3> Exclusive Videos</h3>
                <div className={styles['video-player-wrapper']}>
                    <Player 
                        url={url} 
                        changeTrack={changeTrack} 
                        trackIndex={trackIndex} 
                        playOnLoad={playOnLoad}
                        className={styles['video-player']}
                    />
                </div>
            </div>
        </Draggable>
    );
};

export default VideoWidget;