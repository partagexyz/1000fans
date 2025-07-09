// frontend/src/wallets/web3modal.js
import { NetworkId, EVMWalletChain } from '../config';

// Config
const near = {
  id: EVMWalletChain.chainId,
  name: EVMWalletChain.name,
  nativeCurrency: {
    decimals: 18,
    name: "NEAR",
    symbol: "NEAR",
  },
  rpcUrls: {
    default: { http: [EVMWalletChain.rpc] },
    public: { http: [EVMWalletChain.rpc] },
  },
  blockExplorers: {
    default: {
      name: "NEAR Explorer",
      url: EVMWalletChain.explorer,
    },
  },
  testnet: NetworkId === "testnet",
};

// Get your projectId at https://cloud.reown.com
const projectId = '5bb0fe33763b3bea40b8d69e4269b4ae';

// Initialize wagmiConfig and web3Modal only in the browser
export let wagmiConfig = null;
export let web3Modal = null;

if (typeof window !== 'undefined') {
  const { createConfig, http, reconnect } = await import('@wagmi/core');
  const { walletConnect, injected } = await import('@wagmi/connectors');
  const { createWeb3Modal } = await import('@web3modal/wagmi');

  wagmiConfig = createConfig({
    chains: [near],
    transports: { [near.id]: http() },
    connectors: [
      walletConnect({ projectId, showQrModal: false }),
      injected({ shimDisconnect: true }),
    ],
  });

  // Preserve login state on page reload
  reconnect(wagmiConfig);

  // Modal for login
  web3Modal = createWeb3Modal({ wagmiConfig, projectId });
}