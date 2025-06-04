// src/components/widgets/chatWidget.js
import React, { useState, useEffect, useRef } from 'react';
import styles from '../../styles/widget.module.css';
import Draggable from 'react-draggable';

const ChatWidget = ({ closeWidget, messages, sendMessage }) => {
  const [newMessage, setNewMessage] = useState('');
  const [username, setUsername] = useState('');
  const messageEndRef = useRef(null);
  const [widgetSize, setWidgetSize] = useState('small');

  useEffect(() => {
    const handleResize = () => {
      setWidgetSize(window.innerWidth <= 768 ? 'full' : 'small');
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (newMessage.trim() && username.trim()) {
      const timestamp = new Date().toLocaleString();
      await sendMessage({ username, message: newMessage, timestamp });
      setNewMessage('');
    }
  };

  const handleChangeUsername = (e) => {
    setUsername(e.target.value);
  };

  const handleChangeMessage = (e) => {
    setNewMessage(e.target.value);
  };

  // Conditionally render Draggable or plain div based on widgetSize
  const WidgetWrapper = widgetSize === 'full' ? 'div' : Draggable;

  return (
    <WidgetWrapper cancel=".closeButton, .sendButton, input, form">
      <div className={`${styles.widget} ${widgetSize === 'full' ? styles.fullScreen : ''}`}>
        <button
          onClick={closeWidget}
          onTouchStart={(e) => {
            e.preventDefault();
            closeWidget();
          }}
          className={`${styles.closeButton} ${styles.overlapClose}`}
        >
          X
        </button>
        <h3>Chat Room</h3>
        <div className={styles.chatMessages}>
          {Array.isArray(messages) ?
            messages.map((msg, index) => (
              <div key={index} className={styles.message}>
                <strong>{msg.username}</strong> <span className={styles.timestamp}>{msg.timestamp}</span>
                <p>{msg.message}</p>
              </div>
            ))
            : null}
          <div ref={messageEndRef} />
        </div>
        <form onSubmit={handleSendMessage} className={styles.chatForm}>
          <input
            type="text"
            placeholder="Enter your username"
            value={username}
            onChange={handleChangeUsername}
            className={styles.usernameInput}
          />
          <input
            type="text"
            placeholder="Type your message"
            value={newMessage}
            onChange={handleChangeMessage}
            className={styles.messageInput}
          />
          <button
            type="submit"
            onTouchStart={(e) => {
              e.preventDefault();
              handleSendMessage(e);
            }}
            className={styles.sendButton}
          >
            Send
          </button>
        </form>
      </div>
    </WidgetWrapper>
  );
};

export default ChatWidget;