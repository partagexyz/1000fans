// 1000fans/frontend/src/pages/_app.js
import { useEffect, useState } from 'react';
import Head from 'next/head'; // metadata
import Footer from '../components/footer';
import '../styles/globals.css';
import { Navigation } from '../components/navigation';
import { Wallet, NearContext } from '../wallets/near';
import { NetworkId } from '../config';

// wallet instance
const wallet = new Wallet({ networkId: NetworkId, createAccessKeyFor: 'theosis.1000fans.near' });

// optional: create an access key so the user doesnt need to sign transactions.
/*
const wallet = new Wallet({ 
  networkId: NetworkId, // replace with your network id
  createAccessKeyFor: HelloNearContract //replace with your contract name
}); 
*/

export default function MyApp({ Component, pageProps }) {
  const [signedAccountId, setSignedAccountId] = useState('');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => { 
    wallet.startUp(setSignedAccountId) 
  }, []);

  useEffect(() => {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
  }, []);

  // remove logo on mobile
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    handleResize(); // Check on initial render
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
          <Component {...pageProps} />
        </div>
        <Footer />
      </NearContext.Provider>
    </>
  );
}