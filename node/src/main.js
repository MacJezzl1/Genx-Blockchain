#!/usr/bin/env node

/**
 * Crypto Trust Bank Blockchain Node
 * 
 * This is the main entry point for running a blockchain node.
 * It provides a command-line interface for starting and managing a node.
 */

const fs = require('fs');
const path = require('path');
const { program } = require('commander');
const { Node, NodeConfig } = require('./lib');
const { NetworkConfig } = require('./network');
const { Blockchain } = require('./blockchain');
const Wallet = require('./wallet');
const ApiServer = require('./api');
const { SmartContractEngine } = require('./smartcontract');

// Define the CLI program
program
  .name('genx-node')
  .description('Crypto Trust Bank Blockchain Node')
  .version('1.0.0');

// Command to start a node
program
  .command('start')
  .description('Start a blockchain node')
  .option('-d, --data-dir <path>', 'Data directory for blockchain storage', './data')
  .option('-p, --port <number>', 'P2P port to listen on', '8333')
  .option('-h, --host <address>', 'Host address to bind to', '127.0.0.1')
  .option('-b, --bootstrap <peers>', 'Comma-separated list of bootstrap peers')
  .option('-v, --validator', 'Run as a validator node')
  .option('-k, --key <path>', 'Path to validator private key file')
  .option('-a, --api-port <number>', 'API server port', '8080')
  .option('-g, --genesis-address <address>', 'Genesis address for initial GENX distribution')
  .action(async (options) => {
    console.log('Starting Crypto Trust Bank Blockchain Node...');
    
    // Initialize genesis block
    const { initializeBlockchain } = require('./genesis');
    const genesisConfig = {
      genesisAddress: options.genesisAddress,
      timestamp: Date.now()
    };
    const genesisBlock = await initializeBlockchain(genesisConfig, options.dataDir);
    
    // Create data directory if it doesn't exist
    if (!fs.existsSync(options.dataDir)) {
      fs.mkdirSync(options.dataDir, { recursive: true });
    }
    
    // Parse bootstrap peers
    const bootstrapPeers = [];
    if (options.bootstrap) {
      options.bootstrap.split(',').forEach(peer => {
        bootstrapPeers.push(peer.trim());
      });
    }
    
    // Create network configuration
    const networkConfig = new NetworkConfig();
    networkConfig.listen_addr = `${options.host}:${options.port}`;
    networkConfig.bootstrap_peers = bootstrapPeers;
    
    // Create node configuration
    const nodeConfig = new NodeConfig();
    nodeConfig.node_id = `node_${Math.random().toString(36).substring(2, 15)}`;
    nodeConfig.data_dir = options.dataDir;
    nodeConfig.network_config = networkConfig;
    nodeConfig.is_validator = options.validator || false;
    nodeConfig.api_port = options.apiPort || 8080;
    
    // Load validator key if specified
    if (options.key && nodeConfig.is_validator) {
      try {
        nodeConfig.validator_key = fs.readFileSync(options.key, 'utf8').trim();
      } catch (err) {
        console.error(`Error loading validator key: ${err.message}`);
        process.exit(1);
      }
    }
    
    try {
      // Initialize blockchain
      console.log('Initializing blockchain...');
      const blockchain = new Blockchain({
        dataDir: options.dataDir,
        genesisAddress: options.genesisAddress
      });
      await blockchain.initialize();
      console.log(`Blockchain initialized with ${blockchain.chain.length} blocks`);
      
      // Initialize smart contract engine
      console.log('Initializing smart contract engine...');
      const contractEngine = new SmartContractEngine(blockchain);
      
      // Initialize and start the node
      console.log('Initializing node...');
      const node = new Node(nodeConfig);
      node.blockchain = blockchain;
      node.contractEngine = contractEngine;
      await node.start();
      
      // Start API server
      console.log('Starting API server...');
      const apiServer = new ApiServer(node, {
        host: options.host,
        port: nodeConfig.api_port
      });
      await apiServer.start();
      
      console.log(`Node ID: ${nodeConfig.node_id}`);
      console.log(`P2P Listening on: ${networkConfig.listen_addr}`);
      console.log(`API Server: http://${options.host}:${nodeConfig.api_port}`);
      console.log(`Data directory: ${nodeConfig.data_dir}`);
      console.log(`Validator mode: ${nodeConfig.is_validator ? 'Yes' : 'No'}`);
      console.log(`Blockchain height: ${blockchain.blockHeight}`);
      
      console.log('\nNode started successfully!');
      console.log('Press Ctrl+C to stop the node.');
      
      // Keep the process running
      process.stdin.resume();
      
      // Handle graceful shutdown
      process.on('SIGINT', async () => {
        console.log('\nStopping node...');
        
        // Stop API server
        console.log('Stopping API server...');
        await apiServer.stop();
        
        // Stop node
        console.log('Stopping blockchain node...');
        await node.stop();
        
        console.log('Node stopped successfully.');
        process.exit(0);
      });
    } catch (err) {
      console.error(`Failed to start node: ${err.message}`);
      process.exit(1);
    }
  });

// Command to create a wallet
program
  .command('wallet')
  .description('Manage blockchain wallet')
  .option('-c, --create', 'Create a new wallet')
  .option('-i, --import <key>', 'Import a private key')
  .option('-e, --export', 'Export wallet private key')
  .option('-b, --balance', 'Check wallet balance')
  .option('-t, --transfer <address>', 'Transfer GENX to address')
  .option('-a, --amount <amount>', 'Amount to transfer')
  .option('-p, --password <password>', 'Wallet password')
  .option('-d, --data-dir <path>', 'Data directory', './data')
  .option('-l, --list', 'List all wallets')
  .action(async (options) => {
    try {
      // Create data directory if it doesn't exist
      if (!fs.existsSync(options.dataDir)) {
        fs.mkdirSync(options.dataDir, { recursive: true });
      }
      
      // Initialize wallet
      const wallet = new Wallet({
        dataDir: path.join(options.dataDir, 'wallets')
      });
      wallet.initialize();
      
      // List wallets
      if (options.list) {
        const wallets = Wallet.listWallets(path.join(options.dataDir, 'wallets'));
        console.log('Available wallets:');
        if (wallets.length === 0) {
          console.log('  No wallets found');
        } else {
          wallets.forEach(w => console.log(`  ${w}`));
        }
        return;
      }
      
      // Create a new wallet
      if (options.create) {
        if (!options.password) {
          console.error('Password is required to create a wallet');
          process.exit(1);
        }
        
        const keys = wallet.generateKeyPair();
        wallet.saveWallet(options.password);
        
        console.log('Wallet created successfully:');
        console.log(`Address: ${keys.address}`);
        console.log('Private key saved to wallet.json');
        return;
      }
      
      // Import a private key
      if (options.import) {
        if (!options.password) {
          console.error('Password is required to import a wallet');
          process.exit(1);
        }
        
        const keys = wallet.importPrivateKey(options.import);
        wallet.saveWallet(options.password);
        
        console.log('Wallet imported successfully:');
        console.log(`Address: ${keys.address}`);
        console.log('Private key saved to wallet.json');
        return;
      }
      
      // Load wallet for other operations
      if (options.export || options.balance || options.transfer) {
        if (!options.password) {
          console.error('Password is required to access the wallet');
          process.exit(1);
        }
        
        try {
          const keys = wallet.loadWallet(options.password);
          console.log(`Wallet loaded: ${keys.address}`);
          
          // Export private key
          if (options.export) {
            console.log(`Private key: ${keys.privateKey}`);
            return;
          }
          
          // For balance and transfer operations, we need to connect to a blockchain
          // This is a simplified implementation
          console.log('Note: Balance and transfer operations require a running node');
          
          // Check balance
          if (options.balance) {
            console.log(`Balance: 0 GENX (blockchain connection required)`);
            return;
          }
          
          // Transfer GENX
          if (options.transfer && options.amount) {
            const amount = parseFloat(options.amount);
            if (isNaN(amount) || amount <= 0) {
              console.error('Invalid amount');
              process.exit(1);
            }
            
            console.log(`Transfer initiated: ${amount} GENX to ${options.transfer}`);
            console.log('Note: This is a simulation. Connect to a running node for actual transfers.');
            return;
          }
        } catch (err) {
          console.error(`Failed to load wallet: ${err.message}`);
          process.exit(1);
        }
      }
      
      // If no specific command was given, show help
      program.commands.find(c => c.name() === 'wallet').help();
    } catch (err) {
      console.error(`Wallet error: ${err.message}`);
      process.exit(1);
    }
  });

// Parse command line arguments
program.parse(process.argv);

// Show help if no command is provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}