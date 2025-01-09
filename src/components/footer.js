// components/footer.js
import React from 'react';
import styles from '../styles/app.module.css';

const Footer = () => {
  const toggleTheme = () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    document.documentElement.setAttribute('data-theme', currentTheme === 'dark' ? 'light' : 'dark');
    localStorage.setItem('theme', currentTheme === 'dark' ? 'light' : 'dark');
  };

  return (
    <footer className={styles.footer}>
      <p>
        Made by artists, for artists. {' '}
        © 
        <a href="https://1000Fans.xyz" target="_blank" rel="noopener noreferrer">
          1000Fans.xyz
        </a>{', '}
        {new Date().getFullYear()}.
      </p>
      <button onClick={toggleTheme} aria-label="Toggle dark mode" className={`${styles['theme-toggle']} ${styles['theme-toggle-footer']}`}>
        <i className="bi bi-moon-fill"></i>
      </button>
    </footer>
  );
};

export default Footer;