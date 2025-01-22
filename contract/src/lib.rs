// A smart contract to mint and check ownership of 1000 fans tokens
use near_contract_standards::non_fungible_token::approval::NonFungibleTokenApproval;
use near_contract_standards::non_fungible_token::core::{
    NonFungibleTokenCore, NonFungibleTokenResolver,
};
use near_contract_standards::non_fungible_token::enumeration::NonFungibleTokenEnumeration;
use near_contract_standards::non_fungible_token::metadata::{
    NFTContractMetadata, NonFungibleTokenMetadataProvider, TokenMetadata, NFT_METADATA_SPEC,
};
use near_contract_standards::non_fungible_token::NonFungibleToken;
use near_contract_standards::non_fungible_token::{Token, TokenId};
use near_sdk::collections::{ LazyOption, UnorderedMap };
use near_sdk::json_types::U128;
use near_sdk::{
    env, near, require, AccountId, BorshStorageKey, PanicOnDefault, Promise, PromiseOrValue,
};
use near_sdk::NearToken;
use near_sdk::borsh::{self, BorshDeserialize, BorshSerialize};
use std::collections::HashMap;

pub type SalePriceInYoctoNear = NearToken;

#[derive(PanicOnDefault)]
#[near(contract_state)]
pub struct Contract {
    tokens: NonFungibleToken,
    metadata: LazyOption<NFTContractMetadata>,
    minted_count: u64, // keep track of minted tokens
    sales: UnorderedMap<TokenId, Sale>, // keep track of sales
}

#[derive(BorshDeserialize, BorshSerialize)]
pub struct Sale {
    pub owner_id: AccountId,
    pub price: SalePriceInYoctoNear,
}

#[derive(BorshStorageKey)]
#[near]
enum StorageKey {
    NonFungibleToken,
    Metadata,
    TokenMetadata,
    Enumeration,
    Approval,
    Sales,
}

#[near]
impl Contract {
    /// Initializes the contract with default metadata.
    #[init]
    pub fn new_default_meta(owner_id: AccountId) -> Self {
        Self::new(
            owner_id,
            NFTContractMetadata {
                spec: NFT_METADATA_SPEC.to_string(),
                name: "1000fans".to_string(),
                symbol: "1000F".to_string(),
                icon: None,
                base_uri: None,
                reference: None,
                reference_hash: None,
            },
        )
    }

    #[init]
    pub fn new(owner_id: AccountId, metadata: NFTContractMetadata) -> Self {
        require!(!env::state_exists(), "Already initialized");
        metadata.assert_valid();
        let mut this = Self {
            tokens: NonFungibleToken::new(
                StorageKey::NonFungibleToken,
                owner_id.clone(),
                Some(StorageKey::TokenMetadata),
                Some(StorageKey::Enumeration),
                Some(StorageKey::Approval),
            ),
            metadata: LazyOption::new(StorageKey::Metadata, Some(&metadata)),
            minted_count: 0, // Initialize minted_count to zero
            sales: UnorderedMap::new(StorageKey::Sales),
        };

        // Automatically mint 1000 NFTs
        for i in 0..1000 {
            let token_id = format!("fan{:03}", i);
            let mint_timestamp = env::block_timestamp();
            let token_metadata = TokenMetadata {
                title: Some(format!("Fan Token #{}", i + 1)),
                description: Some(format!("Fan Token #{}", i + 1)),
                media: None,
                media_hash: None,
                copies: Some(1),
                issued_at: Some(mint_timestamp.to_string()),
                expires_at: None,
                starts_at: None,
                updated_at: None,
                extra: None,
                reference: None,
                reference_hash: None,
            };
            this.tokens.internal_mint(token_id, owner_id.clone(), Some(token_metadata));
            this.minted_count += 1;
        }

        this
    }

    /* 
    /// Mint a new token with ID=`token_id` belonging to `token_owner_id`.
    #[payable]
    #[handle_result]
    pub fn nft_mint(
        &mut self,
        token_owner_id: AccountId,
        mut token_metadata: TokenMetadata,
    ) -> Result<Token, String> {
        // restrict minting to the contract owner
        if env::predecessor_account_id() != self.tokens.owner_id {
            return Err("Unauthorized".to_string());
        }
        // check if the minted count is less than 1000
        if self.minted_count >= 1000 {
            return Err("Cannot mint more than 1000 tokens".to_string());
        }
        {/*
        // check if the account already owns a token
        if self.owns_token(token_owner_id.clone()) {
            return Err("Account already owns a token".to_string());
        }
        */}
        // Generate the token ID based on the minted count
        let token_id = format!("fan{:03}", self.minted_count);
        // capture the curretn timestamp
        let mint_timestamp = env::block_timestamp();

        // Store the timestamp in the issued_at field of the metadata
        token_metadata.issued_at = Some(mint_timestamp.to_string());

        let token = self.tokens.internal_mint(token_id, token_owner_id, Some(token_metadata));
        self.minted_count += 1;
    
        Ok(token)
    }
    */

    // check if an account owns a token
    pub fn owns_token(&self, account_id:AccountId) -> bool {
        self.tokens.nft_tokens_for_owner(account_id, None, Some(1)).len() > 0
    }

    /*
    // burn token function
    #[payable]
    pub fn nft_burn(&mut self, token_id: TokenId) {
        let token = self.tokens.nft_token(token_id.clone()).expect("Token not found");
    
        // Check if the caller is the owner of the token
        require!(env::predecessor_account_id() == token.owner_id, "Only the owner can burn this token");
    
        // Remove token from owner
        if let Some(owner) = self.tokens.owner_by_id.remove(&token_id) {
            // Handle tokens_per_owner
            if let Some(tokens_per_owner) = self.tokens.tokens_per_owner.as_mut() {
                if let Some(mut tokens) = tokens_per_owner.get(&owner) {
                    tokens.remove(&token_id);
                    if tokens.is_empty() {
                        tokens_per_owner.remove(&owner);
                    } else {
                        tokens_per_owner.insert(&owner, &tokens);
                    }
                }
            }
        }
    
        // Remove token metadata
        self.tokens.token_metadata_by_id.as_mut().expect("Metadata should exist").remove(&token_id);
    
        // Handle approvals if any
        if let Some(approvals) = self.tokens.approvals_by_id.as_ref().expect("Approvals should exist").get(&token_id) {
            for account_id in approvals.keys() {
                self.tokens.nft_revoke(token_id.clone(), account_id.clone());
            }
            self.tokens.approvals_by_id.as_mut().expect("Approvals should exist").remove(&token_id);
        }
    
        // Optionally, decrease minted_count
        self.minted_count = self.minted_count.saturating_sub(1);
    }
    */

    #[payable]
    pub fn nft_offer_for_sale(&mut self, token_id: TokenId, price:SalePriceInYoctoNear) {
        let owner_id = env::predecessor_account_id();
        let token = self.tokens.nft_token(token_id.clone()).expect("Token not found");
        require!(token.owner_id == owner_id, "Only the owner can offer the token for sale");

        // remove any existing sale for this token
        self.sales.remove(&token_id);

        // create a new sale
        self.sales.insert(&token_id, &Sale {
            owner_id,
            price,
        });
    }

    #[payable]
    pub fn nft_buy(&mut self, token_id: TokenId) {
        let buyer_id = env::predecessor_account_id();
        let attached_deposit = env::attached_deposit();

        let sale = self.sales.get(&token_id).expect("Sale not found");
        
        require!(
            attached_deposit >= sale.price.saturating_add(NearToken::from_yoctonear(1)),
            "Requires attached deposit of at least price + 1 yoctoNEAR"
        );

        // ensure the token exists and the owner matches the sale's owner
        let token = self.tokens.nft_token(token_id.clone()).expect("Token not found");
        require!(token.owner_id == sale.owner_id, "Sale information mismatch");

        // transfer token to the buyer
        self.tokens.nft_transfer(buyer_id.clone(), token_id.clone(), None, None);

        // transfer payment to the seller
        Promise::new(sale.owner_id).transfer(sale.price);

        // remove the sale from the sales mapping
        self.sales.remove(&token_id);

        // refund any excess payment to the buyer
        if attached_deposit > sale.price {
            Promise::new(buyer_id).transfer(attached_deposit.saturating_sub(sale.price));
        }
    }

    pub fn remove_sale(&mut self, token_id: TokenId) {
        let owner_id = env::predecessor_account_id();
        let sale = self.sales.get(&token_id).expect("Sale not found");
        require!(sale.owner_id == owner_id, "Only the sale owner can remove the sale");
        self.sales.remove(&token_id);
    }
}

#[near]
impl NonFungibleTokenCore for Contract {
    #[payable]
    fn nft_transfer(
        &mut self,
        receiver_id: AccountId,
        token_id: TokenId,
        approval_id: Option<u64>,
        memo: Option<String>,
    ) { 
        {/*
        // check if the receiver already owns a token
        if self.owns_token(receiver_id.clone()) {
            env::panic_str("Receiver already owns a token");
        }
        */}
        let token = self.tokens.nft_token(token_id.clone()).unwrap_or_else(|| {
            env::panic_str("Token not found");
        });
        /*
        // forbid token transfer before 1 year 
        let mint_timestamp = token.metadata
            .as_ref()
            .and_then(|m| m.issued_at.as_ref())
            .and_then(|s| s.parse::<u64>().ok())
            .unwrap_or(0);
    
        if env::block_timestamp() - mint_timestamp < 31_536_000_000_000_000 {
            env::panic_str("Transfer not allowed until one year after mint");
        }
        */

        // Remove any existing sale for this token when transferring
        self.sales.remove(&token_id);

        // if the check passes, proceed with the transfer
        self.tokens
            .nft_transfer(receiver_id, token_id, approval_id, memo);
    }

    #[payable]
    fn nft_transfer_call(
        &mut self,
        receiver_id: AccountId,
        token_id: TokenId,
        approval_id: Option<u64>,
        memo: Option<String>,
        msg: String,
    ) -> PromiseOrValue<bool> {
        self.tokens
            .nft_transfer_call(receiver_id, token_id, approval_id, memo, msg)
    }

    fn nft_token(&self, token_id: TokenId) -> Option<Token> {
        self.tokens.nft_token(token_id)
    }
}

#[near]
impl NonFungibleTokenResolver for Contract {
    #[private]
    fn nft_resolve_transfer(
        &mut self,
        previous_owner_id: AccountId,
        receiver_id: AccountId,
        token_id: TokenId,
        approved_account_ids: Option<HashMap<AccountId, u64>>,
    ) -> bool {
        self.tokens.nft_resolve_transfer(
            previous_owner_id,
            receiver_id,
            token_id,
            approved_account_ids,
        )
    }
}

#[near]
impl NonFungibleTokenApproval for Contract {
    #[payable]
    fn nft_approve(
        &mut self,
        token_id: TokenId,
        account_id: AccountId,
        msg: Option<String>,
    ) -> Option<Promise> {
        self.tokens.nft_approve(token_id, account_id, msg)
    }

    #[payable]
    fn nft_revoke(&mut self, token_id: TokenId, account_id: AccountId) {
        self.tokens.nft_revoke(token_id, account_id);
    }

    #[payable]
    fn nft_revoke_all(&mut self, token_id: TokenId) {
        self.tokens.nft_revoke_all(token_id);
    }

    fn nft_is_approved(
        &self,
        token_id: TokenId,
        approved_account_id: AccountId,
        approval_id: Option<u64>,
    ) -> bool {
        self.tokens
            .nft_is_approved(token_id, approved_account_id, approval_id)
    }
}

#[near]
impl NonFungibleTokenEnumeration for Contract {
    fn nft_total_supply(&self) -> U128 {
        self.tokens.nft_total_supply()
    }

    fn nft_tokens(&self, from_index: Option<U128>, limit: Option<u64>) -> Vec<Token> {
        self.tokens.nft_tokens(from_index, limit)
    }

    fn nft_supply_for_owner(&self, account_id: AccountId) -> U128 {
        self.tokens.nft_supply_for_owner(account_id)
    }

    fn nft_tokens_for_owner(
        &self,
        account_id: AccountId,
        from_index: Option<U128>,
        limit: Option<u64>,
    ) -> Vec<Token> {
        self.tokens
            .nft_tokens_for_owner(account_id, from_index, limit)
    }
}

#[near]
impl NonFungibleTokenMetadataProvider for Contract {
    fn nft_metadata(&self) -> NFTContractMetadata {
        self.metadata.get().unwrap()
    }
}

#[cfg(all(test, not(target_arch = "wasm32")))]
mod tests {
    use crate::Contract;
    use near_sdk::test_utils::{accounts, VMContextBuilder};
    use near_sdk::{testing_env, NearToken, AccountId};

    use super::*;

    const ZERO_NEAR: NearToken = NearToken::from_yoctonear(0);
    const ONE_YOCTONEAR: NearToken = NearToken::from_yoctonear(1);
    const MINT_STORAGE_COST: NearToken = NearToken::from_yoctonear(6370000000000000000000);
    const APPROVE_STORAGE_COST: NearToken = NearToken::from_yoctonear(150000000000000000000);

    fn get_context(predecessor_account_id: AccountId) -> VMContextBuilder {
        let mut builder = VMContextBuilder::new();
        builder
            .current_account_id(accounts(0))
            .signer_account_id(predecessor_account_id.clone())
            .predecessor_account_id(predecessor_account_id);
        builder
    }

    fn sample_token_metadata() -> TokenMetadata {
        TokenMetadata {
            title: Some("Olympus Mons".into()),
            description: Some("The tallest mountain in the charted solar system".into()),
            media: None,
            media_hash: None,
            copies: Some(1u64),
            issued_at: None, // will be set in nft_mint
            expires_at: None,
            starts_at: None,
            updated_at: None,
            extra: None,
            reference: None,
            reference_hash: None,
        }
    }

    #[test]
    fn test_new() {
        let mut context = get_context(accounts(1));
        let total_mint_cost = MINT_STORAGE_COST.saturating_mul(1000u128);
        testing_env!(context
            .storage_usage(env::storage_usage()) // Start with current storage usage
            .attached_deposit(total_mint_cost) // cover storage costs for 1000 tokens, adjust as needed
            .build()
        );
        let contract = Contract::new_default_meta(accounts(1).into());
    
        // Set context to view mode, which doesn't require deposit
        testing_env!(context
            .is_view(true)
            .build()
        );
    
        assert_eq!(contract.nft_total_supply(), U128::from(1000), "All 1000 tokens should be minted at initialization");
        assert_eq!(contract.minted_count, 1000, "Minted count should match total supply");    
    }

    #[test]
    #[should_panic(expected = "The contract is not initialized")]
    fn test_default() {
        let context = get_context(accounts(1));
        testing_env!(context.build());
        let _contract = Contract::default();
    }

    /*
    #[test]
    fn test_mint() {
        let mut context = get_context(accounts(0));
        testing_env!(context.build());
        let mut contract = Contract::new_default_meta(accounts(0).into());
    
        // Test minting multiple tokens to the same account
        for i in 0..5 { // Changed to a smaller number for brevity, adjust as needed
            testing_env!(context
                .storage_usage(env::storage_usage())
                .attached_deposit(MINT_STORAGE_COST)
                .predecessor_account_id(accounts(0))
                .build());
        
            let account_id = accounts(0); // Using the same account for all mints
        
            let result = contract.nft_mint(account_id.clone(), sample_token_metadata());
        
            assert!(result.is_ok(), "Minting tokens should succeed");
        
            // Check that the token was minted and the account owns it
            assert!(contract.owns_token(account_id.clone()), "Account should own the token after minting");
        
            // Check the token metadata for issued_at
            if let Some(token) = contract.nft_token(format!("fan{:03}", i)) {
                assert!(token.metadata.is_some(), "Token should have metadata");
                if let Some(metadata) = token.metadata {
                    assert!(metadata.issued_at.is_some(), "issued_at should contain timestamp");
                }
            } else {
                panic!("Token not found after minting");
            }
        }

        // Test minting up to the 1000 token limit with unique accounts
        for i in 5..1000 {
            testing_env!(context
                .storage_usage(env::storage_usage())
                .attached_deposit(MINT_STORAGE_COST)
                .predecessor_account_id(accounts(0))
                .build());

            let account_id = AccountId::new_unvalidated(format!("owner{}", i)); // Convert String to AccountId
            
            let result = contract.nft_mint(account_id.clone(), sample_token_metadata());
            
            assert!(result.is_ok(), "Minting tokens up to 1000 should succeed");
            assert!(contract.owns_token(account_id.clone()), "Account should own the token after minting");
        }
    
        // Try to mint one more token, which should fail due to the 1000 token limit
        testing_env!(context
            .storage_usage(env::storage_usage())
            .attached_deposit(MINT_STORAGE_COST)
            .predecessor_account_id(accounts(0))
            .build());
        let result = contract.nft_mint(AccountId::new_unvalidated("owner1000".to_string()), sample_token_metadata());
        assert!(result.is_err(), "Shouldn't be able to mint the 1001st token");
        assert_eq!(result.unwrap_err(), "Cannot mint more than 1000 tokens", "Error message should match");
    
        // Final checks
        assert_eq!(contract.minted_count, 1000, "Should have minted exactly 1000 tokens");
        assert_eq!(contract.nft_total_supply(), U128::from(1000), "Total supply should be 1000");
    }
    */

    #[test]
    fn test_transfer() {
        let mut context = get_context(accounts(0));
        testing_env!(context.build());
        let mut contract = Contract::new_default_meta(accounts(0).into());

        // Get the first token for testing
        let token_id = "fan000".to_string();

        /* 
        testing_env!(context
            .storage_usage(env::storage_usage())
            .attached_deposit(MINT_STORAGE_COST)
            .predecessor_account_id(accounts(0))
            .build());
        let result = contract.nft_mint(accounts(0), sample_token_metadata()).unwrap();
        let token_id = result.token_id; // Capture the auto-generated token ID

        // Test immediate transfer failure (before one year)
        let mut context = get_context(accounts(0));
        testing_env!(context
            .storage_usage(env::storage_usage())
            .attached_deposit(ONE_YOCTONEAR)
            .predecessor_account_id(accounts(0))
            .build());
        let transfer_result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            contract.nft_transfer(accounts(1), token_id.clone(), None, None);
        }));
        assert!(transfer_result.is_err(), "Transfer should fail due to time lock");

        // Simulate one year passing by setting a future timestamp
        let future_timestamp = env::block_timestamp() + 31_536_000_000_000_000; // One year in nanoseconds
        testing_env!(context
            .block_timestamp(future_timestamp)
            .attached_deposit(ONE_YOCTONEAR)
            .predecessor_account_id(accounts(0))
            .build());
    
        // Now, transfer should succeed
        let transfer_result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            contract.nft_transfer(accounts(1), token_id.clone(), None, None);
        }));
        
        assert!(transfer_result.is_ok(), "Transfer should succeed after one year");    
        */

        // Transfer should succeed immediately since there's no more one-year lock
        testing_env!(context
            .storage_usage(env::storage_usage())
            .attached_deposit(MINT_STORAGE_COST)
            .predecessor_account_id(accounts(0))
            .build());
        let transfer_result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            contract.nft_transfer(accounts(1), token_id.clone(), None, None);
        }));
        assert!(transfer_result.is_ok(), "Transfer should succeed immediately");
        
        // Verify transfer details
        testing_env!(context
            .storage_usage(env::storage_usage())
            .account_balance(env::account_balance())
            .is_view(true)
            .attached_deposit(ZERO_NEAR)
            .build());
        if let Some(token) = contract.nft_token(token_id.clone()) {
            assert_eq!(token.token_id, token_id);
            assert_eq!(token.owner_id, accounts(1));
            assert!(token.metadata.is_some(), "Token should have metadata");
            if let Some(metadata) = token.metadata {
                assert!(metadata.issued_at.is_some(), "Token should have an issued_at timestamp");
            }
        } else {
            panic!("token not found after transfer");
        }
        {/*
        // Test that transferring to an account that already has a token fails
        let transfer_result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            contract.nft_mint(accounts(2), sample_token_metadata()).unwrap(); // Mint another token
            contract.nft_transfer(accounts(2), token_id.clone(), None, None); // Try to transfer to an account with a token
        }));
        assert!(transfer_result.is_err(), "Transfer should fail if receiver already owns a token");
        */}
    }

    #[test]
    fn test_offer_for_sale() {
        let mut context = get_context(accounts(0));
        testing_env!(context.build());
        let mut contract = Contract::new_default_meta(accounts(0).into());

        // Use an already minted token
        let token_id = "fan000".to_string();

        // Offer token for sale
        testing_env!(context
            .storage_usage(env::storage_usage())
            .attached_deposit(MINT_STORAGE_COST)
            .predecessor_account_id(accounts(0))
            .build());
        let price = NearToken::from_yoctonear(1000);
        contract.nft_offer_for_sale(token_id.clone(), price);

        // Check if the sale was added
        let sale = contract.sales.get(&token_id).expect("Sale should exist");
        assert_eq!(sale.owner_id, accounts(0), "Sale owner should match");
        assert_eq!(sale.price, price, "Sale price should match");
    }
    
    /* 
    #[test]
    fn test_nft_buy() {
        let mut context = get_context(accounts(0));
        testing_env!(context.build());
        let mut contract = Contract::new_default_meta(accounts(0).into());
    
       // Mint a token
        testing_env!(context
            .storage_usage(env::storage_usage())
            .attached_deposit(MINT_STORAGE_COST)
            .predecessor_account_id(accounts(0))
            .build());
        let token = contract.nft_mint(accounts(0), sample_token_metadata()).unwrap();
        let token_id = token.token_id;

        // Offer token for sale
        testing_env!(context
            .storage_usage(env::storage_usage())
            .attached_deposit(MINT_STORAGE_COST)
            .predecessor_account_id(accounts(0))
            .build());
        let price = NearToken::from_yoctonear(1000);
        contract.nft_offer_for_sale(token_id.clone(), price);

        // Buy token - attach price + 1 yoctoNEAR explicitly
        let exact_deposit = price.saturating_add(ONE_YOCTONEAR);
        testing_env!(context
            .storage_usage(env::storage_usage())
            .attached_deposit(MINT_STORAGE_COST)
            .predecessor_account_id(accounts(1))
            .build());
    
        // Log the exact deposit for debugging
        println!("Exact deposit being attached: {}", exact_deposit);
        
        contract.nft_buy(token_id.clone());
    
        // Check if token ownership changed
        let token_after_buy = contract.nft_token(token_id.clone()).unwrap();
        assert_eq!(token_after_buy.owner_id, accounts(1), "Token should be owned by buyer");
    
        // Check if sale was removed
        assert!(contract.sales.get(&token_id).is_none(), "Sale should be removed after purchase");
    }
    */

    #[test]
    fn test_remove_sale() {
        let mut context = get_context(accounts(0));
        testing_env!(context.build());
        let mut contract = Contract::new_default_meta(accounts(0).into());

        // Use an already minted token
        let token_id = "fan000".to_string(); // Assuming the first token has this ID

        // Offer token for sale
        testing_env!(context
            .storage_usage(env::storage_usage())
            .attached_deposit(MINT_STORAGE_COST)
            .predecessor_account_id(accounts(0))
            .build());
        let price = NearToken::from_yoctonear(1000);
        contract.nft_offer_for_sale(token_id.clone(), price);

        // Check if the sale was added (optional but good for debugging)
        let sale = contract.sales.get(&token_id).expect("Sale should exist");
        assert_eq!(sale.owner_id, accounts(0), "Sale owner should match");
        assert_eq!(sale.price, price, "Sale price should match");

        // Remove sale
        testing_env!(context
            .storage_usage(env::storage_usage())
            .attached_deposit(MINT_STORAGE_COST)
            .predecessor_account_id(accounts(0))
            .build());
        contract.remove_sale(token_id.clone());

        // Check if sale was removed
        assert!(contract.sales.get(&token_id).is_none(), "Sale should be removed");
    }

    #[test]
    fn test_approve() {
        let mut context = get_context(accounts(0));
        testing_env!(context.build());
        let mut contract = Contract::new_default_meta(accounts(0).into());

        // Use an already minted token
        let token_id = "fan000".to_string();

        // alice approves bob
        testing_env!(context
            .storage_usage(env::storage_usage())
            .attached_deposit(APPROVE_STORAGE_COST)
            .predecessor_account_id(accounts(0))
            .build());
        contract.nft_approve(token_id.clone(), accounts(1), None);

        testing_env!(context
            .storage_usage(env::storage_usage())
            .account_balance(env::account_balance())
            .is_view(true)
            .attached_deposit(ZERO_NEAR)
            .build());
        assert!(contract.nft_is_approved(token_id.clone(), accounts(1), Some(1)));
    }

    #[test]
    fn test_revoke() {
        let mut context = get_context(accounts(0));
        testing_env!(context.build());
        let mut contract = Contract::new_default_meta(accounts(0).into());

        // Use an already minted token
        let token_id = "fan000".to_string();
        
        // alice approves bob
        testing_env!(context
            .storage_usage(env::storage_usage())
            .attached_deposit(APPROVE_STORAGE_COST)
            .predecessor_account_id(accounts(0))
            .build());
        contract.nft_approve(token_id.clone(), accounts(1), None);

        // alice revokes bob
        testing_env!(context
            .storage_usage(env::storage_usage())
            .attached_deposit(APPROVE_STORAGE_COST)
            .predecessor_account_id(accounts(0))
            .build());
        contract.nft_revoke(token_id.clone(), accounts(1));
        testing_env!(context
            .storage_usage(env::storage_usage())
            .account_balance(env::account_balance())
            .is_view(true)
            .attached_deposit(ZERO_NEAR)
            .build());
        assert!(!contract.nft_is_approved(token_id.clone(), accounts(1), None));
    }

    #[test]
    fn test_revoke_all() {
        let mut context = get_context(accounts(0));
        testing_env!(context.build());
        let mut contract = Contract::new_default_meta(accounts(0).into());

        // Use an already minted token
        let token_id = "fan000".to_string();

        // alice approves bob
        testing_env!(context
            .storage_usage(env::storage_usage())
            .attached_deposit(APPROVE_STORAGE_COST)
            .predecessor_account_id(accounts(0))
            .build());
        contract.nft_approve(token_id.clone(), accounts(1), None);

        // alice revokes bob
        testing_env!(context
            .storage_usage(env::storage_usage())
            .attached_deposit(APPROVE_STORAGE_COST)
            .predecessor_account_id(accounts(0))
            .build());
        contract.nft_revoke_all(token_id.clone());
        testing_env!(context
            .storage_usage(env::storage_usage())
            .account_balance(env::account_balance())
            .is_view(true)
            .attached_deposit(ZERO_NEAR)
            .build());
        assert!(!contract.nft_is_approved(token_id.clone(), accounts(1), Some(1)));
    }
}