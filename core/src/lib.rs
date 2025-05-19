//! Core blockchain implementation for Crypto Trust Bank
//!
//! This module contains the fundamental blockchain components including:
//! - Block and transaction structures
//! - Chain management
//! - Genesis block configuration
//! - State management

use std::collections::HashMap;
use std::fmt;
use std::time::{SystemTime, UNIX_EPOCH};

use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use thiserror::Error;

pub mod block;
pub mod chain;
pub mod genesis;
pub mod transaction;
pub mod state;

/// Blockchain error types
#[derive(Debug, Error)]
pub enum BlockchainError {
    #[error("Invalid block: {0}")]
    InvalidBlock(String),
    
    #[error("Invalid transaction: {0}")]
    InvalidTransaction(String),
    
    #[error("Chain state error: {0}")]
    StateError(String),
    
    #[error("Serialization error: {0}")]
    SerializationError(String),
    
    #[error("IO error: {0}")]
    IoError(#[from] std::io::Error),
}

/// Result type for blockchain operations
pub type Result<T> = std::result::Result<T, BlockchainError>;

/// Hash type used throughout the blockchain
pub type Hash = [u8; 32];

/// Converts a hash to a hex string for display
pub fn hash_to_hex(hash: &Hash) -> String {
    hex::encode(hash)
}

/// Calculates the SHA-256 hash of the provided data
pub fn calculate_hash<T: Serialize>(data: &T) -> Result<Hash> {
    let serialized = serde_json::to_string(data)
        .map_err(|e| BlockchainError::SerializationError(e.to_string()))?;
    
    let mut hasher = Sha256::new();
    hasher.update(serialized.as_bytes());
    let result = hasher.finalize();
    
    let mut hash = [0u8; 32];
    hash.copy_from_slice(&result);
    Ok(hash)
}

/// Gets the current timestamp in seconds since the Unix epoch
pub fn current_timestamp() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .expect("Time went backwards")
        .as_secs()
}