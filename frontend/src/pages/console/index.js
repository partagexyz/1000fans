import { useState, useEffect, useContext } from 'react';
import { NearContext } from '../../wallets/near';
import styles from '../../styles/app.module.css';

// Contract address
const CONTRACT = '1000fans.testnet';

export default function Console() {
  const { signedAccountId, wallet } = useContext(NearContext);
  const [ownsToken, setOwnsToken] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [receiverId, setReceiverId] = useState('');
  const [tokenId, setTokenId] = useState('');
  const [isDragActive, setIsDragActive] = useState(false);
  const [files, setFiles] = useState([]);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (signedAccountId && wallet) {
      checkTokenOwnership();
    }
  }, [signedAccountId, wallet]);

  const checkTokenOwnership = async () => {
    if (!wallet) return;
    try {
      const tokenInfo = await wallet.viewMethod({
        contractId: CONTRACT,
        method: 'nft_tokens_for_owner',
        args: { 
          account_id: signedAccountId, 
          from_index: null, 
          limit: 1 
        },
      });
      const ownsToken = tokenInfo.length > 0;
      setOwnsToken(ownsToken);
      if (ownsToken) {
        // set the token_id if a token is owned
        setTokenId(tokenInfo[0].token_id);
      } else {
        setTokenId('');
      }
      setIsLoading(false);
    } catch (error) {
      console.error('Error checking token ownership:', error);
      setError('Failed to check token ownership');
      setIsLoading(false);
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
          token_owner_id: signedAccountId,
          token_metadata: {
            title: "Exlusive Fans Token",
            description: "Your exclusive fans token to access exclusive content from the fans club",
          },
        },
        deposit: '100000000000000000000000', // 0.1 NEAR in yoctoNEAR for storage cost - adjust this based on your contract's requirements
      });
      alert('Fans Token minted to your wallet!');
      await checkTokenOwnership(); //refresh ownership status
    } catch (error) {
      console.error('Error minting fans token:', error);
      setError('Failed to mint fans token. Try again later');
    } finally {
    setIsLoading(false); // ensure isLoading is set back to false
    }
  };

  const transferNFT = async () => {
    if (!wallet || !ownsToken || !tokenId) return;
    setIsLoading(true);
    setError(null);
    try {
      await wallet.callMethod({
        contractId: CONTRACT,
        method: 'nft_transfer',
        args: { 
          receiver_id: receiverId,
          token_id: tokenId,
          approval_id: null, // optional approval ID
          memo: 'Transfer fans token from the console',
        },
        deposit: '1', // minimal deposit required for transfer
      });
      alert('Fans Token transferred successfully!');
      await checkTokenOwnership(); //refresh ownership status
    } catch (error) {
      console.error('Error transferring fans token:', error);
      setError('Failed to transfer your fans token. Check receiver ID or try again later');
    }
    setIsLoading(false);
  }

  const handleDrag = (e) => {
    e.preventDefault();
    setIsDragActive(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragActive(false);
    const droppedFiles = Array.from(e.dataTransfer.files);

    if (droppedFiles.some(file => file.size > 25 * 1024 * 1024 * 1024 || !['mp3', 'mp4'].includes(file.name.split('.').pop().toLowerCase()))) {
      alert('Files must be .mp3 or .mp4 and not exceed 25GB');
      return;
    }

    setFiles(prevFiles => [...prevFiles, ...droppedFiles]);
  };

  const handleUpload = async () => {
    if (!files.length) return;
    const formData = new FormData();
    for (let file of files) {
      if (allowedFile(file.name)) {
        formData.append('files', file);
      } else {
        console.error(`${file.name} is not a supported file type.`);
      }
    }
    if (formData.getAll('files').length === 0) {
      setError('No valid files to upload.');
      return;
    }
    setUploading(true);
    try {
      const response = await fetch('https://theosis.1000fans.xyz/api/run_automation', {
        method: 'POST',
        body: formData
      });
      if (response.ok) {
        alert('Upload successful!');
        setFiles([]);
      } else {
        setError('Upload failed: ' + await response.text());
      }
    } catch (error) {
      setError('Upload error: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  function allowedFile(filename) {
    const allowedExtensions = ['mp3', 'mp4'];
    return allowedExtensions.includes(filename.split('.').pop().toLowerCase());
  }

  return (
    <main className={styles.main}>
      <div style={{ marginTop: '0rem' }}> {/* Add space to move content down */}
        <div className={styles.center}>
          {!signedAccountId ? (
            <h1>Please login to check your fans token</h1>
          ) : (
            <h1 className={styles.noMarginBottom}>Do you own a fans token? {ownsToken ? `Yes: ${tokenId}` : 'No'}</h1>
          )}
        </div>
        <div className={`${styles.center} ${styles.shopContainer}`}>
          {signedAccountId && (
            <>
              {!ownsToken ? (
                <div className={styles.shopSection}>
                  <h2>Claim your Fans Token</h2>
                  <button onClick={mintNFT} disabled={isLoading}>
                    {isLoading ? 'Minting...' : 'Claim your fans token'}
                  </button>
                </div>
              ) : (
                <div className={styles.shopSection} style={{ marginTop: '-100px' }}>
                  <div>
                    <h2>Transfer your Fans Token</h2>
                    <input
                      type="text"
                      placeholder="Receiver ID"
                      value={receiverId}
                      onChange={(e) => setReceiverId(e.target.value)}
                    />
                    <button onClick={transferNFT} disabled={isLoading || !receiverId}>
                      {isLoading ? 'Transferring...' : 'Transfer Your Fans Token'}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
          {error && <p style={{ color: 'red' }}>{error}</p>}
        </div>
      </div>
      <div className={styles.center} style={{ marginTop: '5rem' }}>
        {signedAccountId === CONTRACT && ( // try with CONTRACT directly if this doesn't work
          <div className={styles.shopSection}>
            <h2>Upload Files</h2>
            <div 
              onDragEnter={handleDrag}
              onDragLeave={handleDragLeave}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              style={{
                border: `2px dashed ${isDragActive ? 'green' : 'gray'}`,
                padding: '20px',
                textAlign: 'center',
                marginBottom: '10px'
              }}
            >
              {isDragActive ? 'Drop files here' : 'Drag and drop files here or click to select'}
            </div>
            <button onClick={handleUpload} disabled={files.length === 0 || uploading}>
              {uploading ? 'Uploading...' : 'Upload Files'}
            </button>
            {uploading && <p>Do not close or refresh this window until upload is complete.</p>}
            {uploadProgress !== null && <p>Upload Progress: {uploadProgress}%</p>}
          </div>
        )}
      </div>
    </main>
  );
}