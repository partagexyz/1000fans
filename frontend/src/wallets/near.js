// Contains wallet connection logic. Integrate membership token checks.
import { createContext } from 'react';

// near api js
import { providers, utils } from 'near-api-js';

// wallet selector
import '@near-wallet-selector/modal-ui/styles.css';
import { setupModal } from '@near-wallet-selector/modal-ui';
import { setupWalletSelector } from '@near-wallet-selector/core';
import { setupHereWallet } from '@near-wallet-selector/here-wallet';
import { setupMyNearWallet } from '@near-wallet-selector/my-near-wallet';
import { setupLedger } from '@near-wallet-selector/ledger';
import { setupMeteorWallet } from '@near-wallet-selector/meteor-wallet';
import { setupSender } from '@near-wallet-selector/sender';
import { setupBitteWallet } from '@near-wallet-selector/bitte-wallet';

// ethereum wallets
import { wagmiConfig, web3Modal } from './web3modal';

const THIRTY_TGAS = '30000000000000';
const NO_DEPOSIT = '0';

export class Wallet {
  constructor({ networkId = 'mainnet', createAccessKeyFor = 'theosis.1000fans.near' }) {
    this.createAccessKeyFor = createAccessKeyFor;
    this.networkId = networkId;
    this.selector = null;
  }

  /**
   * To be called when the website loads
   * @param {Function} accountChangeHook - a function that is called when the user signs in or out
   * @returns {Promise<string>} - the accountId of the signed-in user
   */
  startUp = async (accountChangeHook) => {
    // Initialize wallet selector modules
    const modules = [
      setupMyNearWallet(),
      setupHereWallet(),
      setupLedger(),
      setupMeteorWallet(),
      setupSender(),
      setupBitteWallet(),
    ];

    // Dynamically import Ethereum wallets only in the browser
    if (typeof window !== 'undefined') {
      const { setupEthereumWallets } = await import('@near-wallet-selector/ethereum-wallets');
      modules.push(
        setupEthereumWallets({
          wagmiConfig,
          web3Modal,
          alwaysOnboardDuringSignIn: true,
        })
      );
    }

    this.selector = setupWalletSelector({
      network: this.networkId,
      modules,
    });

    const walletSelector = await this.selector;
    const isSignedIn = walletSelector.isSignedIn();
    const accountId = isSignedIn ? walletSelector.store.getState().accounts[0].accountId : '';

    walletSelector.store.observable.subscribe(async (state) => {
      const signedAccount = state?.accounts.find((account) => account.active)?.accountId;
      accountChangeHook(signedAccount || '');
    });

    return accountId;
  };

  /**
   * Displays a modal to login the user
   */
  signIn = async () => {
    const modal = setupModal(await this.selector, { contractId: this.createAccessKeyFor });
    modal.show();
  };

  /**
   * Logout the user
   */
  signOut = async () => {
    const selectedWallet = await (await this.selector).wallet();
    selectedWallet.signOut();
  };

  /**
   * Makes a read-only call to a contract
   * @param {Object} options - the options for the call
   * @param {string} options.contractId - the contract's account id
   * @param {string} options.method - the method to call
   * @param {Object} options.args - the arguments to pass to the method
   * @returns {Promise<JSON.value>} - the result of the method call
   */
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

  /**
   * Makes a call to a contract
   * @param {Object} options - the options for the call
   * @param {string} options.contractId - the contract's account id
   * @param {string} options.method - the method to call
   * @param {Object} options.args - the arguments to pass to the method
   * @param {string} options.gas - the amount of gas to use
   * @param {string} options.deposit - the amount of yoctoNEAR to deposit
   * @returns {Promise<Transaction>} - the resulting transaction
   */
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

  /**
   * Makes a call to a contract
   * @param {string} txhash - the transaction hash
   * @returns {Promise<JSON.value>} - the result of the transaction
   */
  getTransactionResult = async (txhash) => {
    const walletSelector = await this.selector;
    const { network } = walletSelector.options;
    const provider = new providers.JsonRpcProvider({ url: network.nodeUrl });

    // Retrieve transaction result from the network
    const transaction = await provider.txStatus(txhash, 'unnused');
    return providers.getTransactionLastResult(transaction);
  };

  /**
   * Gets the balance of an account
   * @param {string} accountId - the account id to get the balance of
   * @returns {Promise<number>} - the balance of the account
   */
  getBalance = async (accountId) => {
    const walletSelector = await this.selector;
    const { network } = walletSelector.options;
    const provider = new providers.JsonRpcProvider({ url: network.nodeUrl });

    // Retrieve account state from the network
    const account = await provider.query({
      request_type: 'view_account',
      account_id: accountId,
      finality: 'final',
    });
    // return amount on NEAR
    return account.amount ? Number(utils.format.formatNearAmount(account.amount)) : 0;
  };

  /**
   * Signs and sends transactions
   * @param {Object[]} transactions - the transactions to sign and send
   * @returns {Promise<Transaction[]>} - the resulting transactions
   */
  signAndSendTransactions = async ({ transactions }) => {
    const selectedWallet = await (await this.selector).wallet();
    return selectedWallet.signAndSendTransactions({ transactions });
  };

  /**
   * @param {string} accountId
   * @returns {Promise<Object[]>} - the access keys for the account
   */
  getAccessKeys = async (accountId) => {
    const walletSelector = await this.selector;
    const { network } = walletSelector.options;
    const provider = new providers.JsonRpcProvider({ url: network.nodeUrl });

    // Retrieve account state from the network
    const keys = await provider.query({
      request_type: 'view_access_key_list',
      account_id: accountId,
      finality: 'final',
    });
    return keys.keys;
  };

  /**
   * Check if an account owns a token from the specified contract
   * @param {string} accountId - The account ID to check for token ownership
   * @param {string} contractId - The contract ID where the token might be owned
   * @returns {Promise<boolean>} - true if account owns a token, false otherwise
   */
  ownsToken = async (accountId, contractId) => {
    try {
      const tokens = await this.viewMethod({
        contractId: contractId,
        method: 'nft_tokens_for_owner',
        args: { account_id: accountId, from_index: null, limit: 1 },
      });
      return tokens.length > 0; // should be more than 0 if token held
    } catch (error) {
      console.error('Failed to check token ownership:', error);
      return false; // Assume no ownership if there's an error
    }
  };
}

export const NearContext = createContext({
  wallet: undefined,
  signedAccountId: '',
});