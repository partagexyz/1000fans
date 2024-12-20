# 1000 Fans Token Minter Contract

A smart contract to mint and check ownership of 1000 fans tokens. Token ID is generated automatically from fan000 to fan999. Max one token per account. Min one year before transfering the token to another account. 

It is made to serve the backend of the [fans-club](https://github.com/partagexyz/fans-club) app. 


## How to Build Locally?

Install [`cargo-near`](https://github.com/near/cargo-near) and run:

```bash
cargo near build
```

## How to Test Locally?

```bash
cargo test
```

## How to Deploy?

To deploy manually, install [`cargo-near`](https://github.com/near/cargo-near) and run:

```bash
# Create a new account
cargo near create-dev-account

# Deploy the contract on it
cargo near deploy <account-id>

# Initialize the contract
near call <account-id> new_default_meta '{"owner_id": "<account-id>"}' --accountId <account-id>
```

## Basic methods
```bash
# View metadata
near view <account-id> nft_metadata

# Mint a NFT
near call <account-id> nft_mint '{"token_id": "0", "receiver_id": "<account-id>", "token_metadata": { "title": "Olympus Mons", "description": "Tallest mountain in charted solar system", "media": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/00/Olympus_Mons_alt.jpg/1024px-Olympus_Mons_alt.jpg", "copies": 1}}' --accountId <account-id> --deposit 0.1

# View tokens for owner
near view <account-id> nft_tokens_for_owner '{"account_id": "<owner_id>"}'

# Transfer a NFT
near call <account-id> nft_transfer '{"token_id": "0", "receiver_id": "<receiver-id>", "memo": "transfer ownership"}' --accountId <account-id> --depositYocto 1
```

## Useful Links

- [cargo-near](https://github.com/near/cargo-near) - NEAR smart contract development toolkit for Rust
- [near CLI](https://near.cli.rs) - Iteract with NEAR blockchain from command line
- [NEAR Rust SDK Documentation](https://docs.near.org/sdk/rust/introduction)
- [NEAR Documentation](https://docs.near.org)
- [NFT Zero to Hero Tutorial](https://docs.near.org/tutorials/nfts/introduction)
- [NEAR StackOverflow](https://stackoverflow.com/questions/tagged/nearprotocol)
- [NEAR Discord](https://near.chat)
- [NEAR Telegram Developers Community Group](https://t.me/neardev)
- NEAR DevHub: [Telegram](https://t.me/neardevhub), [Twitter](https://twitter.com/neardevhub)
