// frontend/src/wallets/web3auth.js
import { createContext, useContext, useState, useEffect } from "react";
import { Web3AuthNoModal } from "@web3auth/no-modal";
import { AuthAdapter } from "@web3auth/auth-adapter";
import { CommonPrivateKeyProvider } from "@web3auth/base-provider";
import { WEB3AUTH_NETWORK, CHAIN_NAMESPACES, WALLET_ADAPTERS } from "@web3auth/base";
import { connect, KeyPair, keyStores, utils } from "near-api-js";
import { getED25519Key } from "@web3auth/base-provider";
import { NetworkId } from "../config";

const Web3AuthContext = createContext({});

const chainConfig = {
  chainNamespace: CHAIN_NAMESPACES.OTHER,
  chainId: "0x4e454153",
  rpcTarget: `https://rpc.${NetworkId}.near.org`,
  displayName: "NEAR",
  blockExplorerUrl: `https://${NetworkId === 'testnet' ? 'testnet.nearblocks.io' : 'nearblocks.io'}/`,
  ticker: "NEAR",
  tickerName: "NEAR",
  decimals: 24,
  isTestnet: NetworkId === 'testnet',
};

const privateKeyProvider = new CommonPrivateKeyProvider({
  config: { chainConfig },
});

const WEB3AUTH_CLIENT_ID = process.env.NEXT_PUBLIC_WEB3AUTH_CLIENT_ID;

export function Web3AuthProvider({ children }) {
  const [provider, setProvider] = useState(null);
  const [accountId, setAccountId] = useState(null);
  const [nearConnection, setNearConnection] = useState(null);
  const [web3auth, setWeb3auth] = useState(null);
  const [isClientLoaded, setIsClientLoaded] = useState(false);
  const [keyPair, setKeyPair] = useState(null);

  useEffect(() => {
    setIsClientLoaded(true);
    const storedKeyPair = localStorage.getItem("web3auth_keypair");
    if (storedKeyPair) {
      const restoredKeyPair = KeyPair.fromString(storedKeyPair);
      setKeyPair(restoredKeyPair);
      console.log('Restored key pair from localStorage');
    }
  }, []);

  useEffect(() => {
    const initWeb3Auth = async () => {
      try {
        console.log('Web3Auth Client ID:', WEB3AUTH_CLIENT_ID);
        if (!WEB3AUTH_CLIENT_ID) {
          throw new Error('Web3Auth Client ID is missing. Please set NEXT_PUBLIC_WEB3AUTH_CLIENT_ID in .env.local');
        }
        console.log('Web3Auth Network:', NetworkId === 'testnet' ? 'SAPPHIRE_DEVNET' : 'SAPPHIRE_MAINNET'); // Debug
        console.log('Chain Config:', chainConfig);
        const web3authInstance = new Web3AuthNoModal({
          clientId: WEB3AUTH_CLIENT_ID,
          web3AuthNetwork: NetworkId === 'testnet' ? WEB3AUTH_NETWORK.SAPPHIRE_DEVNET : WEB3AUTH_NETWORK.SAPPHIRE_MAINNET,
          privateKeyProvider,
        });

        const authAdapter = new AuthAdapter({
          adapterSettings: {
            network: NetworkId === 'testnet' ? WEB3AUTH_NETWORK.SAPPHIRE_DEVNET : WEB3AUTH_NETWORK.SAPPHIRE_MAINNET,
            uxMode: 'popup',
            whiteLabel: {
              appName: '1000fans',
            },
          },
        });
        console.log('Configuring Web3Auth adapter');
        web3authInstance.configureAdapter(authAdapter);
        console.log('Initializing Web3Auth instance');
        await web3authInstance.init();
        setWeb3auth(web3authInstance);
        console.log('Web3Auth initialized successfully');
      } catch (error) {
        console.error('Web3Auth initialization failed:', {
          message: error.message,
          code: error.code,
          stack: error.stack,
          clientId: WEB3AUTH_CLIENT_ID,
          network: NetworkId,
          web3AuthNetwork: NetworkId === 'testnet' ? WEB3AUTH_NETWORK.SAPPHIRE_DEVNET : WEB3AUTH_NETWORK.SAPPHIRE_MAINNET,
        });
      }
    };

    initWeb3Auth();
  }, []);

  const setupNearConnection = async (keyPair, newAccountId) => {
    try {
      const myKeyStore = new keyStores.InMemoryKeyStore();
      await myKeyStore.setKey(NetworkId, newAccountId, keyPair);

      const connectionConfig = {
        networkId: NetworkId,
        keyStore: myKeyStore,
        nodeUrl: `https://rpc.${NetworkId}.near.org`,
        walletUrl: `https://wallet.${NetworkId}.near.org`,
        helperUrl: `https://helper.${NetworkId}.near.org`,
        explorerUrl: `https://explorer.${NetworkId}.near.org`,
      };

      const connection = await connect(connectionConfig);
      setNearConnection(connection);
      return connection;
    } catch (error) {
      console.error("Error setting up NEAR connection:", error);
      throw error;
    }
  };

  const getNearCredentials = async (web3authProvider) => {
    try {
      const privateKey = await web3authProvider.request({ method: "private_key" });
      const privateKeyEd25519 = getED25519Key(privateKey).sk.toString("hex");
      const privateKeyEd25519Buffer = Buffer.from(privateKeyEd25519, "hex");
      const bs58encode = utils.serialize.base_encode(privateKeyEd25519Buffer);
      const newKeyPair = KeyPair.fromString(`ed25519:${bs58encode}`);
      setKeyPair(newKeyPair);

      if (typeof window !== "undefined") {
        localStorage.setItem("web3auth_keypair", newKeyPair.toString());
      }

      return { keyPair: newKeyPair };
    } catch (error) {
      console.error("Error getting NEAR credentials:", error);
      throw error;
    }
  };

  const setupAccount = async (accountId, providedKeyPair = null) => {
    try {
      const keyPairToUse = providedKeyPair || keyPair;
      if (!keyPairToUse) throw new Error("No keypair available");

      await setupNearConnection(keyPairToUse, accountId);
      setAccountId(accountId);

      if (typeof window !== "undefined") {
        localStorage.setItem("web3auth_accountId", accountId);
      }
    } catch (error) {
      console.error("Error setting up account:", error);
      throw error;
    }
  };

  const loginWithProvider = async (loginProvider, extraLoginOptions = {}) => {
    try {
      console.log('Logging in with provider:', loginProvider);
      const web3authProvider = await web3auth.connectTo(WALLET_ADAPTERS.AUTH, {
        loginProvider,
        ...extraLoginOptions,
      });
      setProvider(web3authProvider);

      const { keyPair: theKeyPair } = await getNearCredentials(web3authProvider);
      const publicKey = theKeyPair.getPublicKey().toString();

      const response = await fetch("/api/auth/check-for-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publicKey }),
      });

      const data = await response.json();

      if (data.exists) {
        await setupAccount(data.accountId, theKeyPair);
        return web3authProvider;
      }

      return web3authProvider;
    } catch (error) {
      console.error(`Login with ${loginProvider} failed:`, error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      if (web3auth?.connected) {
        await web3auth.logout();
        setProvider(null);
        setAccountId(null);
        setNearConnection(null);
        setKeyPair(null);
        if (typeof window !== "undefined") {
          localStorage.removeItem("web3auth_keypair");
          localStorage.removeItem("web3auth_accountId");
        }
      }
    } catch (error) {
      console.error("Logout failed:", error);
      throw error;
    }
  };

  const signMessage = async ({ message, nonce, recipient, callbackUrl }) => {
    if (!provider) throw new Error('No Web3Auth provider available');
    const privateKey = await provider.request({ method: 'private_key' });
    const privateKeyEd25519 = getED25519Key(privateKey).sk.toString('hex');
    const privateKeyEd25519Buffer = Buffer.from(privateKeyEd25519, 'hex');
    const keyPair = KeyPair.fromString(`ed25519:${utils.serialize.base_encode(privateKeyEd25519Buffer)}`);
    
    const messageBuffer = new TextEncoder().encode(message);
    const { signature } = keyPair.sign(messageBuffer);
    
    return {
      signature: Buffer.from(signature).toString('base64'),
      publicKey: keyPair.getPublicKey().toString(),
      message,
      nonce,
      recipient,
      callbackUrl,
    };
  };

  return (
    <Web3AuthContext.Provider
      value={{
        web3auth,
        provider,
        accountId,
        setAccountId,
        nearConnection,
        keyPair,
        setupAccount,
        loginWithProvider,
        logout,
        signMessage,
      }}
    >
      {children}
    </Web3AuthContext.Provider>
  );
}

export function useWeb3Auth() {
  const context = useContext(Web3AuthContext);
  if (context === undefined) {
    throw new Error("useWeb3Auth must be used within a Web3AuthProvider");
  }
  return context;
}