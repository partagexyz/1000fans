import { useState, useEffect, useContext } from 'react';
import { NearContext } from '../../wallets/near';
import styles from '../../styles/app.module.css';
import OpenAI from 'openai';
import * as nearAPI from 'near-api-js';

const CONTRACT = '1000fans.testnet';

export default function Console() {
  const { signedAccountId, wallet, loginWithProvider, logout, keyPair } = useContext(NearContext);
  const [authToken, setAuthToken] = useState(null);
  const [threadId, setThreadId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [ownsToken, setOwnsToken] = useState(false);
  const [tokenId, setTokenId] = useState('');
  const [isDragActive, setIsDragActive] = useState(false);
  const [agentTokenStatus, setAgentTokenStatus] = useState(null);

  const openai = new OpenAI({
    baseURL: 'https://api.near.ai/v1',
    apiKey: authToken ? `Bearer ${authToken}` : '',
    dangerouslyAllowBrowser: true, // Temporary for client-side testing
  });

  // Generate NEAR AI auth token
  useEffect(() => {
    async function generateAuthToken() {
      if (!signedAccountId) return;
      try {
        const nonce = String(Date.now());
        const recipient = 'ai.near';
        const callbackUrl = window.location.href;
        const message = 'Login to NEAR AI';

        let signedMessage;
        if (keyPair) {
          // Web3Auth user
          const messageBuffer = Buffer.from(message);
          const nonceBuffer = Buffer.from(nonce.padStart(32, '0'));
          const signed = keyPair.sign(Buffer.concat([messageBuffer, nonceBuffer]));
          signedMessage = {
            signature: Buffer.from(signed.signature).toString('base64'),
            publicKey: keyPair.getPublicKey().toString(),
            accountId: signedAccountId,
          };
        } else if (wallet) {
          // NEAR wallet user
          const { keyStores, connect } = nearAPI;
          const keyStore = new keyStores.BrowserLocalStorageKeyStore();
          const config = {
            networkId: 'testnet',
            keyStore,
            nodeUrl: 'https://rpc.testnet.near.org',
            walletUrl: 'https://wallet.testnet.near.org',
            helperUrl: 'https://helper.testnet.near.org',
          };
          const near = await connect(config);
          const account = await near.account(signedAccountId);
          const keyPair = await keyStore.getKey('testnet', signedAccountId);
          if (!keyPair) throw new Error('No key pair found for account');
          const messageBuffer = Buffer.from(message);
          const nonceBuffer = Buffer.from(nonce.padStart(32, '0'));
          const signed = keyPair.sign(Buffer.concat([messageBuffer, nonceBuffer]));
          signedMessage = {
            signature: Buffer.from(signed.signature).toString('base64'),
            publicKey: keyPair.getPublicKey().toString(),
            accountId: signedAccountId,
          };
        } else {
          throw new Error('No valid signing method available');
        }

        const auth = JSON.stringify({
          account_id: signedAccountId,
          public_key: signedMessage.publicKey,
          signature: signedMessage.signature,
          message,
          nonce,
          recipient,
          callbackUrl,
        });
        setAuthToken(auth);
      } catch (e) {
        setError('Failed to authenticate with NEAR AI: ' + e.message);
      }
    }
    generateAuthToken();
  }, [signedAccountId, wallet, keyPair]);

  // Primary token ownership check (NEAR blockchain)
  useEffect(() => {
    const checkTokenOwnership = async () => {
      if (!signedAccountId || !wallet) return;
      try {
        const tokenInfo = await wallet.viewMethod({
          contractId: '1000fans.testnet',
          method: 'nft_tokens_for_owner',
          args: {
            account_id: signedAccountId,
            from_index: null,
            limit: 1,
          },
        });
        const ownsToken = tokenInfo.length > 0;
        setOwnsToken(ownsToken);
        setTokenId(ownsToken ? tokenInfo[0].token_id : '');
      } catch (e) {
        console.error('Error checking token ownership:', e);
        setError('Failed to check token ownership: ' + e.message);
      }
    };
    checkTokenOwnership();
  }, [signedAccountId, wallet]);

  // Secondary token ownership check (NEAR AI agentic system)
  useEffect(() => {
    if (!threadId || !authToken) return;
    const interval = setInterval(async () => {
      try {
        console.log('Checking agent token status for threadId:', threadId);
        const files = await openai.beta.threads.files.list(threadId);
        const authFile = files.data.find(f => f.filename === 'auth_status.json');
        if (authFile) {
          const fileContent = await openai.files.content(authFile.id);
          const authStatus = JSON.parse(await fileContent.text());
          setAgentTokenStatus(authStatus.authorized);
        } else {
          setAgentTokenStatus(false);
        }
      } catch (e) {
        console.error('Error checking agent token status:', e);
        setAgentTokenStatus(null); // Indicate check failed
      }
    }, 10000); // Run every 10 seconds to reduce load
    return () => clearInterval(interval);
  }, [threadId, authToken]);

  // Create thread
  useEffect(() => {
    async function createThread() {
      if (!authToken) return;
      try {
        const thread = await openai.beta.threads.create();
        setThreadId(thread.id);
      } catch (e) {
        setError('Failed to create thread: ' + e.message);
      }
    }
    createThread();
  }, [authToken]);

  // Poll thread messages
  useEffect(() => {
    if (!threadId || !authToken) return;
    const interval = setInterval(async () => {
      try {
        const threadMessages = await openai.beta.threads.messages.list(threadId);
        setMessages(threadMessages.data.reverse());
      } catch (e) {
        setError('Failed to fetch messages: ' + e.message);
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [threadId, authToken]);

  // Send user message
  const sendMessage = async () => {
    if (!userInput.trim()) return;
    setIsLoading(true);
    setError(null);
    try {
      // Handle email login command
      if (userInput.toLowerCase().includes('login with email')) {
        try {
          await loginWithProvider('email_passwordless', {
            loginHint: prompt('Enter your email address:'),
          });
          setMessages([
            ...messages,
            { role: 'assistant', content: [{ text: { value: 'Email login initiated. Account created or restored.' } }] },
          ]);
          setUserInput('');
          return;
        } catch (e) {
          throw new Error('Email login failed: ' + e.message);
        }
      }

      // Handle logout command
      if (userInput.toLowerCase().includes('logout')) {
        await logout();
        setMessages([
          ...messages,
          { role: 'assistant', content: [{ text: { value: 'Logged out successfully.' } }] },
        ]);
        setUserInput('');
        return;
      }

      // Send to NEAR AI
      if (!threadId) throw new Error('No thread available');
      await openai.beta.threads.messages.create(threadId, {
        role: 'user',
        content: userInput,
      });
      const run = await openai.beta.threads.runs.createAndPoll(threadId, {
        assistant_id: 'devbot.near/manager-agent/latest',
      });
      if (run.status !== 'completed') {
        throw new Error('Run failed: ' + run.status);
      }
      if (userInput.toLowerCase().includes('create wallet')) {
        const threadMessages = await openai.beta.threads.messages.list(threadId);
        const latestMessage = threadMessages.data.find(
          m => m.role === 'assistant' && m.content[0].text.value.includes('Wallet created')
        );
        if (latestMessage) {
          const files = await openai.beta.threads.messages.files.list(threadId, latestMessage.id);
          const credentialsFile = files.data.find(f => f.filename === 'wallet_credentials.json');
          if (credentialsFile) {
            const fileContent = await openai.files.content(credentialsFile.id);
            const credentials = JSON.parse(await fileContent.text());
            alert(
              `New wallet created! Account ID: ${credentials.account_id}. Save your private key securely: ${credentials.private_key}`
            );
          }
        }
      }
      setUserInput('');
    } catch (e) {
      setError('Failed to process request: ' + e.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Drag and drop file upload
  const handleDrop = async (e) => {
    e.preventDefault();
    setIsDragActive(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 10) {
        setError('Maximum 10 files per upload');
        return;
    }
    if (droppedFiles.some(file => file.size > 25 * 1024 * 1024 * 1024 || !['mp3', 'mp4'].includes(file.name.split('.').pop().toLowerCase()))) {
        setError('Files must be .mp3 or .mp4 and not exceed 25GB');
        return;
    }
    try {
        for (const file of droppedFiles) {
            const formData = new FormData();
            formData.append('file', file);
            const response = await fetch('https://api.near.ai/v1/files', {
                method: 'POST',
                headers: { Authorization: `Bearer ${authToken}` },
                body: formData,
            });
            const fileData = await response.json();
            await openai.beta.threads.messages.create(threadId, {
                role: 'user',
                content: `Uploaded file: ${file.name}`,
                file_ids: [fileData.id],
            });
        }
        await sendMessage('upload file');
    } catch (e) {
        setError('Failed to upload files: ' + e.message);
    }
  };

  // Welcoming text
  const welcomeText = `Hi! 👋 Welcome to 1000fans! 
  1000fans is a private content platform used by Theosis to provide fans with exclusive content.
  
  You can access the artist's music or videos by saying 'spotify' or 'youtube', or contact him by saying 'contact'.
  
  To access unreleased music and videos, connect your crypto wallet by typing 'connect wallet'.
  If you do not have a crypto wallet and want to create one, type 'create wallet'.
  
  Type 'list' to view all available commands.`;

  return (
    <main className={styles.consoleMain}>
      {/* Wallet and Token Status */}
      <div className={styles.consoleStatus}>
        {!signedAccountId ? (
          <p>Please log in with your NEAR wallet or use 'login with email' in the chat.</p>
        ) : (
          <>
            <p>Connected as: {signedAccountId}</p>
            <p> Token Status: {ownsToken ? `Owns Token ID: ${tokenId}` : 'No token owned'}</p>
            {agentTokenStatus !== null && (
              <p>Agent Token Status: {agentTokenStatus ? 'Token Detected' : 'No token detected'}</p>
            )}
          </>
        )}
        {error && <p className={styles.consoleError}>{error}</p>}
      </div>
      {/* Chat Interface */}
      <div className={styles.consoleChatContainer}>
        <div className={styles.consoleChatMessages}>
          {messages.length === 0 ? (
            <p className={styles.consolePlaceholder}>
            {welcomeText.split('\n').map((line, index) => (
              <span key={index} style={{ display: 'block', marginBottom: '0.5rem' }}>
                {line}
              </span>
            ))}
          </p>
          ) : (
            messages.map((msg, index) => (
              <div
                key={index}
                className={`${styles.consoleMessage} ${msg.role === 'user' ? styles.consoleUserMessage : styles.consoleAssistantMessage}`}
              >
                <strong>{msg.role === 'user' ? 'You' : 'Manager'}:</strong> {msg.content[0].text.value}
              </div>
            ))
          )}
        </div>
        <div className={styles.consoleChatInput}>
          <input
            type="text"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder="Type 'list' to view all available commands."
            disabled={isLoading}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          />
          <button
            onClick={sendMessage}
            disabled={isLoading || !userInput.trim()}
          >
            {isLoading ? 'Sending...' : 'Send'}
          </button>
        </div>
      </div>
      {/*Drag and Drop Area
      <div
      className={styles.consoleDragDrop}
        onDragEnter={(e) => { e.preventDefault(); setIsDragActive(true); }}
        onDragLeave={(e) => { e.preventDefault(); setIsDragActive(false); }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        {isDragActive ? 'Drop files here' : 'Drag and drop .mp3/.mp4 files here'}
      </div>*/}
    </main>
  );
}