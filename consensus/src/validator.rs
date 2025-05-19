//! Validator management for the Crypto Trust Bank blockchain
//!
//! This module handles validator registration, staking, and selection
//! for the Proof of Stake consensus mechanism.

use serde::{Deserialize, Serialize};
use core::{BlockchainError, Result};

/// Represents a validator in the blockchain network
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Validator {
    /// Validator's address (public key)
    pub address: String,
    
    /// Amount of GENX tokens staked by this validator
    pub stake: u64,
    
    /// Height of the last block produced by this validator
    pub last_block_produced: u64,
}

/// Validator status in the network
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum ValidatorStatus {
    /// Validator is active and can produce blocks
    Active,
    
    /// Validator is inactive (not enough stake or not selected)
    Inactive,
    
    /// Validator has been slashed for malicious behavior
    Slashed,
    
    /// Validator is jailed temporarily
    Jailed,
}

impl Validator {
    /// Creates a new validator with the given address and stake
    pub fn new(address: String, stake: u64) -> Self {
        Self {
            address,
            stake,
            last_block_produced: 0,
        }
    }
    
    /// Updates the validator's stake
    pub fn update_stake(&mut self, new_stake: u64) {
        self.stake = new_stake;
    }
    
    /// Records that this validator produced a block at the given height
    pub fn record_block_production(&mut self, height: u64) {
        self.last_block_produced = height;
    }
}

/// Manages the set of validators in the network
pub struct ValidatorManager {
    /// All registered validators
    validators: Vec<Validator>,
    
    /// Minimum stake required to become a validator
    min_stake: u64,
    
    /// Maximum number of active validators
    max_validators: usize,
}

impl ValidatorManager {
    /// Creates a new validator manager with the given parameters
    pub fn new(min_stake: u64, max_validators: usize) -> Self {
        Self {
            validators: Vec::new(),
            min_stake,
            max_validators,
        }
    }
    
    /// Registers a new validator
    pub fn register_validator(&mut self, address: String, stake: u64) -> Result<()> {
        // Check if the validator already exists
        if self.validators.iter().any(|v| v.address == address) {
            return Err(BlockchainError::StateError(
                format!("Validator {} already registered", address)
            ));
        }
        
        // Check if the stake is sufficient
        if stake < self.min_stake {
            return Err(BlockchainError::StateError(
                format!("Insufficient stake: {} < {}", stake, self.min_stake)
            ));
        }
        
        // Add the validator
        let validator = Validator::new(address, stake);
        self.validators.push(validator);
        
        Ok(())
    }
    
    /// Updates a validator's stake
    pub fn update_validator_stake(&mut self, address: &str, new_stake: u64) -> Result<()> {
        // Find the validator
        let validator = self.validators.iter_mut().find(|v| v.address == address)
            .ok_or_else(|| BlockchainError::StateError(
                format!("Validator {} not found", address)
            ))?;
        
        // Update the stake
        validator.update_stake(new_stake);
        
        Ok(())
    }
    
    /// Gets the active validator set
    pub fn get_active_validators(&self) -> Vec<Validator> {
        // Sort validators by stake (descending)
        let mut sorted = self.validators.clone();
        sorted.sort_by(|a, b| b.stake.cmp(&a.stake));
        
        // Take the top validators with sufficient stake
        sorted.into_iter()
            .filter(|v| v.stake >= self.min_stake)
            .take(self.max_validators)
            .collect()
    }
    
    /// Slashes a validator for malicious behavior
    pub fn slash_validator(&mut self, address: &str, slash_percentage: f64) -> Result<u64> {
        // Find the validator
        let validator = self.validators.iter_mut().find(|v| v.address == address)
            .ok_or_else(|| BlockchainError::StateError(
                format!("Validator {} not found", address)
            ))?;
        
        // Calculate the slash amount
        let slash_amount = (validator.stake as f64 * slash_percentage) as u64;
        
        // Update the stake
        validator.stake = validator.stake.saturating_sub(slash_amount);
        
        Ok(slash_amount)
    }
    
    /// Removes a validator from the set
    pub fn remove_validator(&mut self, address: &str) -> Result<()> {
        let initial_len = self.validators.len();
        self.validators.retain(|v| v.address != address);
        
        if self.validators.len() == initial_len {
            return Err(BlockchainError::StateError(
                format!("Validator {} not found", address)
            ));
        }
        
        Ok(())
    }
}