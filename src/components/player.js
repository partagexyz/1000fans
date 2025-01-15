// audio and video player component
import React, { useState, useRef, useEffect } from 'react';
import ReactPlayer from 'react-player';
import Image from 'next/image';
import styles from '@/styles/player.module.css';

const Player = ({ url = [], changeTrack, trackIndex = 0, playOnLoad, showPlaylist, togglePlaylist }) => {
    const [playing, setPlaying] = useState(false);
    const [trackIndexState, setTrackIndex] = useState(trackIndex);
    const [volume, setVolume] = useState(1.0);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);
    const [shuffledTracks, setShuffledTracks] = useState([]);
    const playerRef = useRef(null);

    useEffect(() => {
        // Shuffle tracks when they change or on component mount
        const shuffled = shuffleArray(url);
        setShuffledTracks(shuffled);
        setTrackIndex(trackIndex);
        if (playOnLoad && url.length > 0) {
            setPlaying(true);
            changeTrack(trackIndex);
        }
    }, [url, trackIndex, playOnLoad, changeTrack]);

    // Fisher-Yates Shuffle Algorithm
    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    const currentTrack = shuffledTracks[trackIndexState] || { url: '', metadata: '{}', title: 'Unknown', artist: 'Unknown Artist' };
    const isVideo = currentTrack.url ? currentTrack.url.endsWith('.mp4') : false;

    useEffect(() => {
        setTrackIndex(trackIndex);
        if (playOnLoad && url.length > 0) {
            setPlaying(true);
            changeTrack(trackIndex);
        }
    }, [trackIndex, playOnLoad, changeTrack, url.length]);

    // Handle progress
    const handleProgress = (state) => {
        setProgress(state.played);
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
        setTrackIndex((prevIndex) => (prevIndex + 1) % shuffledTracks.length);
        setPlaying(true);
    };

    // play previous track
    const toPrevTrack = () => {
        setTrackIndex((prevIndex) => (prevIndex - 1 + shuffledTracks.length) % shuffledTracks.length);
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

    const renderNextFiveTracks = () => {
        const start = (trackIndexState + 1) % url.length;
        return Array.from({ length: 5 }, (_, i) => {
            const index = (start + i) % url.length; // Circular playlist
            const track = url[index];
            return (
                <div key={track.id} className={styles.playlistItem} onClick={() => changeTrack(index)}>
                    <span>{track.artist ? `${track.artist} - ` : ''}{JSON.parse(track.metadata).title}</span>
                    <span>{track.duration}</span>
                </div>
            );
        });
    };

    if (!currentTrack || !currentTrack.url) {
        return <div>No track available.</div>;
    }

    return (
        <div className={isVideo ? styles['video-player'] : styles['audio-player']}>
            {isVideo ? 
                <div className={styles.videoContainer}>
                    <ReactPlayer 
                        ref={playerRef}
                        url={currentTrack.url}
                        playing={playing}
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
                {!isVideo && (
                    <Image
                        className={styles.cover}
                        src={JSON.parse(currentTrack.metadata).image}
                        alt={`Cover for ${currentTrack.title}`}
                        width={isVideo ? 911 : 512} 
                        height={512}
                    />
                )}
                <div className={styles.infoText}>
                    {/* Conditionally render artist first if it exists */}
                    {currentTrack.artist && 
                        <span className={styles.songArtist}>{currentTrack.artist} - </span>
                    }
                    <span className={styles.songTitle}>{JSON.parse(currentTrack.metadata).title}</span>
                </div>
            </div>
            {!isVideo && ( // only shows controls for audio
                <div>
                    <div className={styles.buttons}>
                        <span 
                            onClick={toPrevTrack}
                            className={`${styles.forback} ${styles.icon}`}
                            style={{fontSize: '24px', cursor: 'pointer'}}
                        >
                            ⏮️
                        </span>
                        <span 
                            onClick={toggle}
                            className={`${styles.pauseplay} ${styles.icon}`}
                            style={{fontSize: '40px', cursor: 'pointer'}} // Bigger than prev/next
                        >
                            {playing ? '⏸️' : '⏯️'}
                        </span>
                        <span 
                            onClick={toNextTrack}
                            className={`${styles.forback} ${styles.icon}`}
                            style={{fontSize: '24px', cursor: 'pointer'}}
                        >
                            ⏭️
                        </span>
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
                            onMouseUp={(e) => {
                                e.stopPropagation();
                                handleSeekMouseUp(e);
                            }}
                            onMouseDown={(e) => e.stopPropagation()}
                            className={styles.progress}
                        />
                        <div>{formatTime(duration)}</div> 
                    </div>
                <div className={styles.soundDiv}>
                    <label htmlFor="volume">Volume</label>
                    <input 
                        id="volume"
                        type="range" 
                        min="0" 
                        max="100" 
                        value={volume * 100}
                        onChange={(e) => {
                            e.stopPropagation();
                            onVolume(e.target.value);
                        }}
                        onMouseDown={(e) => e.stopPropagation()}
                        className={styles.volume}
                    />
                </div>
                <button 
                    onClick={togglePlaylist} 
                    className={`${styles.hamburgerButton} ${styles.overlapPlaylist}`}
                >
                    ☰
                </button>
                {showPlaylist && (
                    <div className={styles.miniPlaylist}>
                        {renderNextFiveTracks()}
                    </div>
                )}
            </div>
        )}
    </div>);
};

function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
}

export default Player;