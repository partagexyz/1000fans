import { useEffect, useState } from 'react';

import '@/styles/globals.css';
import { Navigation } from '@/components/navigation';

import { Wallet, NearContext } from '@/wallets/near';
import { NetworkId } from '@/config';

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

  useEffect(() => { wallet.startUp(setSignedAccountId) }, []);

  return (
    <NearContext.Provider value={{ wallet, signedAccountId }}>
      <Navigation />
      <Component {...pageProps} />
    </NearContext.Provider>
  );
}
