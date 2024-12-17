use near_contract_standards::non_fungible_token::metadata::TokenMetadata;
use near_contract_standards::non_fungible_token::TokenId;

use near_sdk::serde_json::json;
use near_sdk::AccountId;
use near_workspaces::types::NearToken;
use near_workspaces::{Account, Contract};

pub async fn mint_nft(
    minter: &Account,
    contract_id: &AccountId,
    token_id: TokenId,
    token_owner_id: &AccountId,
) -> anyhow::Result<()> {
    // Check if the account already owns a token
    let owns_token: bool = minter
        .call(contract_id, "owns_token")
        .args_json((token_owner_id,))
        .view()
        .await?
        .json()?;

    if owns_token {
        return Err(anyhow::anyhow!("Receiver already owns a token"));
    }

    let token_metadata = TokenMetadata {
        title: Some(format!("Title for {token_id}")),
        description: Some(format!("Description for {token_id}")),
        media: None,
        media_hash: None,
        copies: Some(1u64),
        issued_at: None,
        expires_at: None,
        starts_at: None,
        updated_at: None,
        extra: None,
        reference: None,
        reference_hash: None,
    };
    println!("Attempting to mint token: {}, for account: {}", token_id, token_owner_id);
    let res = minter
        .call(contract_id, "nft_mint")
        .args_json(json!({"token_id": token_id, "token_owner_id": token_owner_id, "token_metadata": token_metadata}))
        .max_gas()
        .deposit(NearToken::from_yoctonear(6500000000000000000000))
        .transact()
        .await?;
    println!("Mint result: {:?}", res);
    if !res.is_success() {
        println!("Mint failed with: {:?}", res.into_result().err());
    }
    Ok(())
}

pub async fn init_nft_contract(contract: &Contract) -> anyhow::Result<()> {
    let res = contract
        .call("new_default_meta")
        .args_json((contract.id(),))
        .max_gas()
        .transact()
        .await?;
    assert!(res.is_success());

    Ok(())
}
