// simplified version of an eventbrite-like search result page
import styles from '@/styles/events.module.css';

export default function Events() {
    const events = [
        { id: 1, title: 'Event One', date: '2025-03-01', location: 'Location A' },
        { id: 2, title: 'Event Two', date: '2025-04-01', location: 'Location B' },
        { id: 3, title: 'Event Three', date: '2025-05-01', location: 'Location C' },
    ];

    return (
        <div className={styles.eventList}>
            <h1>Upcoming Events</h1>
            <ul>
                {events.map(event => (
                    <li key={event.id} className={styles.event}>
                        <div className={styles.eventDetails}>
                            <h3>{event.title}</h3>
                            <p>{event.date}</p>
                            <p>{event.location}</p>
                        </div>
                        <button className={styles.registerButton}>Register</button>
                    </li>
                ))}
            </ul>
        </div>
    );
}