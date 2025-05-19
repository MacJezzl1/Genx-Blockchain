//! Block implementation for the Crypto Trust Bank blockchain
//!
//! This module defines the Block structure and related functionality
//! for creating, validating, and managing blocks in the blockchain.

use serde::{Deserialize, Serialize};
use std::fmt;

use crate::{calculate_hash, current_timestamp, Hash, Result, BlockchainError};
use crate::transaction::Transaction;

/// Represents a block in the blockchain
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Block {
    /// Block header containing metadata
    pub header: BlockHeader,
    
    /// Transactions included in this block
    pub transactions: Vec<Transaction>,
}

/// Block header containing metadata about the block
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BlockHeader {
    /// Version of the block structure
    pub version: u32,
    
    /// Height/index of the block in the chain
    pub height: u64,
    
    /// Timestamp when the block was created (seconds since Unix epoch)
    pub timestamp: u64,
    
    /// Hash of the previous block in the chain
    pub prev_hash: Hash,
    
    /// Merkle root of all transactions in the block
    pub merkle_root: Hash,
    
    /// Validator who created this block (in PoS)
    pub validator: String,
    
    /// Validator's signature of the block
    pub signature: Option<Vec<u8>>,
}

impl Block {
    /// Creates a new block with the given parameters
    pub fn new(
        height: u64,
        prev_hash: Hash,
        transactions: Vec<Transaction>,
        validator: String,
    ) -> Result<Self> {
        // Calculate merkle root from transactions
        let merkle_root = Self::calculate_merkle_root(&transactions)?;
        
        let header = BlockHeader {
            version: 1, // Initial version
            height,
            timestamp: current_timestamp(),
            prev_hash,
            merkle_root,
            validator,
            signature: None,
        };
        
        Ok(Self {
            header,
            transactions,
        })
    }
    
    /// Creates the genesis block with initial GENX distribution
    pub fn genesis(initial_distribution: Vec<Transaction>) -> Result<Self> {
        let empty_hash = [0u8; 32];
        Self::new(0, empty_hash, initial_distribution, "Genesis".to_string())
    }
    
    /// Calculates the hash of this block
    pub fn hash(&self) -> Result<Hash> {
        calculate_hash(&self.header)
    }
    
    /// Calculates the merkle root of the transactions
    fn calculate_merkle_root(transactions: &[Transaction]) -> Result<Hash> {
        if transactions.is_empty() {
            return Ok([0u8; 32]); // Empty merkle root for empty transactions
        }
        
        // For simplicity, we'll just hash all transactions together
        // In a production system, this would be a proper Merkle tree
        calculate_hash(transactions)
    }
    
    /// Validates the block structure and contents
    pub fn validate(&self) -> Result<()> {
        // Validate merkle root
        let calculated_root = Self::calculate_merkle_root(&self.transactions)?;
        if calculated_root != self.header.merkle_root {
            return Err(BlockchainError::InvalidBlock("Invalid merkle root".to_string()));
        }
        
        // Validate each transaction
        for tx in &self.transactions {
            tx.validate()?;
        }
        
        Ok(())
    }
}

impl fmt::Display for Block {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(
            f,
            "Block #{} [{}] with {} transactions",
            self.header.height,
            hex::encode(&self.hash().unwrap_or([0u8; 32])),
            self.transactions.len()
        )
    }
}