// components/footer.js
import React, { useState, useEffect } from 'react';
import styles from '@/styles/app.module.css';

const Footer = () => {
  const [currentTheme, setCurrentTheme] = useState('light');

  useEffect(() => {
    const savedTheme = document.documentElement.getAttribute('data-theme') || 'light';
    setCurrentTheme(savedTheme);
  }, []);

  const toggleTheme = () => {
    console.log('Current theme:', currentTheme);
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    console.log('Setting new theme:', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    setCurrentTheme(newTheme);
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
        <i className={`bi ${currentTheme === 'dark' ? 'bi-sun-fill' : 'bi-moon-fill'}`}></i>
      </button>
    </footer>
  );
};

export default Footer;