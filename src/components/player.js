// audio player component
import React, { useState, useRef, useEffect } from 'react';
import ReactPlayer from 'react-player';
import Image from 'next/image';
import styles from '../styles/player.module.css';

const Player = ({ url, changeTrack, trackIndex, playOnLoad }) => {
    const [playing, setPlaying] = useState(false);
    const [trackIndexState, setTrackIndex] = useState(trackIndex);
    const [volume, setVolume] = useState(1.0);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);
    const playerRef = useRef(null);

    const currentTrack = url[trackIndexState];
    const isVideo = currentTrack.url.endsWith('.mp4');

    // Handle progress
    const handleProgress = (state) => {
        setProgress(state.progress);
    };

    // Handle seeking
    const handleSeekChange = (e) => {
        setProgress(parseFloat(e.target.value));
    };

    // Seek to new position
    const handleSeekMouseUp = (e) => {
        playerRef.current.seekTo(parseFloat(e.target.value));
    };

    // Update duration when media is loaded
    const handleDuration = (duration) => {
        setDuration(duration);
    };

    // play/pause toggle
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

    // playlist button click
    const playTrack = (index) => {
        setTrackIndex(index);
        setPlaying(true);
    };

    const handleTrackChange = (index) => {
        changeTrack(index);
        playTrack(index);
    };

    useEffect(() => {
        setTrackIndex(trackIndex);
        if (playOnLoad) {
            setPlaying(true);
            changeTrack(trackIndex);
        }
    }, [trackIndex, playOnLoad, changeTrack]);

    return (
        <div className={isVideo ? styles['video-player'] : styles['audio-player']}>
            {isVideo ? 
                <div className={styles.videoContainer}>
                    <ReactPlayer 
                        ref={playerRef}
                        url={currentTrack.url}
                        playing={playing}
                        volume={volume}
                        onProgress={handleProgress}
                        onDuration={handleDuration}
                        onEnded={toNextTrack}
                        width="911px"
                        height="512px"
                        controls
                    />
                </div>
            :
                <ReactPlayer 
                    ref={playerRef}
                    url={currentTrack.url}
                    playing={playing}
                    volume={volume}
                    onProgress={handleProgress}
                    onDuration={handleDuration}
                    onEnded={toNextTrack}
                    width="0px"
                    height="0px"
                />
            }
            <div className={styles.info}>
                <Image
                    className={styles.cover}
                    src={JSON.parse(currentTrack.metadata).image}
                    alt={`Cover for ${currentTrack.title}`}
                    width={isVideo ? 911 : 512} 
                    height={512}
                />
                <div className={styles.infoText}>
                    <div className={styles.songTitle}>{JSON.parse(currentTrack.metadata).title}</div>
                    <div className={styles.songArtist}>{currentTrack.artist}</div>
                </div>
            </div>
            <div>
                <div className={styles.buttons}>
                    <button className={styles.forback} onClick={toPrevTrack}>Prev</button>
                    <button className={styles.pauseplay} onClick={toggle}>
                        {playing ? 'Pause' : 'Play'}
                    </button>
                    <button className={styles.forback} onClick={toNextTrack}>Next</button>
                </div>
                <div className={styles.buttons}>
                    <div>{formatTime(isNaN(duration) || isNaN(progress) ? 0 : progress * duration)}</div>
                    <input 
                        type="range" 
                        min={0}
                        max={1}
                        step="any" 
                        value={progress}
                        onChange={handleSeekChange}
                        onMouseUp={handleSeekMouseUp}
                        className={styles.progress}
                    />
                    <div>{formatTime(duration)}</div> 
                </div>
            </div>
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

function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
}

export default Player;