// simplified version of a youtube-like channel page
import dynamic from 'next/dynamic';
import styles from '@/styles/videos.module.css';
import Image from 'next/image';
import { useState } from 'react';

// dynamically import the player to make it client-side only
const Player = dynamic(() => import('@/components/player'), { 
    ssr: false,
});

export default function Videos() {
    const videos = [
        // test files to be replaced with server-hosted files or API calls to a third-party
        { 
            id: 1, 
            title: 'Video One', 
            url: '/videos/video1.mp4', // Path to video in public/videos
            metadata: JSON.stringify({title: 'Video One', image: '/videos/thumbnail1.png'}),
        },
        { 
            id: 2, 
            title: 'Video Two', 
            url: '/videos/video2.mp4',
            metadata: JSON.stringify({title: 'Video Two', image: '/videos/thumbnail2.png'}), 
        },
        { 
            id: 3, 
            title: 'Video Three', 
            url: '/videos/video3.mp4',
            metadata: JSON.stringify({title: 'Video Three', image: '/videos/thumbnail3.png'}), 
        },
    ];

    const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
    const [playOnLoad, setPlayOnLoad] = useState(false);

    // function to change the current video
    const changeVideo = (index) => {
        setCurrentVideoIndex(index);
        setPlayOnLoad(true);
    };

    return (
        <div className={styles.videoGrid}>
            <h1>Exclusive Videos</h1>
            <Player 
                url={videos}
                changeTrack={changeVideo}
                trackIndex={currentVideoIndex}
                playOnLoad={playOnLoad} 
            />
            <ul className={styles.videoList}>
                {videos.map((video, index) => (
                    <li key={video.id} className={styles.videoItem}>
                        <Image 
                            src={JSON.parse(video.metadata).image} 
                            alt={`Thumbnail for ${video.title}`}
                            width={200} 
                            height={112}
                            className={styles.videoThumbnail}
                        />
                        <span className={styles.videoTitle}>
                            {video.title}
                        </span>
                        <button
                            className={styles.playButton}
                            onClick={() => changeVideo(index)}
                        >
                            Play
                        </button>
                    </li>
                ))}
            </ul>
        </div>  
    );
}