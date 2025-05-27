// 1000fans/frontend/src/pages/console/index.js
import { useState, useEffect, useContext } from 'react';
import { NearContext } from '../../wallets/near';
import { NetworkId } from '../../config';
import styles from '../../styles/console.module.css';

const CONTRACT = 'theosis.1000fans.near';
const NEAR_AI_AUTH_OBJECT_STORAGE_KEY = 'NearAIAuthObject';
const BASE_URL = 'https://api.near.ai';

export default function Console() {
  const { signedAccountId, wallet, loginWithProvider, logout } = useContext(NearContext);
  const [authToken, setAuthToken] = useState(null);
  const [threadId, setThreadId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [ownsToken, setOwnsToken] = useState(false);
  const [tokenId, setTokenId] = useState('');
  const [isDragActive, setIsDragActive] = useState(false);

  // Handle NEAR AI login callback
  useEffect(() => {
    async function handleNearAILoginCallback() {
      try {
        const callbackParams = new URLSearchParams(window.location.hash.replace('#', ''));
        const accountId = callbackParams.get('accountId');
        if (accountId) {
          const authObject = JSON.parse(localStorage.getItem(NEAR_AI_AUTH_OBJECT_STORAGE_KEY) || '{}');
          authObject.account_id = accountId;
          authObject.signature = callbackParams.get('signature');
          authObject.public_key = callbackParams.get('publicKey');
          localStorage.setItem(NEAR_AI_AUTH_OBJECT_STORAGE_KEY, JSON.stringify(authObject));
          setAuthToken(JSON.stringify(authObject));
          window.location.hash = '';
          console.log('Updated authToken from callback:', authObject);
        }
      } catch (e) {
        console.error('Callback handling error:', e);
        setError('Failed to process login callback: ' + e.message);
      }
    }
    handleNearAILoginCallback();
  }, []);

  // Generate NEAR AI auth token
  useEffect(() => {
    async function generateAuthToken() {
      if (!wallet) return; // Wait for wallet initialization
      if (!signedAccountId) {
        setError(null);
        return;
      }
      const storedAuth = localStorage.getItem(NEAR_AI_AUTH_OBJECT_STORAGE_KEY);
      if (storedAuth) {
        const authObject = JSON.parse(storedAuth);
        if (authObject.account_id === signedAccountId && authObject.signature) {
          setAuthToken(JSON.stringify(authObject));
          console.log('Using stored authToken:', authObject);
          return;
        }
      }
      try {
        if (!wallet.signMessage) {
          throw new Error('Wallet does not support message signing. Please use MyNEARWallet.');
        }
        const nonce = String(Date.now()).padStart(32, '0');
        const recipient = 'near.ai'; // NEAR AI Hub recipient
        const callbackUrl = window.location.href.split('?')[0];
        const message = 'Welcome to NEAR AI Hub!';
        const authObject = {
          message,
          nonce,
          recipient,
          callback_url: callbackUrl,
          signature: null,
          account_id: signedAccountId,
          public_key: null,
        };
        localStorage.setItem(NEAR_AI_AUTH_OBJECT_STORAGE_KEY, JSON.stringify(authObject));
        const nonceBuffer = Buffer.from(new TextEncoder().encode(nonce));
        const signedMessage = await wallet.signMessage({
          message,
          nonce: nonceBuffer,
          recipient,
          callbackUrl,
        });
        authObject.signature = signedMessage.signature;
        authObject.public_key = signedMessage.publicKey;
        localStorage.setItem(NEAR_AI_AUTH_OBJECT_STORAGE_KEY, JSON.stringify(authObject));
        setAuthToken(JSON.stringify(authObject));
        console.log('Generated authToken:', authObject);
      } catch (e) {
        console.error('Auth token generation error:', e);
        setError('Failed to authenticate with NEAR AI: ' + e.message);
      }
    }
    generateAuthToken();
  }, [signedAccountId, wallet]);

  // Token ownership check (NEAR blockchain)
  useEffect(() => {
    const checkTokenOwnership = async () => {
      if (!signedAccountId || !wallet) return;
      try {
        const tokenInfo = await wallet.viewMethod({
          contractId: CONTRACT,
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

  // Create thread
  useEffect(() => {
    async function createThread() {
      if (!authToken) {
        console.log('No authtoken, skipping thread creation');
        return;
      }
      try {
        console.log('Creating NEAR AI thread with auth token:', authToken);
        const response = await fetch(`${BASE_URL}/v1/threads`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({
            messages: [
              {
                content: 'Initial message',
                role: 'user',
                metadata: {},
              },
            ],
          }),
        });
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Thread creation response:', errorText);
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        const thread = await response.json();
        console.log('Thread created, ID:', thread.id);
        setThreadId(thread.id);
      } catch (e) {
        console.error('Thread creation error:', e);
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
        const response = await fetch(`${BASE_URL}/v1/threads/${threadId}/messages?order=asc`, {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Accept': 'application/json',
          },
        });
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Failed to fetch messages:', errorText);
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        const threadMessages = await response.json();
        setMessages(threadMessages.data);
      } catch (e) {
        console.error('Message polling error:', e);
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
      if (userInput.toLowerCase().includes('logout')) {
        await logout();
        setMessages([
          ...messages,
          { role: 'assistant', content: [{ text: { value: 'Logged out successfully.' } }] },
        ]);
        setUserInput('');
        localStorage.removeItem(NEAR_AI_AUTH_OBJECT_STORAGE_KEY);
        setAuthToken(null);
        setThreadId(null);
        return;
      }
      if (!threadId) throw new Error('No thread available.');
      const managerAgentId = NetworkId === 'mainnet' ? 'devbot.near/manager-agent/latest' : 'devbot.near/manager-agent/0.0.27';
      const response = await fetch(`${BASE_URL}/v1/agent/runs`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          agent_id: managerAgentId,
          thread_id: threadId,
          new_message: userInput,
          max_iterations: 1,
          record_run: true,
          tool_resources: {},
          user_env_vars: {},
        }),
      });
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Agent run error:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      const run = await response.json();
      console.log('Agent run initiated:', run);
      if (userInput.toLowerCase().includes('create wallet')) {
        const threadMessagesResponse = await fetch(`${BASE_URL}/v1/threads/${threadId}/messages?order=asc`, {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Accept': 'application/json',
          },
        });
        if (!threadMessagesResponse.ok) {
        const errorText = await threadMessagesResponse.text();
        console.error('Thread messages error:', errorText);
        throw new Error(`HTTP ${threadMessagesResponse.status}: ${errorText}`);
      }
      const threadMessages = await threadMessagesResponse.json();
      const latestMessage = threadMessages.data.find(
        m => m.role === 'assistant' && m.content[0].text.value.includes('Wallet created')
      );
      if (latestMessage && latestMessage.file_ids?.length) {
        const filesResponse = await fetch(`${BASE_URL}/v1/threads/${threadId}/messages/${latestMessage.id}/files`, {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Accept': 'application/json',
          },
        });
        if (!filesResponse.ok) {
          const errorText = await filesResponse.text();
          console.error('Files fetch error:', errorText);
          throw new Error(`HTTP ${filesResponse.status}: ${errorText}`);
        }
        const files = await filesResponse.json();
        const credentialsFile = files.data.find(f => f.filename === 'wallet_credentials.json');
        if (credentialsFile) {
          const fileResponse = await fetch(`${BASE_URL}/v1/files/${credentialsFile.id}/content`, {
            headers: {
              'Authorization': `Bearer ${authToken}`,
              'Accept': 'application/json',
            },
          });
          if (!fileResponse.ok) {
            const errorText = await fileResponse.text();
            console.error('File content error:', errorText);
            throw new Error(`HTTP ${fileResponse.status}: ${errorText}`);
          }
          const credentials = JSON.parse(await fileResponse.text());
          alert(
            `New wallet created! Account ID: ${credentials.account_id}. Save your private key securely: ${credentials.private_key}`
          );
        }
      }
    }
    setUserInput('');
  } catch (e) {
    console.error('Send message error:', e);
    setError('Failed to send message: ' + e.message);
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
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${await response.text()}`);
          }
          const fileData = await response.json();
          const msgResponse = await fetch(`https://api.near.ai/v1/threads/${threadId}/messages`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            role: 'user',
            content: `Uploaded file: ${file.name}`,
            file_ids: [fileData.id],
          }),
        });
        if (!msgResponse.ok) {
          throw new Error(`HTTP ${msgResponse.status}: ${await msgResponse.text()}`);
        }
      }
      await sendMessage('upload file');
    } catch (e) {
      setError('Failed to upload files: ' + e.message);
    }
  };

  // Welcoming text
const welcomeText = `Hi ! Welcome to 1000fans!
1000fans is a platform that allows producers to share their audio and video in private with their fans.
It is built with blockchain encryption at core and AI agents to make it easy to use.
You can chat with the AI assistant to get help with your account, upload files, or manage your content
`;

  return (
    <main className={styles.consoleMain}>
      {/* Wallet and Token Status */}
      <div className={styles.consoleStatus}>
        {!signedAccountId ? (
          <p>Connect your wallet for exclusive content.</p>
        ) : (
          <>
            <p>Connected as: {signedAccountId}</p>
            <p> Token Status: {ownsToken ? `Owns Token ID: ${tokenId}` : 'No token owned'}</p>
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
            placeholder="Type 'list' to chat with the AI."
            disabled={isLoading || !threadId}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          />
          <button
            onClick={sendMessage}
            disabled={isLoading || !userInput.trim() || !threadId}
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