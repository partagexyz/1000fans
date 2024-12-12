// simplified version of a spotify-like playlist page
import styles from '@/styles/music.module.css';
import Player from '@/components/audioPlayer'

export default function Music() {
    const tracks = [
        // test files from a google drive storage. to be replaced with server-hoster files or API calls to a host service
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

    return (
        <div className={styles.playlist}>
            <h1>Music Collection</h1>
            <Player url={tracks} />
        </div>
    );
}