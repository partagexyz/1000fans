// simplified version of a spotify-like playlist page
import styles from '@/styles/music.module.css';

export default function Music() {
    const tracks = [
        // dummy data to ne replaced later with server fetched data or API call to private spotify playlists
        { id: 1, title: 'Track One', artist: 'Artist A', duration: '3:45' },
        { id: 2, title: 'Track Two', artist: 'Artist B', duration: '4:00' },
        { id: 3, title: 'Track Three', artist: 'Artist C', duration: '3:30' },
    ];

    return (
        <div className={styles.playlist}>
            <h1>Music Collection</h1>
            <ul className={styles.tracklist}>
                {tracks.map(track => (
                    <li key={track.id} className={styles.track}>
                        <div className={styles.trackInfo}>
                            <span>{track.title}</span> - <span>{track.artist}</span>
                        </div>
                        <div className={styles.trackDuration}>{track.duration}</div>
                        <button className={styles.playButton}>Play</button>
                    </li>
                ))}
            </ul>
        </div>
    );
}