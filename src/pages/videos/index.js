// simplified version of a youtube-like channel page
import styles from '@/styles/videos.module.css';
import Image from 'next/image';

export default function Videos() {
    const videos = [
        // dummy data to be replaced later with server fetched data or API call to private youtube channel
        { id: 1, title: 'Video One', thumbnail: '/video1.png' },
        { id: 2, title: 'Video Two', thumbnail: '/video2.png' },
        { id: 3, title: 'Video Three', thumbnail: '/video3.png' },
    ];

    return (
        <div className={styles.videoGrid}>
            <h1>Exclusive Videos</h1>
            <div className={styles.grid}>
                {videos.map(video => (
                    <div key={video.id} className={styles.card}>
                        <Image src={video.thumbnail} alt={video.title} className={styles.thumbnail} />
                        <p>{video.title}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}