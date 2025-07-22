// 1000fans/frontend/src/pages/console/index.js
import { useState, useEffect, useContext } from 'react';
import { NearContext } from '../../wallets/near';
import styles from '../../styles/console.module.css';

const CONTRACT = 'theosis.1000fans.near';
const NEAR_AI_AUTH_OBJECT_STORAGE_KEY = 'NearAIAuthObject';
const NEAR_AI_BASE_URL = 'https://api.near.ai';
const PROXY_BASE_URL = 'https://proxy.1000fans.xyz';

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
  const [isGroupMember, setIsGroupMember] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

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
          setShowLoginPrompt(false);
          window.location.hash = '';
          console.log('Updated authToken from callback:', { account_id: authObject.account_id });
        }
      } catch (e) {
        console.error('Callback handling error:', e);
        setError('Failed to process login callback: ' + e.message);
      }
    }
    handleNearAILoginCallback();
  }, []);

  // Generate NEAR AI auth token for authenticated users
  useEffect(() => {
    async function generateAuthToken() {
      if (!wallet || !signedAccountId) return;
      const storedAuth = localStorage.getItem(NEAR_AI_AUTH_OBJECT_STORAGE_KEY);
      if (storedAuth) {
        const authObject = JSON.parse(storedAuth);
        if (authObject.account_id === signedAccountId && authObject.signature) {
          setAuthToken(JSON.stringify(authObject));
          setShowLoginPrompt(false);
          console.log('Using stored authToken:', { account_id: authObject.account_id });
          return;
        }
      }
      try {
        if (!wallet.signMessage) {
          throw new Error('Wallet does not support message signing. Please use MyNEARWallet.');
        }
        const nonce = String(Date.now()).padStart(32, '0');
        const recipient = 'near.ai';
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
        setShowLoginPrompt(false);
        console.log('Generated authToken:', { account_id: authObject.account_id });
      } catch (e) {
        console.error('Auth token generation error:', e);
        setError('Failed to authenticate with NEAR AI: ' + e.message);
      }
    }
    generateAuthToken();
  }, [signedAccountId, wallet]);

  // Check user status (token ownership and group membership)
  useEffect(() => {
    const checkUserStatus = async () => {
      if (!signedAccountId || !wallet) return;
      setIsCheckingToken(true);
      try {
        const response = await fetch('/api/auth/check-for-account', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accountId: signedAccountId }),
        });
        const data = await response.json();
        if (data.exists) {
          setOwnsToken(!!data.tokenId);
          setTokenId(data.tokenId || '');
          setShowLoginPrompt(!data.isGroupMember);
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: [{ text: { value: `Welcome! Account ${signedAccountId} ${data.tokenId ? `owns token ${data.tokenId}` : 'has no token'}${data.isGroupMember ? ' and is a member of theosis group.' : '.'}` } }],
          }]);
        } else {
          setError('User not found in database. Please log out and log in again.');
        }
      } catch (error) {
        console.error('Error checking user status:', error);
        setError('Failed to verify user status: ' + error.message);
      } finally {
        setIsCheckingToken(false);
      }
    };
    checkUserStatus();
  }, [signedAccountId, wallet]);

  // Create thread (authenticated or anonymous)
  useEffect(() => {
    async function createThread() {
      const isAuthenticated = !!authToken && !!signedAccountId;
      const baseUrl = isAuthenticated ? NEAR_AI_BASE_URL : PROXY_BASE_URL;
      const endpoint = isAuthenticated ? '/v1/threads' : '/threads';
      try {
        console.log(`Creating thread via ${baseUrl}${endpoint}`);
        const response = await fetch(`${baseUrl}${endpoint}`, {
          method: 'POST',
          headers: {
            ...(isAuthenticated && { 'Authorization': `Bearer ${authToken}` }),
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            messages: [
              {
                content: 'Initial message',
                role: 'user',
                metadata: { user_id: signedAccountId || 'anonymous.1000fans.near' },
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
        setError(null);
      } catch (e) {
        console.error('Thread creation error:', e);
        setError('Failed to create thread: ' + e.message + '. Please try again or check proxy server.');
      }
    }
    createThread();
  }, [authToken, signedAccountId]);

  // Poll thread messages
  useEffect(() => {
    if (!threadId) return;
    const isAuthenticated = !!authToken && !!signedAccountId;
    const baseUrl = isAuthenticated ? NEAR_AI_BASE_URL : PROXY_BASE_URL;
    const endpoint = isAuthenticated ? `/v1/threads/${threadId}/messages` : `/threads/${threadId}/messages`;
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`${baseUrl}${endpoint}`, {
          headers: {
            ...(isAuthenticated && { 'Authorization': `Bearer ${authToken}` }),
            'Accept': 'application/json',
          },
          credentials: 'include',
        });
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Failed to fetch messages:', { status: response.status, errorText });
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        const threadMessages = await response.json();
        const filteredMessages = threadMessages.data.filter(msg => {
          if (msg.role === 'user') return true;
          if (msg.role === 'assistant') {
            console.log(`Message:`, { role: msg.role, content: msg.content[0].text.value, metadata: msg.metadata });
            return !msg.metadata?.message_type || !msg.metadata.message_type.startsWith('system:');
          }
          return false;
        });
        setMessages(filteredMessages);
        if (filteredMessages.some(msg => msg.content[0].text.value.includes('Please log in'))) {
          setShowLoginPrompt(true);
        }
      } catch (e) {
        console.error('Message polling error:', e);
        setError(`Failed to fetch messages: ${e.message}`);
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [threadId, authToken, signedAccountId]);

  // Send user message
  const sendMessage = async () => {
    if (!userInput.trim()) return;
    setIsLoading(true);
    setError(null);

    const restrictedCommands = [
      'verify wallet', 'transfer token', 'register group', 'upload file', 'list files', 'retrieve file',
    ];
    if (!signedAccountId && restrictedCommands.some(cmd => userInput.toLowerCase().includes(cmd))) {
      setError('Please connect a wallet to use this command.');
      setShowLoginPrompt(true);
      setIsLoading(false);
      return;
    }

    try {
      if (userInput.toLowerCase().includes('login with email')) {
        await loginWithProvider('email_passwordless', {
          loginHint: prompt('Enter your email address:'),
        });
        setMessages([
          ...messages,
          { role: 'assistant', content: [{ text: { value: 'Email login initiated. Account created or restored.' } }] },
        ]);
        setUserInput('');
        setShowLoginPrompt(false);
        return;
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
        setShowLoginPrompt(false);
        return;
      }
      if (userInput.toLowerCase().includes('create wallet')) {
        setError('Please create a wallet using Google, email, or NEAR Wallet via the login interface.');
        setShowLoginPrompt(true);
        setIsLoading(false);
        return;
      }
      if (!threadId) throw new Error('No thread available. Please wait for thread creation.');
      const isAuthenticated = !!authToken && !!signedAccountId;
      const baseUrl = isAuthenticated ? NEAR_AI_BASE_URL : PROXY_BASE_URL;
      const endpoint = isAuthenticated ? '/v1/agent/runs' : '/agent/runs';
      const managerAgentId = 'devbot.near/manager-agent/latest';
      console.log(`Running agent: ${managerAgentId} via ${baseUrl}${endpoint}`);
      const response = await fetch(`${baseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          ...(isAuthenticated && { 'Authorization': `Bearer ${authToken}` }),
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          agent_id: managerAgentId,
          thread_id: threadId,
          new_message: userInput,
          max_iterations: 1,
          record_run: true,
          tool_resources: {},
          user_env_vars: { user_id: signedAccountId || 'anonymous.1000fans.near' },
        }),
      });
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Agent run error:', { status: response.status, errorText });
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      const run = await response.json();
      console.log('Agent run initiated:', run);
      setUserInput('');
    } catch (e) {
      console.error('Send message error:', e);
      setError(`Failed to send message: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Drag and drop file upload (restricted to authenticated users)
  const handleDrop = async (e) => {
    e.preventDefault();
    setIsDragActive(false);
    if (!signedAccountId) {
      setError('Please connect a wallet to upload files.');
      setShowLoginPrompt(true);
      return;
    }
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
        const response = await fetch(`${NEAR_AI_BASE_URL}/v1/files`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${authToken}` },
          body: formData,
        });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${await response.text()}`);
        }
        const fileData = await response.json();
        const msgResponse = await fetch(`${NEAR_AI_BASE_URL}/v1/threads/${threadId}/messages`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
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
  const welcomeText = `Hi! 👋 Welcome to 1000fans!
1000fans is a platform for producers to share their music and videos exclusively with their fans.
It is built with blockchain & AI for a seamless control of your enhanced privacy.`;

  return (
    <main className={styles.consoleMain}>
      <div className={styles.consoleStatus}>
        {!signedAccountId ? (
          <p>Login to chat with the AI and access exclusive content.</p>
        ) : (
          <>
            <p>Connected as: {signedAccountId}</p>
            <p>Token Status: {ownsToken ? `Owns Token ID: ${tokenId}` : 'No token owned'}</p>
          </>
        )}
        {/*{error && <p className={styles.consoleError}>{error}</p>}*/}
      </div>
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
                <strong>{msg.role === 'user' ? 'You' : 'Assistant'}:</strong> {msg.content[0].text.value}
              </div>
            ))
          )}
        </div>
        {showLoginPrompt && !signedAccountId && (
          <div className={styles.consolePrompt}>
            Exploring as a guest? Log in with Google, email, or NEAR Wallet to access exclusive content!
            <button onClick={() => window.dispatchEvent(new Event('openLoginModal'))}>
              Login
            </button>
          </div>
        )}
        <div className={styles.consoleChatInput}>
          <input
            type="text"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder="Type 'commands' to explore available commands."
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
      {/* Uncomment the following block to enable drag and drop file upload */}
      {/*
      <div
        className={styles.consoleDragDrop}
        onDragEnter={(e) => { e.preventDefault(); setIsDragActive(true); }}
        onDragLeave={(e) => { e.preventDefault(); setIsDragActive(false); }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        {isDragActive ? 'Drop files here' : 'Drag and drop .mp3/.mp4 files here (authenticated users only)'}
      </div>*/}
    </main>
  );
}