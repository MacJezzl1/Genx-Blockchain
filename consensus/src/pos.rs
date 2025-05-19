//! Proof of Stake (PoS) implementation for the Crypto Trust Bank blockchain
//!
//! This module implements the core PoS algorithm for validator selection,
//! block production, and rewards distribution.

use std::collections::HashMap;
use std::time::{Duration, Instant};

use rand::{Rng, SeedableRng};
use rand::rngs::StdRng;

use core::block::Block;
use core::transaction::Transaction;
use core::{BlockchainError, Result};

use crate::validator::{Validator, ValidatorStatus};
use crate::ConsensusError;
use crate::ConsensusParams;

/// Manages the Proof of Stake consensus mechanism
pub struct PoSConsensus {
    /// Consensus parameters
    params: ConsensusParams,
    
    /// Active validators in the current epoch
    active_validators: Vec<Validator>,
    
    /// Validator performance metrics
    validator_metrics: HashMap<String, ValidatorMetrics>,
    
    /// Current epoch number
    current_epoch: u64,
    
    /// Epoch start time
    epoch_start: Instant,
}

/// Metrics tracking validator performance
#[derive(Debug, Clone)]
pub struct ValidatorMetrics {
    /// Number of blocks produced in the current epoch
    blocks_produced: u64,
    
    /// Number of blocks missed in the current epoch
    blocks_missed: u64,
    
    /// Uptime percentage (0-100)
    uptime: f64,
    
    /// Last seen timestamp
    last_seen: u64,
}

impl PoSConsensus {
    /// Creates a new PoS consensus instance
    pub fn new(params: ConsensusParams) -> Self {
        Self {
            params,
            active_validators: Vec::new(),
            validator_metrics: HashMap::new(),
            current_epoch: 0,
            epoch_start: Instant::now(),
        }
    }
    
    /// Updates the active validator set based on stake
    pub fn update_validator_set(&mut self, validators: Vec<Validator>) {
        // Sort validators by stake (descending)
        let mut sorted = validators;
        sorted.sort_by(|a, b| b.stake.cmp(&a.stake));
        
        // Take the top validators with sufficient stake
        self.active_validators = sorted.into_iter()
            .filter(|v| v.stake >= self.params.min_stake)
            .take(self.params.validator_set_size)
            .collect();
        
        // Initialize metrics for new validators
        for validator in &self.active_validators {
            if !self.validator_metrics.contains_key(&validator.address) {
                self.validator_metrics.insert(validator.address.clone(), ValidatorMetrics {
                    blocks_produced: 0,
                    blocks_missed: 0,
                    uptime: 100.0,
                    last_seen: core::current_timestamp(),
                });
            }
        }
    }
    
    /// Selects the next validator to produce a block
    pub fn select_validator(&self, block_height: u64) -> Result<Validator> {
        if self.active_validators.is_empty() {
            return Err(ConsensusError::ValidatorError("No active validators".to_string()).into());
        }
        
        // Use a deterministic random selection weighted by stake
        // The seed is derived from the block height for determinism
        let seed = block_height.to_le_bytes();
        let mut seed_array = [0u8; 32];
        for (i, byte) in seed.iter().enumerate() {
            if i < 32 {
                seed_array[i] = *byte;
            }
        }
        
        let mut rng = StdRng::from_seed(seed_array);
        
        // Calculate total stake of active validators
        let total_stake: u64 = self.active_validators.iter().map(|v| v.stake).sum();
        
        // Select a validator based on stake weight
        let selection_point = rng.gen_range(0..total_stake);
        let mut cumulative_stake = 0;
        
        for validator in &self.active_validators {
            cumulative_stake += validator.stake;
            if cumulative_stake > selection_point {
                return Ok(validator.clone());
            }
        }
        
        // Fallback to the first validator (should never happen)
        Ok(self.active_validators[0].clone())
    }
    
    /// Records that a validator produced a block
    pub fn record_block_production(&mut self, validator_address: &str, block_height: u64) {
        if let Some(metrics) = self.validator_metrics.get_mut(validator_address) {
            metrics.blocks_produced += 1;
            metrics.last_seen = core::current_timestamp();
        }
        
        // Find the validator and update its last block produced
        if let Some(validator) = self.active_validators.iter_mut().find(|v| v.address == validator_address) {
            validator.record_block_production(block_height);
        }
    }
    
    /// Records that a validator missed a block
    pub fn record_missed_block(&mut self, validator_address: &str) {
        if let Some(metrics) = self.validator_metrics.get_mut(validator_address) {
            metrics.blocks_missed += 1;
            
            // Update uptime
            let total_blocks = metrics.blocks_produced + metrics.blocks_missed;
            if total_blocks > 0 {
                metrics.uptime = (metrics.blocks_produced as f64 / total_blocks as f64) * 100.0;
            }
        }
    }
    
    /// Calculates the block reward for a given height
    pub fn calculate_block_reward(&self, height: u64) -> u64 {
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
    
    /// Checks if it's time to start a new epoch
    pub fn check_epoch_transition(&mut self) -> bool {
        let epoch_duration = Duration::from_secs(self.params.block_time * 100); // 100 blocks per epoch
        
        if self.epoch_start.elapsed() >= epoch_duration {
            self.current_epoch += 1;
            self.epoch_start = Instant::now();
            
            // Reset block production metrics for the new epoch
            for metrics in self.validator_metrics.values_mut() {
                metrics.blocks_produced = 0;
                metrics.blocks_missed = 0;
            }
            
            return true;
        }
        
        false
    }
    
    /// Gets validator performance metrics
    pub fn get_validator_metrics(&self) -> &HashMap<String, ValidatorMetrics> {
        &self.validator_metrics
    }
    
    /// Gets the current epoch number
    pub fn get_current_epoch(&self) -> u64 {
        self.current_epoch
    }
}