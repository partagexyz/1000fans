// audio and video player component
import React, { useState, useRef, useEffect } from 'react';
import ReactPlayer from 'react-player';
import Image from 'next/image';
import styles from '../styles/player.module.css';

const Player = ({ url = [], changeTrack, trackIndex = 0, playOnLoad, showPlaylist, togglePlaylist }) => {
    const [playing, setPlaying] = useState(false);
    const [trackIndexState, setTrackIndex] = useState(trackIndex);
    const [volume, setVolume] = useState(1.0);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);
    const [shuffledTracks, setShuffledTracks] = useState([]);
    const playerRef = useRef(null);

    useEffect(() => {
        const videos = url.filter(track => track.url && track.url.endsWith('.mp4'));
        const audios = url.filter(track => track.url && track.url.endsWith('.mp3'));
        // shuffle audio tracks but order video tracks
        const shuffledAudios = shuffleArray([...audios]);
        const sortedVideos = [...videos].sort((a, b) => a.title.localeCompare(b.title));
        setShuffledTracks([...sortedVideos, ...shuffledAudios]);
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

    // determine if the device is mobile
    const isMobile = () => window.innerWidth <= 768;

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
    const toggle = (e) => {
        if (e) e.preventDefault();
        setPlaying(!playing);
    };

    // play next track
    const toNextTrack = (e) => {
        if (e) e.preventDefault();
        setTrackIndex((prevIndex) => (prevIndex + 1) % shuffledTracks.length);
        setPlaying(true);
    };

    // play previous track
    const toPrevTrack = (e) => {
        if (e) e.preventDefault();
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
            const index = (start + i) % url.length; 
            const track = url[index];
            return (
                <div 
                    key={track.id} 
                    className={styles.playlistItem} 
                    onClick={() => changeTrack(index)}
                    onTouchStart={(e) => {
                        e.preventDefault();
                        changeTrack(index);
                    }}
                >
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
            {isVideo ? (
                <div className={styles.videoContainer}>
                    <ReactPlayer
                        ref={playerRef}
                        url={currentTrack.url}
                        playing={playing}
                        onProgress={handleProgress}
                        onDuration={handleDuration}
                        onEnded={toNextTrack}
                        width="100%"
                        height="100%"
                        controls={true} // Ensure built-in controls are touch-enabled
                        config={{
                            file: {
                                attributes: {
                                    onTouchStart: (e) => e.stopPropagation(), // Prevent drag interference
                                },
                            },
                        }}
                    />
                </div>
            ) : (
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
            )}
            <div className={styles.info}>
                {isVideo && (
                    <div className={styles.controlsContainer}>
                        <span 
                            onClick={toPrevTrack}
                            onTouchStart={toPrevTrack}
                            className={`${styles.forback} ${styles.icon}`}
                            style={{fontSize: '24px'}}
                        >
                            ⏮️
                        </span>
                        <span className={styles.songTitle}>{JSON.parse(currentTrack.metadata).title}</span>
                        <span 
                            onClick={toNextTrack}
                            onTouchStart={toNextTrack}
                            className={`${styles.forback} ${styles.icon}`}
                            style={{fontSize: '24px' }}
                        >
                            ⏭️
                        </span>
                    </div>
                )}
                {!isVideo && (
                    <div className={styles.coverContainer}>
                        <Image
                            className={styles.cover}
                            src={JSON.parse(currentTrack.metadata).image}
                            alt={`Cover for ${currentTrack.title}`}
                            // Use dynamic sizes for mobile
                            width={isMobile() ? 400 : 512} 
                            height={isMobile() ? 400 : 512}
                            layout="responsive" // Ensures the image maintains its aspect ratio
                        />
                    </div>
                )}
                <div className={styles.infoText}>
                    {/* Conditionally render artist and title only for audio */}
                    {!isVideo && (
                        <>
                            {currentTrack.artist && <span className={styles.songArtist}>{currentTrack.artist} - </span>}
                            <span className={styles.songTitle}>{JSON.parse(currentTrack.metadata).title}</span>
                        </>
                    )}
                </div>
            </div>
            {!isVideo && ( // only shows controls for audio
                <div>
                    <div className={styles.buttons}>
                        <span 
                            onClick={toPrevTrack}
                            onTouchStart={toPrevTrack}
                            className={`${styles.forback} ${styles.icon}`}
                            style={{ fontSize: '24px' }}
                        >
                            ⏮️
                        </span>
                        <span 
                            onClick={toggle}
                            onTouchStart={toggle}
                            className={`${styles.pauseplay} ${styles.icon}`}
                            style={{ fontSize: '40px' }} // Bigger than prev/next
                        >
                            {playing ? '⏸️' : '⏯️'}
                        </span>
                        <span 
                            onClick={toNextTrack}
                            onTouchStart={toNextTrack}
                            className={`${styles.forback} ${styles.icon}`}
                            style={{ fontSize: '24px' }}
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
                            onTouchEnd={(e) => {
                                e.stopPropagation();
                                handleSeekMouseUp(e);
                            }}
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
                            onTouchEnd={(e) => {
                                e.stopPropagation();
                                onVolume(e.target.value);
                            }}
                            className={styles.volume}
                        />
                    </div>
                    <button 
                        onClick={togglePlaylist}
                        onTouchStart={(e) => {
                            e.preventDefault();
                            togglePlaylist();
                        }}
                        className={`${styles.hamburgerButton} ${styles.overlapPlaylist}`}
                    >
                        ☰
                    </button>
                    {showPlaylist && <div className={styles.miniPlaylist}>{renderNextFiveTracks()}</div>}
                </div>
            )}
        </div>
    );
};

function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
}

export default Player;