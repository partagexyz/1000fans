// components/footer.js
import React from 'react';
import styles from '../styles/app.module.css';

const Footer = ({ theme, toggleTheme }) => {
  return (
    <footer className={styles.footer}>
      <p>
        Made by artists, for artists.{' '}
      </p>
      <p>
        ©{' '}
        <a href="https://theosis.1000Fans.xyz" target="_blank" rel="noopener noreferrer">
          1000Fans.xyz
        </a>
        , {new Date().getFullYear()}.
      </p>
      <button
        onClick={toggleTheme}
        aria-label="Toggle dark mode"
        className={`${styles['theme-toggle']} ${styles['theme-toggle-footer']}`}
      >
        <i className={`bi ${theme === 'dark' ? 'bi-sun-fill' : 'bi-moon-fill'}`}></i>
      </button>
    </footer>
  );
};

export default Footer;