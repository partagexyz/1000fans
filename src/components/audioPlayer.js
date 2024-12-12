// audio player component
'use client'
import React, { useState } from 'react';
import ReactPlayer from 'react-player';
import Image from 'next/image';
import styles from '../styles/audioPlayer.module.css';

const Player = ({ url }) => {
    const [playing, setPlaying] = useState(false);
    const [trackIndex, setTrackIndex] = useState(0);
    const [volume, setVolume] = useState(1.0);

    const currentTrack = url[trackIndex];

    // toggle play/pause
    const toggle = () => {
        setPlaying(!playing);
    };

    // play next track
    const toNextTrack = () => {
        setTrackIndex((prevIndex) => (prevIndex + 1) % url.length);
        setPlaying(true);
    };

    // play previous track
    const toPrevTrack = () => {
        setTrackIndex((prevIndex) => (prevIndex - 1 + url.length) % url.length);
        setPlaying(true);
    };

    // volume control
    const onVolume = (value) => {
        setVolume(value / 100);
    };

    return (
        <div className={styles['audio-player']}>
            <div className={styles.buttons} style={{ width: '300px', justifyContent: 'start' }}>
                <Image
                    className={styles.cover}
                    src={JSON.parse(currentTrack.metadata).image}
                    alt={`Cover for ${currentTrack.title}`}
                    width={100} 
                    height={100}
                />
                <div>
                    <div className={styles.songTitle}>{JSON.parse(currentTrack.metadata).title}</div>
                    <div className={styles.songArtist}>{currentTrack.artist}</div>
                </div>
            </div>
            <ReactPlayer 
                url={currentTrack.url}
                playing={playing}
                volume={volume}
                onEnded={toNextTrack}
                width="0px"
                height="0px"
            />
            <div>
                <div className={styles.buttons}>
                    <button className={styles.forback} onClick={toPrevTrack}>Prev</button>
                    <button className={styles.pauseplay} onClick={toggle}>
                        {playing ? 'Pause' : 'Play'}
                    </button>
                    <button className={styles.forback} onClick={toNextTrack}>Next</button>
                </div>
                {/* optional: progress bar */}
                <div className={styles.buttons}>
                    <div>0:00</div>
                    <input 
                        type="range" 
                        min="0" 
                        max="1" 
                        step="0.01" 
                        value={volume}
                        onChange={(e) => onVolume(e.target.value * 100)}
                        className={styles.progress}
                    />
                    <div>1:00</div> 
                </div>
            </div>
            {/* optional: volume element */}
            <div className={styles.soundDiv}>
            <label htmlFor="volume">Volume</label>
                <input 
                    id="volume"
                    type="range" 
                    min="0" 
                    max="100" 
                    value={volume * 100}
                    onChange={(e) => onVolume(e.target.value)}
                    className={styles.volume}
                />
            </div>
        </div>
    );
};

export default Player;