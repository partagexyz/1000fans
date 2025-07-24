// 1000fans/frontend/src/pages/console/index.js
import { useState, useEffect, useContext } from 'react';
import { NearContext } from '../../wallets/near';
import styles from '../../styles/console.module.css';

const CONTRACT = 'theosis.1000fans.near';
const ACCESS_CONTROL_CONTRACT = 'theosis.devbot.near';
const NEAR_AI_AUTH_OBJECT_STORAGE_KEY = 'NearAIAuthObject';
const NEAR_AI_BASE_URL = 'https://api.near.ai';
const PROXY_BASE_URL = 'https://proxy.1000fans.xyz';
const CONTRACT_OWNERS = ['1000fans.near', 'theosis.1000fans.near'];

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
  const [lastSent, setLastSent] = useState(0);
  const [isContractOwner, setIsContractOwner] = useState(false);

  // Handle NEAR AI login callback
  useEffect(() => {
    async function handleNearAILoginCallback() {
      try {
        const callbackParams = new URLSearchParams(window.location.hash.replace('#', ''));
        const accountId = callbackParams.get('accountId');
        const publicKey = callbackParams.get('publicKey');
        if (accountId && publicKey) {
          const authObject = JSON.parse(localStorage.getItem(NEAR_AI_AUTH_OBJECT_STORAGE_KEY) || '{}');
          authObject.account_id = accountId;
          authObject.signature = callbackParams.get('signature');
          authObject.public_key = publicKey;
          localStorage.setItem(NEAR_AI_AUTH_OBJECT_STORAGE_KEY, JSON.stringify(authObject));
          setAuthToken(JSON.stringify(authObject));
          setShowLoginPrompt(false);
          // Clear query parameters to reduce page data
          window.history.replaceState({}, document.title, window.location.pathname);
          console.log('Updated authToken from callback:', { account_id: authObject.account_id });
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

  // Check token ownership, group membership, and contract ownership
  useEffect(() => {
    const checkStatus = async () => {
      if (!signedAccountId || !wallet) return;
      try {
        // Check token and group membership
        const response = await fetch('/api/auth/check-for-account', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accountId: signedAccountId }),
        });
        if (!response.ok) {
          throw new Error(`Failed to check account: ${await response.text()}`);
        }
        const { tokenId, isGroupMember } = await response.json();
        setOwnsToken(!!tokenId);
        setTokenId(tokenId || '');
        setIsGroupMember(isGroupMember);

        // Check if user is contract owner
        setIsContractOwner(CONTRACT_OWNERS.includes(signedAccountId));
      } catch (e) {
        console.error('Error checking status:', e);
        setError('Failed to check wallet status: ' + e.message);
      }
    };
    checkStatus();
  }, [signedAccountId, wallet]);

  // Create thread
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
    if (Date.now() - lastSent < 2000) {
      setError('Please wait a moment before sending another message.');
      return;
    }
    setLastSent(Date.now());
    setIsLoading(true);
    setError(null);

    const restrictedCommands = [
      'verify wallet',
      'transfer token',
      'register group',
      'upload file',
      'list files',
      'retrieve file',
    ];
    if (!signedAccountId && restrictedCommands.some(cmd => userInput.toLowerCase().includes(cmd))) {
      setError('Please connect a wallet to use this command.');
      setShowLoginPrompt(true);
      setIsLoading(false);
      return;
    }

    // Restrict upload file to contract owners
    if (userInput.toLowerCase().includes('upload file') && !isContractOwner) {
      setError('Only platform owners can upload files.');
      setIsLoading(false);
      return;
    }

    // Validate transfer token command
    if (userInput.toLowerCase().startsWith('transfer token')) {
      if (!ownsToken) {
        setError('You must own a token to transfer it.');
        setIsLoading(false);
        return;
      }
      const parts = userInput.split(' ');
      if (parts.length < 4 || parts[2] !== 'to') {
        setError("Invalid command. Use: 'transfer token <token_id> to <receiver_id>'");
        setIsLoading(false);
        return;
      }
      const receiverId = parts[3];
      try {
        const isValidAccount = await wallet.viewMethod({
          contractId: CONTRACT,
          methodName: 'owns_token',
          args: { account_id: receiverId },
        });
        if (isValidAccount) {
          setError('Receiver already owns a token.');
          setIsLoading(false);
          return;
        }
      } catch (e) {
        setError(`Failed to validate receiver: ${e.message}`);
        setIsLoading(false);
        return;
      }
    }

    try {
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
        setIsContractOwner(false);
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

  // Drag and drop file upload (restricted to contract owners)
  const handleDrop = async (e) => {
    e.preventDefault();
    setIsDragActive(false);
    if (!signedAccountId) {
      setError('Please connect a wallet to upload files.');
      setShowLoginPrompt(true);
      return;
    }
    if (!isContractOwner) {
      setError('Only 1000fans owners can upload files.');
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

  // Format messages for display
  const formatMessage = (msg) => {
    const content = msg.content[0].text.value;
    if (content.startsWith('File: ')) {
      const [fileLine, metadataLine] = content.split(', Metadata: ');
      return (
        <div>
          <strong>File:</strong> {fileLine.replace('File: ', '')}<br />
          <strong>Metadata:</strong> {metadataLine || 'None'}
        </div>
      );
    }
    if (content.includes('Download from thread')) {
      const fileId = content.match(/retrieved_(.+)\.mp3/)[1];
      return (
        <div>
          {content} <a href={`${NEAR_AI_BASE_URL}/v1/threads/${threadId}/files/retrieved_${fileId}.mp3`} download>Download</a>
        </div>
      );
    }
    return content;
  };

  // Welcoming text
  const welcomeText = `Hi! 👋 Welcome to 1000fans!
1000fans is a platform for producers to share their music and videos exclusively with their fans.
It is built with blockchain & AI for a seamless control of your enhanced privacy.
Upon login, you received a fan token and joined the theosis group for exclusive content access.`;

  return (
    <main className={styles.consoleMain}>
      <div className={styles.consoleStatus}>
        {error && <p className={styles.consoleError}>{error}</p>}
        {!signedAccountId ? (
          <p>Login to chat with the AI and access exclusive content.</p>
        ) : (
          <>
            <p>Connected as: {signedAccountId}</p>
            <p>Token Status: {ownsToken ? `Owns Token ID: ${tokenId}` : 'No token owned'}</p>
            <p>Group Membership: {isGroupMember ? 'Member of theosis group' : 'Not a group member'}</p>
            {isContractOwner && <p>Role: 1000fans Owner (file upload enabled)</p>}
          </>
        )}
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
      {isContractOwner && (
        <div
          className={`${styles.consoleDragDrop} ${isDragActive ? styles.consoleDragActive : ''}`}
          onDragEnter={(e) => { e.preventDefault(); setIsDragActive(true); }}
          onDragLeave={(e) => { e.preventDefault(); setIsDragActive(false); }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
        >
          {isDragActive ? 'Drop files here' : 'Drag and drop .mp3/.mp4 files here (authenticated users only)'}
        </div>
      )}
    </main>
  );
}