import { useState, useEffect, useContext } from 'react';
import { NearContext } from '@/wallets/near';
import styles from '@/styles/app.module.css';

// Contract that the app will interact with
const CONTRACT = 'partage-lock.testnet'; // replace with your contract name

export default function Shop() {
  const { signedAccountId, wallet } = useContext(NearContext);
  const [tokenId, setTokenId] = useState('');
  const [tokenMetadata, setTokenMetadata] = useState({ title: '', description: '' });
  const [ownsToken, setOwnsToken] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (signedAccountId && wallet) {
      checkTokenOwnership();
    }
  }, [signedAccountId, wallet]);

  const checkTokenOwnership = async () => {
    if (!wallet) return;
    try {
      const result = await wallet.ownsToken(signedAccountId, CONTRACT);
      setOwnsToken(result);
    } catch (error) {
      console.error('Error checking token ownership:', error);
      setError('Failed to check token ownership');
    }
  };

  const mintNFT = async () => {
    if (!wallet || !signedAccountId) return;
    setIsLoading(true);
    setError(null);
    try {
      await wallet.callMethod({
        contractId: CONTRACT,
        method: 'nft_mint',
        args: { 
          token_id: tokenId, 
          token_owner_id: signedAccountId,
          metadata: tokenMetadata,
        },
        deposit: '100000000000000000000000', // 0.1 NEAR in yoctoNEAR for storage cost - adjust this based on your contract's requirements
      });
      alert('Fans Token on its way to your wallet!');
      checkTokenOwnership(); //refresh ownership status
    } catch (error) {
      console.error('Error minting fans token:', error);
      setError('Failed to mint fans token. check token ID or try again later');
    }
    setIsLoading(false);
  };

  const transferNFT = async (tokenId, receiverId) => {
    if (!wallet) return;
    setIsLoading(true);
    setError(null);
    try {
      await wallet.callMethod({
        contractId: CONTRACT,
        method: 'nft_transfer',
        args: { 
          token_id: tokenId, 
          receiver_id: receiverId,
          approval_id: null, // optional approval ID
          memo: 'Transfer fans token from shop',
        },
        deposit: '1', // minimal deposit required for transfer
      });
      alert('Fans Token transferred successfully!');
      checkTokenOwnership(); //refresh ownership status
    } catch (error) {
      console.error('Error transferring fans token:', error);
      setError('Failed to transfer fans token. Check receiver ID or try again later');
    }
    setIsLoading(false);
  }

  return (
    <main className={styles.main}>
      <div className={styles.center}>
      <h1> Get your Fans Token!</h1>
      </div>
      <div className={`${styles.center} ${styles.shopContainer}`}>
        {signedAccountId ? (
          <>
            <div className={styles.shopSection}>
              <h2>Mint a Fans Token</h2>
              <input
                type="text"
                placeholder="Token ID"
                value={tokenId}
                onChange={(e) => setTokenId(e.target.value)}
              />
              <input
                type="text"
                placeholder="Token Title"
                value={tokenMetadata.title}
                onChange={(e) => setTokenMetadata({ ...tokenMetadata, title: e.target.value })}
              />
              <input
                type="text"
                placeholder="Token Description"
                value={tokenMetadata.description}
                onChange={(e) => setTokenMetadata({ ...tokenMetadata, description: e.target.value })}
              />
              <button onClick={mintNFT} disabled={isLoading}>
                {isLoading ? 'Minting...' : 'Mint Fans Token'}
              </button>
            </div>
            <div className={styles.shopSection}>
              <h2>Transfer a Fans Token</h2>
              <input
                type="text"
                placeholder="Token ID"
              />
              <input
                type="text"
                placeholder="Receiver ID"
              />
              <button onClick={() => transferNFT(tokenId, receiverId)} disabled={isLoading}>
                {isLoading ? 'Transferring...' : 'Transfer Fans Token'}
              </button>
            </div>
            <div className={styles.shopSection}>
              <h2>Token Ownership Check</h2>
              <p>Do you own a fans token? {ownsToken? 'Yes' : 'No'}</p>
            </div>
          </>
        ) : (
          <p>Please login to mint or transfer fans tokens</p>
        )}
        {error && <p style={{ color: 'red' }}>{error}</p>}
      </div>
    </main>
  );
}