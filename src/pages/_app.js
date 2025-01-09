import { useEffect, useState } from 'react';
import Head from 'next/head'; // metadata
import Footer from '@/components/footer';
import '@/styles/globals.css';
import { Navigation } from '@/components/navigation';
import { Wallet, NearContext } from '@/wallets/near';
import { NetworkId } from '@/config';
import Link from 'next/link';
import styles from '../styles/app.module.css';

// wallet instance
const wallet = new Wallet({ networkId: NetworkId });

// optional: create an access key so the user doesnt need to sign transactions.
/*
const wallet = new Wallet({ 
  networkId: NetworkId, // replace with your network id
  createAccessKeyFor: HelloNearContract //replace with your contract name
}); 
*/

export default function MyApp({ Component, pageProps }) {
  const [signedAccountId, setSignedAccountId] = useState('');

  useEffect(() => { 
    wallet.startUp(setSignedAccountId) 
  }, []);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (savedTheme) {
      document.documentElement.setAttribute('data-theme', savedTheme);
    } else if (prefersDark) {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.setAttribute('data-theme', 'light');
    }
  }, []);

  return (
    <>
      <Head>
        <title>Theosis Fans</title>
        <meta name="description" content="Exclusive content for Theosis fans" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {/* Add any other meta tags here */}
      </Head>
      <NearContext.Provider value={{ wallet, signedAccountId }}>
        <Navigation />
        <div className="main">
          <Component {...pageProps} />
        </div>
        <Footer />
      </NearContext.Provider>
    </>
  );
}
