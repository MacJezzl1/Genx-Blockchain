//! Finality mechanism for the Crypto Trust Bank blockchain
//!
//! This module implements the finality rules that determine when blocks
//! are considered irreversible in the blockchain.

use std::collections::{HashMap, HashSet};

use core::block::Block;
use core::{BlockchainError, Hash, Result};

use crate::validator::Validator;
use crate::ConsensusParams;

/// Represents a checkpoint in the blockchain
#[derive(Debug, Clone)]
pub struct Checkpoint {
    /// Height of the checkpoint block
    pub height: u64,
    
    /// Hash of the checkpoint block
    pub block_hash: Hash,
    
    /// Validators who have voted for this checkpoint
    pub votes: HashSet<String>,
    
    /// Whether this checkpoint is finalized
    pub finalized: bool,
}

/// Manages the finality of blocks in the blockchain
pub struct FinalityManager {
    /// Consensus parameters
    params: ConsensusParams,
    
    /// Checkpoints indexed by height
    checkpoints: HashMap<u64, Checkpoint>,
    
    /// The latest finalized checkpoint height
    latest_finalized_height: u64,
}

impl FinalityManager {
    /// Creates a new finality manager with the given parameters
    pub fn new(params: ConsensusParams) -> Self {
        Self {
            params,
            checkpoints: HashMap::new(),
            latest_finalized_height: 0,
        }
    }
    
    /// Initializes the finality manager with the genesis block
    pub fn initialize_with_genesis(&mut self, genesis_block: &Block) -> Result<()> {
        let genesis_hash = genesis_block.hash()?;
        
        // Create a checkpoint for the genesis block
        let mut votes = HashSet::new();
        votes.insert("Genesis".to_string());
        
        let checkpoint = Checkpoint {
            height: 0,
            block_hash: genesis_hash,
            votes,
            finalized: true,
        };
        
        self.checkpoints.insert(0, checkpoint);
        self.latest_finalized_height = 0;
        
        Ok(())
    }
    
    /// Adds a vote for a checkpoint from a validator
    pub fn add_checkpoint_vote(&mut self, height: u64, block_hash: Hash, validator: &Validator) -> Result<bool> {
        // Check if this is a valid checkpoint height
        if height % self.params.checkpoint_interval != 0 {
            return Err(BlockchainError::StateError(
                format!("Invalid checkpoint height: {}", height)
            ).into());
        }
        
        // Get or create the checkpoint
        let checkpoint = self.checkpoints.entry(height).or_insert_with(|| Checkpoint {
            height,
            block_hash,
            votes: HashSet::new(),
            finalized: false,
        });
        
        // Check that the block hash matches
        if checkpoint.block_hash != block_hash {
            return Err(BlockchainError::StateError(
                format!("Checkpoint hash mismatch at height {}", height)
            ).into());
        }
        
        // Add the validator's vote
        checkpoint.votes.insert(validator.address.clone());
        
        // Check if the checkpoint can be finalized
        self.try_finalize_checkpoint(height)
    }
    
    /// Tries to finalize a checkpoint if it has enough votes
    fn try_finalize_checkpoint(&mut self, height: u64) -> Result<bool> {
        let checkpoint = match self.checkpoints.get_mut(&height) {
            Some(cp) => cp,
            None => return Ok(false),
        };
        
        // If already finalized, nothing to do
        if checkpoint.finalized {
            return Ok(true);
        }
        
        // Calculate the total stake of validators who voted
        let total_stake = 0; // In a real implementation, we would sum the stake of all validators
        
        // Calculate the threshold stake required for finality
        let threshold_stake = 0; // In a real implementation, this would be a percentage of total stake
        
        // Check if we have enough votes for finality
        if checkpoint.votes.len() >= 2 { // Simplified for now, should use stake-weighted voting
            checkpoint.finalized = true;
            
            // Update the latest finalized height if this is newer
            if height > self.latest_finalized_height {
                self.latest_finalized_height = height;
            }
            
            return Ok(true);
        }
        
        Ok(false)
    }
    
    /// Gets the latest finalized checkpoint height
    pub fn get_latest_finalized_height(&self) -> u64 {
        self.latest_finalized_height
    }
    
    /// Checks if a block at the given height is finalized
    pub fn is_finalized(&self, height: u64) -> bool {
        // All blocks up to the latest finalized checkpoint are considered finalized
        height <= self.latest_finalized_height
    }
    
    /// Gets all checkpoints
    pub fn get_checkpoints(&self) -> &HashMap<u64, Checkpoint> {
        &self.checkpoints
    }
    
    /// Creates a new checkpoint at the given height
    pub fn create_checkpoint(&mut self, height: u64, block_hash: Hash) -> Result<()> {
        // Check if this is a valid checkpoint height
        if height % self.params.checkpoint_interval != 0 {
            return Err(BlockchainError::StateError(
                format!("Invalid checkpoint height: {}", height)
            ).into());
        }
        
        // Create the checkpoint
        let checkpoint = Checkpoint {
            height,
            block_hash,
            votes: HashSet::new(),
            finalized: false,
        };
        
        self.checkpoints.insert(height, checkpoint);
        
        Ok(())
    }
}