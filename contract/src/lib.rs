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
use near_sdk::collections::LazyOption;
use near_sdk::json_types::U128;
use near_sdk::{
    env, near, require, AccountId, BorshStorageKey, PanicOnDefault, Promise, PromiseOrValue,
};
use std::collections::HashMap;

#[derive(PanicOnDefault)]
#[near(contract_state)]
pub struct Contract {
    tokens: NonFungibleToken,
    metadata: LazyOption<NFTContractMetadata>,
    minted_count: u64, // keep track of minted tokens
}

#[derive(BorshStorageKey)]
#[near]
enum StorageKey {
    NonFungibleToken,
    Metadata,
    TokenMetadata,
    Enumeration,
    Approval,
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
        Self {
            tokens: NonFungibleToken::new(
                StorageKey::NonFungibleToken,
                owner_id,
                Some(StorageKey::TokenMetadata),
                Some(StorageKey::Enumeration),
                Some(StorageKey::Approval),
            ),
            metadata: LazyOption::new(StorageKey::Metadata, Some(&metadata)),
            minted_count: 0, // Initialize minted_count to zero
        }
    }

    /// Mint a new token with ID=`token_id` belonging to `token_owner_id`.
    #[payable]
    #[handle_result]
    pub fn nft_mint(
        &mut self,
        token_owner_id: AccountId,
        mut token_metadata: TokenMetadata,
    ) -> Result<Token, String> {
        {/* // uncomment to restrict minting to the contract owner
        if env::predecessor_account_id() != self.tokens.owner_id {
            return Err("Unauthorized".to_string());
        }
        */}
        if self.minted_count >= 1000 {
            return Err("Cannot mint more than 1000 tokens".to_string());
        }
        /* 
        // uncomment to activate the one-token-per-account restriction
        if self.owns_token(token_owner_id.clone()) {
            return Err("Account already owns a token".to_string());
        }
        */
        // Generate the token ID based on the minted count
        let token_id = format!("fan{:03}", self.minted_count);
        // capture the current timestamp
        let mint_timestamp = env::block_timestamp();

        // Store the timestamp in the issued_at field of the metadata
        token_metadata.issued_at = Some(mint_timestamp.to_string());

        let token = self.tokens.internal_mint(token_id, token_owner_id, Some(token_metadata));
        self.minted_count += 1;
    
        Ok(token)
    }

    // check if an account owns a token
    pub fn owns_token(&self, account_id:AccountId) -> bool {
        self.tokens.nft_tokens_for_owner(account_id, None, Some(1)).len() > 0
    }

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
        /* 
        // uncomment to activate the one-token-per-account restriction
        if self.owns_token(receiver_id.clone()) {
            env::panic_str("Receiver already owns a token");
        }
        */

        let token = self.tokens.nft_token(token_id.clone()).unwrap_or_else(|| {
            env::panic_str("Token not found");
        });
        /* 
        // uncomment to activate the 1-year-time-lock-before-transfer restriction 
        let mint_timestamp = token.metadata
            .as_ref()
            .and_then(|m| m.issued_at.as_ref())
            .and_then(|s| s.parse::<u64>().ok())
            .unwrap_or(0);
    
        if env::block_timestamp() - mint_timestamp < 31_536_000_000_000_000 {
            env::panic_str("Transfer not allowed until one year after mint");
        }
        */

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
    use near_sdk::test_utils::{accounts, VMContextBuilder};
    use near_sdk::{testing_env, NearToken};

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
        testing_env!(context.build());
        let contract = Contract::new_default_meta(accounts(1).into());
        testing_env!(context.is_view(true).build());
        assert_eq!(contract.nft_token("1".to_string()), None);
    }

    #[test]
    #[should_panic(expected = "The contract is not initialized")]
    fn test_default() {
        let context = get_context(accounts(1));
        testing_env!(context.build());
        let _contract = Contract::default();
    }

    #[test]
    fn test_mint() {
        let mut context = get_context(accounts(0));
        testing_env!(context.build());
        let mut contract = Contract::new_default_meta(accounts(0).into());
    
        // Test minting up to the 1000 token limit with the same account
        for i in 0..1000 {
            testing_env!(context
                .storage_usage(env::storage_usage())
                .attached_deposit(MINT_STORAGE_COST)
                .predecessor_account_id(accounts(0))
                .build());

            let account_id = accounts(0);
            
            let result = contract.nft_mint(account_id.clone(), sample_token_metadata());
            
            if result.is_err() {
                println!("Failed to mint token for account {}. Error: {:?}", account_id, result.unwrap_err());
                panic!("Minting token failed");
            }
            assert!(result.is_ok(), "Minting tokens up to 1000 should succeed");
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

    #[test]
    fn test_transfer() {
        let mut context = get_context(accounts(0));
        testing_env!(context.build());
        let mut contract = Contract::new_default_meta(accounts(0).into());

        testing_env!(context
            .storage_usage(env::storage_usage())
            .attached_deposit(MINT_STORAGE_COST)
            .predecessor_account_id(accounts(0))
            .build());
        let result = contract.nft_mint(accounts(0), sample_token_metadata()).unwrap();
        let token_id = result.token_id; // Capture the auto-generated token ID

        // test immediate transfer success without one-year restriction
        testing_env!(context
            .storage_usage(env::storage_usage())
            .attached_deposit(ONE_YOCTONEAR)
            .predecessor_account_id(accounts(0))
            .build());
        let transfer_result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            contract.nft_transfer(accounts(1), token_id.clone(), None, None);
        }));

        /* 
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
        */

        assert!(transfer_result.is_ok(), "Transfer should succeed");    
        
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
            panic!("token not correctly created, or not found by nft_token");
        }
        /* 
        // uncomment to test the one-token-per-account restriction
        let transfer_result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            contract.nft_mint(accounts(2), sample_token_metadata()).unwrap(); // Mint another token
            contract.nft_transfer(accounts(2), token_id.clone(), None, None); // Try to transfer to an account with a token
        }));
        assert!(transfer_result.is_err(), "Transfer should fail if receiver already owns a token");
        */
    }

    #[test]
    fn test_approve() {
        let mut context = get_context(accounts(0));
        testing_env!(context.build());
        let mut contract = Contract::new_default_meta(accounts(0).into());

        testing_env!(context
            .storage_usage(env::storage_usage())
            .attached_deposit(MINT_STORAGE_COST)
            .predecessor_account_id(accounts(0))
            .build());
        let result = contract.nft_mint(accounts(0), sample_token_metadata()).unwrap();
        let token_id = result.token_id; // Capture the auto-generated token ID

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

        testing_env!(context
            .storage_usage(env::storage_usage())
            .attached_deposit(MINT_STORAGE_COST)
            .predecessor_account_id(accounts(0))
            .build());
        let result = contract.nft_mint(accounts(0), sample_token_metadata()).unwrap();
        let token_id = result.token_id; // Capture the auto-generated token ID
        
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
            .attached_deposit(ONE_YOCTONEAR)
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

        testing_env!(context
            .storage_usage(env::storage_usage())
            .attached_deposit(MINT_STORAGE_COST)
            .predecessor_account_id(accounts(0))
            .build());
        let result = contract.nft_mint(accounts(0), sample_token_metadata()).unwrap();
        let token_id = result.token_id; // Capture the auto-generated token ID

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
            .attached_deposit(ONE_YOCTONEAR)
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