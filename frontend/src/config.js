const contractPerNetwork = {
  mainnet: 'theosis.1000fans.near',
  testnet: '1000fans.testnet',
};

// Chains for EVM Wallets 
const evmWalletChains = {
  mainnet: {
    chainId: 397,
    name: "Near Mainnet",
    explorer: "https://eth-explorer.near.org",
    rpc: "https://eth-rpc.mainnet.near.org",
  },
  testnet: {
    chainId: 398,
    name: "Near Testnet",
    explorer: "https://eth-explorer-testnet.near.org",
    rpc: "https://eth-rpc.testnet.near.org",
  },
}

export const NetworkId = 'mainnet';
export const HelloNearContract = contractPerNetwork[NetworkId];
export const EVMWalletChain = evmWalletChains[NetworkId];