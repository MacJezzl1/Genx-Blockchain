//! Consensus engine for the Crypto Trust Bank blockchain
//!
//! This module implements a Proof of Stake (PoS) consensus mechanism
//! for validator selection, block production, and finality.

use std::collections::{HashMap, HashSet};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

use core::block::Block;
use core::chain::Blockchain;
use core::transaction::Transaction;
use core::{BlockchainError, Result};
use rand::{Rng, SeedableRng};
use rand::rngs::StdRng;
use serde::{Deserialize, Serialize};
use thiserror::Error;

pub mod pos;
pub mod validator;
pub mod finality;

/// Consensus error types
#[derive(Debug, Error)]
pub enum ConsensusError {
    #[error("Blockchain error: {0}")]
    BlockchainError(#[from] BlockchainError),
    
    #[error("Validator error: {0}")]
    ValidatorError(String),
    
    #[error("Consensus timeout: {0}")]
    Timeout(String),
    
    #[error("Insufficient stake: {0}")]
    InsufficientStake(String),
}

/// Consensus parameters for the PoS mechanism
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConsensusParams {
    /// Minimum stake required to become a validator
    pub min_stake: u64,
    
    /// Block time target in seconds
    pub block_time: u64,
    
    /// Number of validators in the active set
    pub validator_set_size: usize,
    
    /// Number of blocks before a checkpoint
    pub checkpoint_interval: u64,
    
    /// Percentage of validators required for finality
    pub finality_threshold: f64,
    
    /// Slashing percentage for malicious behavior
    pub slashing_percentage: f64,
}

impl Default for ConsensusParams {
    fn default() -> Self {
        Self {
            min_stake: 1000 * 100_000_000, // 1000 GENX
            block_time: 5, // 5 seconds
            validator_set_size: 21,
            checkpoint_interval: 100,
            finality_threshold: 0.67, // 2/3 majority
            slashing_percentage: 0.10, // 10% slashing
        }
    }
}

/// Manages the consensus process for the blockchain
pub struct ConsensusEngine {
    /// Reference to the blockchain
    blockchain: Arc<Mutex<Blockchain>>,
    
    /// Consensus parameters
    params: ConsensusParams,
    
    /// Current active validators
    active_validators: Vec<validator::Validator>,
    
    /// Pending transactions (mempool)
    pending_transactions: Vec<Transaction>,
    
    /// Last block production time
    last_block_time: Instant,
}

impl ConsensusEngine {
    /// Creates a new consensus engine with the given blockchain and parameters
    pub fn new(blockchain: Arc<Mutex<Blockchain>>, params: ConsensusParams) -> Self {
        Self {
            blockchain,
            params,
            active_validators: Vec::new(),
            pending_transactions: Vec::new(),
            last_block_time: Instant::now(),
        }
    }
    
    /// Initializes the consensus engine
    pub fn initialize(&mut self) -> Result<()> {
        // Update the active validator set
        self.update_validator_set()?;
        
        // Initialize the last block time
        self.last_block_time = Instant::now();
        
        Ok(())
    }
    
    /// Updates the active validator set based on stake
    pub fn update_validator_set(&mut self) -> Result<()> {
        let blockchain = self.blockchain.lock().unwrap();
        let state = blockchain.get_state();
        let state = state.lock().unwrap();
        
        // Get all validators and their stakes
        let validators = state.get_validators();
        
        // Sort validators by stake (descending)
        let mut sorted_validators: Vec<_> = validators.iter().collect();
        sorted_validators.sort_by(|a, b| b.1.cmp(a.1));
        
        // Select the top validators based on stake
        let mut active_validators = Vec::new();
        for (address, stake) in sorted_validators {
            if *stake >= self.params.min_stake && active_validators.len() < self.params.validator_set_size {
                active_validators.push(validator::Validator {
                    address: address.clone(),
                    stake: *stake,
                    last_block_produced: 0,
                });
            }
        }
        
        self.active_validators = active_validators;
        
        Ok(())
    }
    
    /// Selects the next validator to produce a block
    pub fn select_next_validator(&self) -> Result<&validator::Validator> {
        if self.active_validators.is_empty() {
            return Err(ConsensusError::ValidatorError("No active validators".to_string()).into());
        }
        
        // Get the latest block height
        let blockchain = self.blockchain.lock().unwrap();
        let latest_block = blockchain.get_latest_block().ok_or_else(|| {
            BlockchainError::StateError("No blocks in the chain".to_string())
        })?;
        
        let height = latest_block.header.height;
        
        // Use a deterministic random selection weighted by stake
        let seed = height.to_le_bytes();
        let mut rng = StdRng::from_seed([0u8; 32]); // Use the seed properly in a real implementation
        
        // Calculate total stake of active validators
        let total_stake: u64 = self.active_validators.iter().map(|v| v.stake).sum();
        
        // Select a validator based on stake weight
        let selection_point = rng.gen_range(0..total_stake);
        let mut cumulative_stake = 0;
        
        for validator in &self.active_validators {
            cumulative_stake += validator.stake;
            if cumulative_stake > selection_point {
                return Ok(validator);
            }
        }
        
        // Fallback to the first validator (should never happen)
        Ok(&self.active_validators[0])
    }
    
    /// Adds a transaction to the pending pool
    pub fn add_transaction(&mut self, transaction: Transaction) {
        self.pending_transactions.push(transaction);
    }
    
    /// Produces a new block if it's time
    pub fn try_produce_block(&mut self) -> Result<Option<Block>> {
        // Check if it's time to produce a new block
        let elapsed = self.last_block_time.elapsed();
        if elapsed < Duration::from_secs(self.params.block_time) {
            return Ok(None);
        }
        
        // Select the next validator
        let validator = self.select_next_validator()?.clone();
        
        // Get the latest block
        let blockchain = self.blockchain.lock().unwrap();
        let latest_block = blockchain.get_latest_block().ok_or_else(|| {
            BlockchainError::StateError("No blocks in the chain".to_string())
        })?;
        
        let height = latest_block.header.height;
        let prev_hash = latest_block.hash()?;
        
        // Select transactions for the new block
        let mut block_transactions = Vec::new();
        
        // Add a coinbase transaction for the validator reward
        let reward = self.calculate_block_reward(height);
        let coinbase = Transaction::new_coinbase(validator.address.clone(), reward)?;
        block_transactions.push(coinbase);
        
        // Add pending transactions (up to a limit)
        let max_transactions = 1000; // Arbitrary limit for now
        let mut added = 0;
        
        let mut remaining_transactions = Vec::new();
        for tx in self.pending_transactions.drain(..) {
            if added < max_transactions {
                block_transactions.push(tx);
                added += 1;
            } else {
                remaining_transactions.push(tx);
            }
        }
        
        self.pending_transactions = remaining_transactions;
        
        // Create the new block
        let new_block = Block::new(
            height + 1,
            prev_hash,
            block_transactions,
            validator.address,
        )?;
        
        // Update the last block time
        self.last_block_time = Instant::now();
        
        Ok(Some(new_block))
    }
    
    /// Calculates the block reward for a given height
    fn calculate_block_reward(&self, height: u64) -> u64 {
        // Implement a deflationary model similar to Bitcoin
        // Initial reward is 50 GENX, halving every 210,000 blocks
        let initial_reward = 50 * 100_000_000; // 50 GENX with 8 decimal places
        let halving_interval = 210_000;
        
        let halvings = height / halving_interval;
        if halvings >= 64 { // After 64 halvings, reward is effectively 0
            return 0;
        }
        
        initial_reward >> halvings
    }
}