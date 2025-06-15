// 1000fans/frontend/src/pages/_app.js
import { useEffect, useState } from 'react';
import Head from 'next/head'; // metadata
import Footer from '../components/footer';
import '../styles/globals.css';
import { Navigation } from '../components/navigation';
import { Wallet, NearContext } from '../wallets/near';
import { NetworkId } from '../config';

const wallet = new Wallet({ networkId: NetworkId, createAccessKeyFor: 'theosis.1000fans.near' });

export default function MyApp({ Component, pageProps }) {
  const [signedAccountId, setSignedAccountId] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const [theme, setTheme] = useState('dark');

  useEffect(() => { 
    wallet.startUp(setSignedAccountId) 
  }, []);

  useEffect(() => {
    // Check for saved theme in localStorage, default to dark if none exists
    const savedTheme = localStorage.getItem('theme') || 'dark';
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  useEffect(() => {
    // Update localStorage and data-theme when theme changes
    localStorage.setItem('theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // remove logo on mobile
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Expose toggleTheme to child components (e.g., Footer)
  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === 'dark' ? 'light' : 'dark'));
  };

  return (
    <>
      <Head>
        <title>Theosis Fans</title>
        <meta name="description" content="Exclusive content for Theosis fans" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon-square.ico" type="image/ico" />
      </Head>
      <NearContext.Provider value={{ wallet, signedAccountId }}>
        <Navigation isMobile={isMobile} />
        <div className="main">
          <Component {...pageProps} theme={theme} toggleTheme={toggleTheme} />
        </div>
        <Footer theme={theme} toggleTheme={toggleTheme} />
      </NearContext.Provider>
    </>
  );
}