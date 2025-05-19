//! Genesis configuration for the Crypto Trust Bank blockchain
//!
//! This module defines the genesis block configuration and initial GENX distribution.

use crate::{Result, BlockchainError};
use crate::block::Block;
use crate::transaction::Transaction;

/// Maximum supply of GENX tokens (21 million)
const MAX_SUPPLY: u64 = 21_000_000 * 100_000_000; // With 8 decimal places

/// Percentage of tokens allocated to different purposes
const GENESIS_ALLOCATION_PERCENT: u64 = 60;
const VALIDATOR_REWARDS_PERCENT: u64 = 20;
const DEVELOPMENT_FUND_PERCENT: u64 = 10;
const ECOSYSTEM_GROWTH_PERCENT: u64 = 10;

/// Addresses for initial token allocation
const VALIDATOR_REWARDS_ADDRESS: &str = "GENX_VALIDATOR_REWARDS_POOL";
const DEVELOPMENT_FUND_ADDRESS: &str = "GENX_DEVELOPMENT_FUND";
const ECOSYSTEM_GROWTH_ADDRESS: &str = "GENX_ECOSYSTEM_GROWTH";

/// Creates the genesis block with initial GENX distribution
pub fn create_genesis_block() -> Result<Block> {
    // Calculate token allocations
    let genesis_allocation = (MAX_SUPPLY * GENESIS_ALLOCATION_PERCENT) / 100;
    let validator_rewards = (MAX_SUPPLY * VALIDATOR_REWARDS_PERCENT) / 100;
    let development_fund = (MAX_SUPPLY * DEVELOPMENT_FUND_PERCENT) / 100;
    let ecosystem_growth = (MAX_SUPPLY * ECOSYSTEM_GROWTH_PERCENT) / 100;
    
    // Create initial distribution transactions
    let mut transactions = Vec::new();
    
    // Add validator rewards pool allocation
    transactions.push(Transaction::new_coinbase(
        VALIDATOR_REWARDS_ADDRESS.to_string(),
        validator_rewards,
    )?);
    
    // Add development fund allocation
    transactions.push(Transaction::new_coinbase(
        DEVELOPMENT_FUND_ADDRESS.to_string(),
        development_fund,
    )?);
    
    // Add ecosystem growth allocation
    transactions.push(Transaction::new_coinbase(
        ECOSYSTEM_GROWTH_ADDRESS.to_string(),
        ecosystem_growth,
    )?);
    
    // Create the genesis block
    Block::genesis(transactions)
}

/// Initializes the blockchain with the genesis block and initial state
pub fn initialize_blockchain() -> Result<crate::chain::Blockchain> {
    let genesis_block = create_genesis_block()?;
    crate::chain::Blockchain::new(genesis_block)
}

/// Gets the maximum supply of GENX tokens
pub fn get_max_supply() -> u64 {
    MAX_SUPPLY
}

/// Gets the current circulating supply of GENX tokens
pub fn get_circulating_supply(blockchain: &crate::chain::Blockchain) -> Result<u64> {
    let state = blockchain.get_state();
    let state = state.lock().unwrap();
    Ok(state.get_total_supply())
}