// frontend/src/wallets/near.js
import { createContext, useState, useEffect, useContext } from 'react';
import { providers, utils } from 'near-api-js';
import '@near-wallet-selector/modal-ui/styles.css';
import { setupModal } from '@near-wallet-selector/modal-ui';
import { setupWalletSelector } from '@near-wallet-selector/core';
import { setupHereWallet } from '@near-wallet-selector/here-wallet';
import { setupMyNearWallet } from '@near-wallet-selector/my-near-wallet';
import { setupLedger } from '@near-wallet-selector/ledger';
import { setupSender } from '@near-wallet-selector/sender';
import { NetworkId } from '../config';
import { useWeb3Auth } from '../wallets/web3auth';

const THIRTY_TGAS = '30000000000000';
const NO_DEPOSIT = '0';
const Contract = 'theosis.1000fans.near';

export class Wallet {
  constructor({ networkId = 'mainnet', createAccessKeyFor = 'theosis.1000fans.near' }) {
    this.createAccessKeyFor = createAccessKeyFor;
    this.networkId = networkId;
    this.selector = null;
  }

  startUp = async (accountChangeHook) => {
    const modules = [
      setupMyNearWallet(),
      setupHereWallet(),
      setupLedger(),
      setupSender(),
    ];

    this.selector = setupWalletSelector({
      network: this.networkId,
      modules,
    });

    const walletSelector = await this.selector;
    const isSignedIn = walletSelector.isSignedIn();
    const accountId = isSignedIn ? walletSelector.store.getState().accounts[0].accountId : '';

    walletSelector.store.observable.subscribe(async (state) => {
      const signedAccount = state?.accounts.find((account) => account.active)?.accountId;
      if (signedAccount) {
        try {
          await fetch('/api/auth/create-wallet-user', { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ accountId: signedAccount }),
          });
        } catch (error) {
          console.error('Error creating wallet account:', error);
        }
      }
      accountChangeHook(signedAccount || '');
    });

    return accountId;
  };

  signIn = async () => {
    const modal = setupModal(await this.selector, { contractId: this.createAccessKeyFor });
    modal.show();
  };

  signInWithProvider = async (loginWithProvider, provider, extraLoginOptions = {}) => {
    //console.log('signInWithProvider called with provider:', provider, 'loginWithProvider:', typeof loginWithProvider);
    if (typeof loginWithProvider !== 'function') {
      throw new Error('loginWithProvider is not a function');
    }
    try {
      const providerInstance = await loginWithProvider(provider, extraLoginOptions);
      const publicKey = providerInstance.keyPair?.getPublicKey().toString();
      const response = await fetch('/api/auth/check-for-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicKey }),
      });
      const data = await response.json();

      if (!data.exists) {
        return { provider: providerInstance, needsAccountCreation: true };
      }

      await providerInstance.setupAccount(data.accountId);
      return { provider: providerInstance, accountId: data.accountId };
    } catch (error) {
      console.error(`Web3Auth login with ${provider} failed:`, error);
      throw error;
    }
  };

  signOut = async () => {
    const selectedWallet = await (await this.selector).wallet();
    await selectedWallet.signOut();
  };

  viewMethod = async ({ contractId, method, args = {} }) => {
    const url = `https://rpc.${this.networkId}.near.org`;
    const provider = new providers.JsonRpcProvider({ url });

    const res = await provider.query({
      request_type: 'call_function',
      account_id: contractId,
      method_name: method,
      args_base64: Buffer.from(JSON.stringify(args)).toString('base64'),
      finality: 'optimistic',
    });
    return JSON.parse(Buffer.from(res.result).toString());
  };

  callMethod = async ({ contractId, method, args = {}, gas = THIRTY_TGAS, deposit = NO_DEPOSIT }) => {
    const selectedWallet = await (await this.selector).wallet();
    const outcome = await selectedWallet.signAndSendTransaction({
      receiverId: contractId,
      actions: [
        {
          type: 'FunctionCall',
          params: {
            methodName: method,
            args,
            gas,
            deposit,
          },
        },
      ],
    });

    return providers.getTransactionLastResult(outcome);
  };

  getTransactionResult = async (txhash) => {
    const walletSelector = await this.selector;
    const { network } = walletSelector.options;
    const provider = new providers.JsonRpcProvider({ url: network.nodeUrl });

    const transaction = await provider.txStatus(txhash, 'unused');
    return providers.getTransactionLastResult(transaction);
  };

  getBalance = async (accountId) => {
    const walletSelector = await this.selector;
    const { network } = walletSelector.options;
    const provider = new providers.JsonRpcProvider({ url: network.nodeUrl });

    const account = await provider.query({
      request_type: 'view_account',
      account_id: accountId,
      finality: 'final',
    });
    return account.amount ? Number(utils.format.formatNearAmount(account.amount)) : 0;
  };

  signAndSendTransactions = async ({ transactions }) => {
    const selectedWallet = await (await this.selector).wallet();
    return selectedWallet.signAndSendTransactions({ transactions });
  };

  getAccessKeys = async (accountId) => {
    const walletSelector = await this.selector;
    const { network } = walletSelector.options;
    const provider = new providers.JsonRpcProvider({ url: network.nodeUrl });

    const keys = await provider.query({
      request_type: 'view_access_key_list',
      account_id: accountId,
      finality: 'final',
    });
    return keys.keys;
  };

  ownsToken = async (accountId, contractId) => {
    try {
      const tokens = await this.viewMethod({
        contractId: contractId,
        method: 'nft_tokens_for_owner',
        args: { account_id: accountId, from_index: null, limit: 1 },
      });
      return tokens.length > 0;
    } catch (error) {
      console.error('Failed to check token ownership:', error);
      return false;
    }
  };

  signMessage = async ({ message, nonce, recipient, callbackUrl }) => {
    const selectedWallet = await (await this.selector).wallet();

    if (!selectedWallet.signMessage) {
      throw new Error('The selected wallet does not support message signing');
    }

    return selectedWallet.signMessage({ message, nonce, recipient, callbackUrl });
  };
}

export const NearContext = createContext({
  wallet: undefined,
  signedAccountId: '',
  loginWithProvider: () => Promise.resolve(),
  logout: () => Promise.resolve(),
});

export function NearProvider({ children }) {
  const [wallet, setWallet] = useState(null);
  const [signedAccountId, setSignedAccountId] = useState('');
  const [isClientLoaded, setIsClientLoaded] = useState(false);
  const { web3auth, loginWithProvider: web3authLogin, logout: web3authLogout, accountId: web3authAccountId } = useWeb3Auth();

  //console.log('NearProvider: web3authLogin type:', typeof web3authLogin);

  useEffect(() => {
    setIsClientLoaded(true);
    const storedAccountId = localStorage.getItem('near_signed_account_id') || localStorage.getItem('web3auth_accountId');
    if (storedAccountId) {
      setSignedAccountId(storedAccountId);
    }
  }, []);

  useEffect(() => {
    if (!isClientLoaded) return;

    const initWallet = async () => {
      const newWallet = new Wallet({
        createAccessKeyFor: Contract,
        networkId: NetworkId,
      });

      const accountId = await newWallet.startUp(async (newSignedAccountId) => {
        const effectiveAccountId = newSignedAccountId || web3authAccountId || '';
        setSignedAccountId(effectiveAccountId);
        localStorage.setItem('near_signed_account_id', effectiveAccountId);
        if (effectiveAccountId) {
          try {
            const response = await fetch('/api/auth/create-wallet-user', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ accountId: effectiveAccountId }),
            });
            if (!response.ok) {
              console.error('Failed to create wallet account in database');
            }
          } catch (error) {
            console.error('Error creating wallet account:', error);
          }
        }
      });

      setWallet(newWallet);
      setSignedAccountId(accountId || web3authAccountId || '');
      if (accountId || web3authAccountId) {
        localStorage.setItem('near_signed_account_id', accountId || web3authAccountId);
      }
    };

    initWallet();
  }, [isClientLoaded, web3authAccountId]);

  const loginWithProvider = async (provider, options) => {
    //console.log('NearProvider loginWithProvider called with provider:', provider);
    if (!wallet) {
      throw new Error('Wallet is not initialized');
    }
    if (!web3authLogin) {
      throw new Error('Web3Auth login function is not available');
    }
    const result = await wallet.signInWithProvider(web3authLogin, provider, options);
    if (!result.needsAccountCreation) {
      setSignedAccountId(result.accountId);
      localStorage.setItem('near_signed_account_id', result.accountId);
    }
    return result;
  };

  const logout = async () => {
    await wallet.signOut();
    await web3authLogout();
    setSignedAccountId('');
    localStorage.removeItem('near_signed_account_id');
    localStorage.removeItem('web3auth_accountId');
    localStorage.removeItem('NearAIAuthObject');
  };

  return (
    <NearContext.Provider value={{ wallet, signedAccountId, loginWithProvider, logout }}>
      {children}
    </NearContext.Provider>
  );
}

export function useNear() {
  return useContext(NearContext);
}