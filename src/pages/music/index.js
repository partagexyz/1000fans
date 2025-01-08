// simplified version of a spotify-like playlist page
import dynamic from 'next/dynamic';
import styles from '@/styles/music.module.css';
import Image from 'next/image';
import { useState } from 'react';
import fs from 'fs';
import path from 'path';

// dynamically import the player to make it client-side only
const Player = dynamic(() => import('@/components/player'), { 
    ssr: false, // this ensures the component is not rendered on server 
});

export default function Music({ tracks }) {
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
                            {track.artist} - {track.title}
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

export async function getStaticProps() {
    // Read metadata from a local file directly
    const filePath = path.join(process.cwd(), 'scripts', 'audioMetadata.json');
    const metadata = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    // Convert metadata to the format expected by your player component
    const tracks = Object.entries(metadata).map(([filename, data]) => ({
        id: data.id,
        title: data.title || filename,
        artist: data.artist || 'Unknown Artist',
        duration: data.duration || 'Unknown', // Assuming duration might not be in metadata
        url: `/music/${filename}`,
        metadata: JSON.stringify({ 
            title: data.title || filename, 
            image: data.image || '/music/default_cover.png' // Provide a default image if none exists
        })
    }));

    return {
        props: {
            tracks,
        },
    };
}