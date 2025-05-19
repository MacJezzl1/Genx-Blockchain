//! Node implementation for the Crypto Trust Bank blockchain
//!
//! This module integrates the core blockchain, consensus engine, and
//! networking layer to create a complete blockchain node.

use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

use core::block::Block;
use core::chain::Blockchain;
use core::transaction::Transaction;
use core::{BlockchainError, Result};

use consensus::ConsensusEngine;
use consensus::ConsensusParams;
use consensus::finality::FinalityManager;
use consensus::pos::PoSConsensus;

pub mod network;

/// Node configuration
pub struct NodeConfig {
    /// Node's public key (identity)
    pub node_id: String,
    
    /// Data directory for blockchain storage
    pub data_dir: String,
    
    /// Network configuration
    pub network_config: network::NetworkConfig,
    
    /// Consensus parameters
    pub consensus_params: ConsensusParams,
    
    /// Whether this node is a validator
    pub is_validator: bool,
    
    /// Validator's private key (if this is a validator node)
    pub validator_key: Option<String>,
}

impl Default for NodeConfig {
    fn default() -> Self {
        Self {
            node_id: "default_node".to_string(),
            data_dir: "./data".to_string(),
            network_config: network::NetworkConfig::default(),
            consensus_params: ConsensusParams::default(),
            is_validator: false,
            validator_key: None,
        }
    }
}

/// Node state
#[derive(Debug, Clone, PartialEq)]
pub enum NodeState {
    /// Node is initializing
    Initializing,
    
    /// Node is syncing with the network
    Syncing,
    
    /// Node is fully synced and operational
    Running,
    
    /// Node is shutting down
    ShuttingDown,
}

/// Represents a full blockchain node
pub struct Node {
    /// Node configuration
    config: NodeConfig,
    
    /// Blockchain instance
    blockchain: Arc<Mutex<Blockchain>>,
    
    /// Consensus engine
    consensus: Arc<Mutex<ConsensusEngine>>,
    
    /// Finality manager
    finality: Arc<Mutex<FinalityManager>>,
    
    /// Network manager
    network: Arc<Mutex<network::NetworkManager>>,
    
    /// Current node state
    state: NodeState,
    
    /// Mempool (pending transactions)
    mempool: Vec<Transaction>,
    
    /// Last block production attempt time
    last_block_attempt: Instant,
}

impl Node {
    /// Creates a new node with the given configuration
    pub fn new(config: NodeConfig, blockchain: Blockchain) -> Self {
        let blockchain = Arc::new(Mutex::new(blockchain));
        
        // Create the consensus engine
        let consensus = ConsensusEngine::new(blockchain.clone(), config.consensus_params.clone());
        let consensus = Arc::new(Mutex::new(consensus));
        
        // Create the finality manager
        let finality = FinalityManager::new(config.consensus_params.clone());
        let finality = Arc::new(Mutex::new(finality));
        
        // Create the network manager
        let mut network_config = config.network_config.clone();
        network_config.node_id = config.node_id.clone();
        let network = network::NetworkManager::new(network_config);
        let network = Arc::new(Mutex::new(network));
        
        Self {
            config,
            blockchain,
            consensus,
            finality,
            network,
            state: NodeState::Initializing,
            mempool: Vec::new(),
            last_block_attempt: Instant::now(),
        }
    }
    
    /// Starts the node
    pub async fn start(&mut self) -> Result<()> {
        println!("Starting node {}...", self.config.node_id);
        
        // Initialize the consensus engine
        {
            let mut consensus = self.consensus.lock().unwrap();
            consensus.initialize()?;
        }
        
        // Initialize the finality manager with the genesis block
        {
            let blockchain = self.blockchain.lock().unwrap();
            let genesis = blockchain.get_block_by_height(0).ok_or_else(|| {
                BlockchainError::StateError("Genesis block not found".to_string())
            })?;
            
            let mut finality = self.finality.lock().unwrap();
            finality.initialize_with_genesis(genesis)?;
        }
        
        // Start the network manager
        {
            let mut network = self.network.lock().unwrap();
            network.start().await?;
        }
        
        // Set the node state to syncing
        self.state = NodeState::Syncing;
        
        // Start the main node loop
        self.run_node_loop();
        
        Ok(())
    }
    
    /// Runs the main node loop
    fn run_node_loop(&mut self) {
        let blockchain = self.blockchain.clone();
        let consensus = self.consensus.clone();
        let finality = self.finality.clone();
        let network = self.network.clone();
        let config = self.config.clone();
        
        tokio::spawn(async move {
            let mut block_interval = tokio::time::interval(Duration::from_secs(1));
            
            loop {
                block_interval.tick().await;
                
                // Try to produce a block if we're a validator
                if config.is_validator {
                    let mut consensus_guard = consensus.lock().unwrap();
                    if let Ok(Some(new_block)) = consensus_guard.try_produce_block() {
                        // We produced a new block
                        println!("Produced new block: {}", new_block);
                        
                        // Add the block to the blockchain
                        let mut blockchain_guard = blockchain.lock().unwrap();
                        if let Err(e) = blockchain_guard.add_block(new_block.clone()) {
                            eprintln!("Failed to add produced block: {}", e);
                            continue;
                        }
                        
                        // Broadcast the new block to the network
                        // In a real implementation, we would serialize and broadcast the block here
                    }
                }
                
                // Process incoming blocks and transactions
                // In a real implementation, we would handle incoming messages here
                
                // Check for finality
                // In a real implementation, we would check for block finality here
            }
        });
    }
    
    /// Adds a transaction to the mempool
    pub fn add_transaction(&mut self, transaction: Transaction) -> Result<()> {
        // Validate the transaction
        transaction.validate()?;
        
        // Add to mempool
        self.mempool.push(transaction.clone());
        
        // Add to consensus engine
        {
            let mut consensus = self.consensus.lock().unwrap();
            consensus.add_transaction(transaction);
        }
        
        Ok(())
    }
    
    /// Gets the current blockchain height
    pub fn get_height(&self) -> u64 {
        let blockchain = self.blockchain.lock().unwrap();
        blockchain.get_latest_height()
    }
    
    /// Gets the latest finalized block height
    pub fn get_finalized_height(&self) -> u64 {
        let finality = self.finality.lock().unwrap();
        finality.get_latest_finalized_height()
    }
    
    /// Gets the current node state
    pub fn get_state(&self) -> NodeState {
        self.state.clone()
    }
    
    /// Gets the number of connected peers
    pub fn get_peer_count(&self) -> usize {
        let network = self.network.lock().unwrap();
        network.peer_count()
    }
    
    /// Stops the node
    pub fn stop(&mut self) {
        println!("Stopping node {}...", self.config.node_id);
        self.state = NodeState::ShuttingDown;
        
        // In a real implementation, we would gracefully shut down all components here
    }
}