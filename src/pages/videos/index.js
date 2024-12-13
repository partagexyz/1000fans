// simplified version of a youtube-like channel page
import styles from '@/styles/videos.module.css';
import Player from '@/components/player';

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

    return (
        <div className={styles.videoGrid}>
            <h1>Exclusive Videos</h1>
            <Player url={videos} />
        </div>
    );
}