import React from 'react';
import styles from '../../styles/widget.module.css';
import Draggable from 'react-draggable';

const EventsWidget = ({ events, closeWidget }) => {      
    return (
        <Draggable>
            <div className={styles.widget}>
                <button onClick={closeWidget} className={styles.closeButton}>X</button>
                <h3>Upcoming Events</h3>
                <div className={styles.eventList}>
                    <ul>
                        {events.events && events.events.length > 0 ? (
                            events.events.map(event => (
                                <li key={event.id} className={styles.event}>
                                    <div className={styles.eventDetails}>
                                        <h3>{event.title}</h3>
                                        <p>{event.date}</p>
                                        <p>{event.location}</p>
                                    </div>
                                    <button className={styles.registerButton}>Register</button>
                                </li>
                            ))
                        ) : (
                            <p>No events to display</p>
                        )}
                    </ul>
                </div>
            </div>
        </Draggable>
    );
};

export default EventsWidget;