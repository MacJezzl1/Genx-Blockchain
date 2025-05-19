//! Blockchain chain implementation for Crypto Trust Bank
//!
//! This module manages the blockchain state, including adding blocks
//! and validating the entire chain.

use std::collections::HashMap;
use std::sync::{Arc, Mutex};

use crate::{BlockchainError, Hash, Result};
use crate::block::Block;
use crate::state::State;
use crate::transaction::Transaction;

/// Represents the blockchain and its current state
#[derive(Debug)]
pub struct Blockchain {
    /// All blocks in the chain, indexed by height
    blocks: HashMap<u64, Block>,
    
    /// The current state of the blockchain (account balances, etc.)
    state: Arc<Mutex<State>>,
    
    /// The hash of the latest block in the chain
    latest_hash: Hash,
    
    /// The height of the latest block in the chain
    latest_height: u64,
}

impl Blockchain {
    /// Creates a new blockchain with the genesis block
    pub fn new(genesis_block: Block) -> Result<Self> {
        // Validate the genesis block
        genesis_block.validate()?;
        
        // Calculate the genesis block hash
        let genesis_hash = genesis_block.hash()?;
        
        // Initialize the state with the genesis block
        let mut state = State::new();
        state.apply_block(&genesis_block)?;
        
        // Create the blockchain
        let mut blocks = HashMap::new();
        blocks.insert(0, genesis_block);
        
        Ok(Self {
            blocks,
            state: Arc::new(Mutex::new(state)),
            latest_hash: genesis_hash,
            latest_height: 0,
        })
    }
    
    /// Adds a new block to the chain
    pub fn add_block(&mut self, block: Block) -> Result<()> {
        // Validate the block
        block.validate()?;
        
        // Check that the block's height is one more than the current height
        if block.header.height != self.latest_height + 1 {
            return Err(BlockchainError::InvalidBlock(
                format!("Invalid block height: expected {}, got {}", 
                        self.latest_height + 1, block.header.height)
            ));
        }
        
        // Check that the block's prev_hash matches the latest hash
        if block.header.prev_hash != self.latest_hash {
            return Err(BlockchainError::InvalidBlock(
                "Block's previous hash doesn't match the latest hash".to_string()
            ));
        }
        
        // Apply the block to the state
        {
            let mut state = self.state.lock().unwrap();
            state.apply_block(&block)?;
        }
        
        // Update the blockchain
        let block_hash = block.hash()?;
        let block_height = block.header.height;
        
        self.blocks.insert(block_height, block);
        self.latest_hash = block_hash;
        self.latest_height = block_height;
        
        Ok(())
    }
    
    /// Gets a block by its height
    pub fn get_block_by_height(&self, height: u64) -> Option<&Block> {
        self.blocks.get(&height)
    }
    
    /// Gets the latest block in the chain
    pub fn get_latest_block(&self) -> Option<&Block> {
        self.blocks.get(&self.latest_height)
    }
    
    /// Gets the current state of the blockchain
    pub fn get_state(&self) -> Arc<Mutex<State>> {
        self.state.clone()
    }
    
    /// Gets the balance of an account
    pub fn get_balance(&self, address: &str) -> Result<u64> {
        let state = self.state.lock().unwrap();
        Ok(state.get_balance(address))
    }
    
    /// Validates the entire blockchain
    pub fn validate_chain(&self) -> Result<()> {
        // Start with a fresh state
        let mut state = State::new();
        
        // Validate each block in order
        for height in 0..=self.latest_height {
            let block = self.blocks.get(&height).ok_or_else(|| {
                BlockchainError::StateError(format!("Missing block at height {}", height))
            })?;
            
            // Validate the block
            block.validate()?;
            
            // Apply the block to the state
            state.apply_block(block)?;
        }
        
        Ok(())
    }
    
    /// Creates a new transaction and adds it to the mempool
    pub fn create_transaction(
        &self,
        sender: String,
        recipient: String,
        amount: u64,
        fee: u64,
        data: Option<Vec<u8>>,
    ) -> Result<Transaction> {
        // Check that the sender has sufficient balance
        let sender_balance = self.get_balance(&sender)?;
        if sender_balance < amount + fee {
            return Err(BlockchainError::InvalidTransaction(
                format!("Insufficient balance: {} < {}", sender_balance, amount + fee)
            ));
        }
        
        // Create the transaction
        Transaction::new(sender, recipient, amount, fee, data)
    }
}