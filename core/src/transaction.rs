//! Transaction implementation for the Crypto Trust Bank blockchain
//!
//! This module defines the Transaction structure and related functionality
//! for creating, validating, and managing transactions in the blockchain.

use serde::{Deserialize, Serialize};
use std::fmt;

use crate::{calculate_hash, current_timestamp, Hash, Result, BlockchainError};

/// Represents a transaction in the blockchain
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Transaction {
    /// Unique transaction ID (hash)
    pub id: Hash,
    
    /// Timestamp when the transaction was created
    pub timestamp: u64,
    
    /// Sender's address (public key)
    pub sender: String,
    
    /// Recipient's address (public key)
    pub recipient: String,
    
    /// Amount of GENX tokens to transfer
    pub amount: u64,
    
    /// Transaction fee in GENX
    pub fee: u64,
    
    /// Optional data payload (for smart contracts)
    pub data: Option<Vec<u8>>,
    
    /// Sender's signature of the transaction
    pub signature: Option<Vec<u8>>,
}

/// Different types of transactions in the system
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum TransactionType {
    /// Regular transfer of GENX tokens
    Transfer,
    
    /// Smart contract deployment
    ContractDeploy,
    
    /// Smart contract function call
    ContractCall,
    
    /// Validator staking transaction
    Stake,
    
    /// Validator unstaking transaction
    Unstake,
}

impl Transaction {
    /// Creates a new transaction with the given parameters
    pub fn new(
        sender: String,
        recipient: String,
        amount: u64,
        fee: u64,
        data: Option<Vec<u8>>,
    ) -> Result<Self> {
        let timestamp = current_timestamp();
        
        // Create transaction without ID and signature first
        let mut tx = Self {
            id: [0u8; 32],
            timestamp,
            sender,
            recipient,
            amount,
            fee,
            data,
            signature: None,
        };
        
        // Calculate the transaction ID (hash)
        tx.id = tx.calculate_hash()?;
        
        Ok(tx)
    }
    
    /// Calculates the hash of this transaction (excluding the signature)
    pub fn calculate_hash(&self) -> Result<Hash> {
        // Create a copy without the signature for hashing
        let hash_tx = Self {
            id: [0u8; 32],
            timestamp: self.timestamp,
            sender: self.sender.clone(),
            recipient: self.recipient.clone(),
            amount: self.amount,
            fee: self.fee,
            data: self.data.clone(),
            signature: None,
        };
        
        calculate_hash(&hash_tx)
    }
    
    /// Signs the transaction with the provided private key
    pub fn sign(&mut self, _private_key: &[u8]) -> Result<()> {
        // In a real implementation, this would use ed25519 or similar
        // to sign the transaction with the private key
        // For now, we'll just set a dummy signature
        self.signature = Some(vec![1, 2, 3, 4]);
        Ok(())
    }
    
    /// Validates the transaction structure and signature
    pub fn validate(&self) -> Result<()> {
        // Check that amount is positive
        if self.amount == 0 {
            return Err(BlockchainError::InvalidTransaction(
                "Transaction amount must be positive".to_string(),
            ));
        }
        
        // Verify the transaction ID matches its contents
        let calculated_id = self.calculate_hash()?;
        if calculated_id != self.id {
            return Err(BlockchainError::InvalidTransaction(
                "Invalid transaction ID".to_string(),
            ));
        }
        
        // In a real implementation, we would verify the signature here
        // using the sender's public key
        
        Ok(())
    }
    
    /// Creates a coinbase transaction for block rewards
    pub fn new_coinbase(recipient: String, reward: u64) -> Result<Self> {
        Self::new(
            "COINBASE".to_string(),
            recipient,
            reward,
            0, // No fee for coinbase
            None,
        )
    }
}

impl fmt::Display for Transaction {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(
            f,
            "TX [{}]: {} -> {} ({} GENX)",
            hex::encode(&self.id),
            self.sender,
            self.recipient,
            self.amount
        )
    }
}