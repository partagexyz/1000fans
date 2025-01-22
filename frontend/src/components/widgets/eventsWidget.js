import React from 'react';
import styles from '../../styles/widget.module.css';
import Draggable from 'react-draggable';

const EventsWidget = ({ events, closeWidget }) => {
    // sort events by date, most recent first
    const sortedEvents = [...(events.events || [])].sort((a, b) => 
        new Date(b.date) - new Date(a.date)
    );

    // split events into upcoming and past
    const today = new Date();
    const upcomingEvents = sortedEvents.filter(event => new Date(event.date) >= today);
    const pastEvents = sortedEvents.filter(event => new Date(event.date) < today);

    return (
        <Draggable>
            <div className={styles.widget}>
                <button onClick={closeWidget} className={styles.closeButton}>X</button>
                <h3>Upcoming Events</h3>
                <div className={styles.eventList}>
                    <ul>
                        {upcomingEvents.length > 0 ? (
                            upcomingEvents.map(event => (
                                <li key={event.id} className={styles.event}>
                                    <div className={styles.eventDetails}>
                                        <h3>{event.title}</h3>
                                        <p>{event.date}</p>
                                        <p>{event.location}</p>
                                    </div>
                                    <a href={event.registrationLink} target="_blank" rel="noopener noreferrer">
                                        <button className={styles.registerButton}>Register</button>
                                    </a>
                                </li>
                            ))
                        ) : (
                            <p>No upcoming events</p>
                        )}
                    </ul>
                </div>

                {pastEvents.length > 0 && (
                    <>
                        <h3 className={styles.pastEventsTitle}>Past Events</h3>
                        <div className={styles.eventList}>
                            <ul>
                                {pastEvents.map(event => (
                                    <li key={event.id} className={`${styles.event} ${styles.pastEvent}`}>
                                        <div className={styles.eventDetails}>
                                            <h3>{event.title}</h3>
                                            <p>{event.date}</p>
                                            <p>{event.location}</p>
                                        </div>
                                        <a href={event.registrationLink} target="_blank" rel="noopener noreferrer">
                                            <button className={styles.registerButton}>Details</button>
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </>
                )}
            </div>
        </Draggable>
    );
};

export default EventsWidget;