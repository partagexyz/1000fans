// a video player widget to display on the home page
import React from 'react';
import Player from '../player';
import Draggable from 'react-draggable';
import styles from '../../styles/widget.module.css';

const VideoWidget = ({ url, changeTrack, trackIndex, playOnLoad, closeWidget }) => {
    return (
        <Draggable>
            <div className={styles.widget} style={{ width: '665px', height: '430px' }}>
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