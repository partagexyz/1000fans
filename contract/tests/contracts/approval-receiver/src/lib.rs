/*!
A stub contract that implements nft_on_approve for e2e testing nft_approve.
*/
use near_contract_standards::non_fungible_token::approval::NonFungibleTokenApprovalReceiver;
use near_contract_standards::non_fungible_token::TokenId;
use near_sdk::{env, log, near, require, AccountId, Gas, PromiseOrValue};

/// It is estimated that we need to attach 5 TGas for the code execution and 5 TGas for cross-contract call
const GAS_FOR_NFT_ON_APPROVE: Gas = Gas::from_tgas(10);

#[near(contract_state)]
#[derive(Default)]
pub struct ApprovalReceiver {}

// Have to repeat the same trait for our own implementation.
pub trait ValueReturnTrait {
    fn ok_go(&self, msg: String) -> PromiseOrValue<String>;
}

#[near]
impl NonFungibleTokenApprovalReceiver for ApprovalReceiver {
    /// Could do anything useful to the approval-receiving contract, such as store the given
    /// approval_id for use later when calling the NFT contract. Can also return whatever it wants,
    /// maybe after further promise calls. This one simulates "return anything" behavior only.
    /// Supports the following `msg` patterns:
    /// * "return-now" - immediately return `"cool"`
    /// * anything else - return the given `msg` after one more cross-contract call
    fn nft_on_approve(
        &mut self,
        token_id: TokenId,
        owner_id: AccountId,
        approval_id: u64,
        msg: String,
    ) -> PromiseOrValue<String> {
        // Verifying that we were called by non-fungible token contract that we expect.
        log!(
            "in nft_on_approve; sender_id={}, previous_owner_id={}, token_id={}, msg={}",
            &token_id,
            &owner_id,
            &approval_id,
            msg
        );
        match msg.as_str() {
            "return-now" => PromiseOrValue::Value("cool".to_string()),
            _ => {
                let prepaid_gas = env::prepaid_gas();
                let account_id = env::current_account_id();
                Self::ext(account_id)
                    .with_static_gas(prepaid_gas.saturating_sub(GAS_FOR_NFT_ON_APPROVE))
                    .ok_go(msg)
                    .into()
            }
        }
    }
}

#[near]
impl ValueReturnTrait for ApprovalReceiver {
    fn ok_go(&self, msg: String) -> PromiseOrValue<String> {
        log!("in ok_go, msg={}", msg);
        PromiseOrValue::Value(msg)
    }
}
