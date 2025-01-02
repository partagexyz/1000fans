// simplified version of a spotify-like playlist page
import dynamic from 'next/dynamic';
import styles from '@/styles/music.module.css';
import Image from 'next/image';
import { useState } from 'react';

// dynamically import the player to make it client-side only
const Player = dynamic(() => import('@/components/player'), { 
    ssr: false, // this ensures the component is not rendered on server 
});

export default function Music() {
    const tracks = [
        // test files to be replaced with server-hosted files or API calls to a third-party
        { 
            id: 1, 
            title: 'Track One', 
            artist: 'Artist A', 
            duration: '3:45', 
            url: '/music/track1.mp3',
            metadata: JSON.stringify({title: 'Track One', image: '/music/cover1.png'}),
        },
        { 
            id: 2, 
            title: 'Track Two', 
            artist: 'Artist B', 
            duration: '4:00', 
            url: '/music/track2.mp3',
            metadata: JSON.stringify({title: 'Track Two', image: '/music/cover2.png'}), 
        },
        { 
            id: 3, 
            title: 'Track Three', 
            artist: 'Artist C', 
            duration: '3:30', 
            url: '/music/track3.mp3',
            metadata: JSON.stringify({title: 'Track Three', image: '/music/cover3.png'}), 
        },
    ];

    const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
    const [playOnLoad, setPlayOnLoad] = useState(false);

    // This function will be passed to the Player to update the track index
    const changeTrack = (index) => {
        setCurrentTrackIndex(index);
        setPlayOnLoad(true);
    };

    return (
        <div className={styles.playlist}>
            <h1>Music Collection</h1>
            <Player 
                url={tracks} 
                changeTrack={changeTrack} 
                trackIndex={currentTrackIndex} 
                playOnLoad={playOnLoad} 
            />
            <ul className={styles.trackList}>
                {tracks.map((track, index) => (
                    <li key={track.id} className={styles.track}>
                        <Image
                            src={JSON.parse(track.metadata).image}
                            alt={`Cover for ${track.title}`}
                            width={40} 
                            height={40}
                            className={styles.trackIcon} 
                        />
                        <span className={styles.trackInfo}>
                            {track.title} - {track.artist}
                        </span>
                        <span className={styles.trackDuration}>{track.duration}</span>
                        <button 
                            className={styles.playButton} 
                            onClick={() => changeTrack(index)}
                        >
                            Play
                        </button>
                    </li>
                ))}
            </ul>
        </div>
    );
}