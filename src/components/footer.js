// components/footer.js
import React, { useState, useEffect } from 'react';
import styles from '@/styles/app.module.css';

const Footer = () => {
  const [currentTheme, setCurrentTheme] = useState('light');

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialTheme = savedTheme || (prefersDark ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', initialTheme);
    setCurrentTheme(initialTheme);
  }, [currentTheme]);

  const toggleTheme = () => {
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    setCurrentTheme(newTheme);
  
    // Disable transitions for immediate color change
    document.querySelectorAll('.card p').forEach(p => {
      p.style.transition = 'none';
      p.style.color = newTheme === 'light' ? 'black' : 'white';
      setTimeout(() => {
        p.style.transition = ''; // Reset transitions
      }, 0);
    });
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