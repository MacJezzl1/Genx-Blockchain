//! State management for the Crypto Trust Bank blockchain
//!
//! This module manages the state of the blockchain, including account balances,
//! smart contract state, and validator information.

use std::collections::HashMap;

use crate::{BlockchainError, Result};
use crate::block::Block;
use crate::transaction::Transaction;

/// Represents the current state of the blockchain
#[derive(Debug, Clone)]
pub struct State {
    /// Account balances (address -> balance)
    balances: HashMap<String, u64>,
    
    /// Validator stakes (validator address -> staked amount)
    validator_stakes: HashMap<String, u64>,
    
    /// Smart contract state (contract address -> state)
    contract_states: HashMap<String, Vec<u8>>,
    
    /// Total supply of GENX tokens in circulation
    total_supply: u64,
}

impl State {
    /// Creates a new empty state
    pub fn new() -> Self {
        Self {
            balances: HashMap::new(),
            validator_stakes: HashMap::new(),
            contract_states: HashMap::new(),
            total_supply: 0,
        }
    }
    
    /// Applies a block to the state
    pub fn apply_block(&mut self, block: &Block) -> Result<()> {
        // Apply each transaction in the block
        for tx in &block.transactions {
            self.apply_transaction(tx)?;
        }
        
        Ok(())
    }
    
    /// Applies a transaction to the state
    pub fn apply_transaction(&mut self, tx: &Transaction) -> Result<()> {
        // Handle coinbase transactions differently
        if tx.sender == "COINBASE" {
            // Coinbase transactions mint new tokens
            *self.balances.entry(tx.recipient.clone()).or_insert(0) += tx.amount;
            self.total_supply += tx.amount;
            return Ok(());
        }
        
        // Check that the sender has sufficient balance
        let sender_balance = self.get_balance(&tx.sender);
        if sender_balance < tx.amount + tx.fee {
            return Err(BlockchainError::InvalidTransaction(
                format!("Insufficient balance: {} < {}", sender_balance, tx.amount + tx.fee)
            ));
        }
        
        // Update sender's balance
        *self.balances.entry(tx.sender.clone()).or_insert(0) -= tx.amount + tx.fee;
        
        // Update recipient's balance
        *self.balances.entry(tx.recipient.clone()).or_insert(0) += tx.amount;
        
        // If there's a data payload, this might be a smart contract interaction
        if let Some(data) = &tx.data {
            // In a real implementation, this would execute the smart contract
            // For now, we'll just store the data in the contract state
            if !data.is_empty() {
                self.contract_states.insert(tx.recipient.clone(), data.clone());
            }
        }
        
        Ok(())
    }
    
    /// Gets the balance of an account
    pub fn get_balance(&self, address: &str) -> u64 {
        *self.balances.get(address).unwrap_or(&0)
    }
    
    /// Gets the total supply of GENX tokens
    pub fn get_total_supply(&self) -> u64 {
        self.total_supply
    }
    
    /// Gets the stake of a validator
    pub fn get_validator_stake(&self, validator: &str) -> u64 {
        *self.validator_stakes.get(validator).unwrap_or(&0)
    }
    
    /// Gets all validators and their stakes
    pub fn get_validators(&self) -> &HashMap<String, u64> {
        &self.validator_stakes
    }
    
    /// Adds or updates a validator's stake
    pub fn update_validator_stake(&mut self, validator: String, stake: u64) {
        self.validator_stakes.insert(validator, stake);
    }
}