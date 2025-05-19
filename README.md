# Crypto Trust Bank Blockchain Platform

A comprehensive blockchain platform with GENX native coin, built with a focus on security, scalability, and decentralization.

## Overview

The Crypto Trust Bank Blockchain Platform is a modular blockchain infrastructure that includes:

- **Blockchain Core**: Block structure, transaction processing, and state management
- **Consensus Engine**: Proof of Stake (PoS) implementation
- **Node Network**: P2P communication and peer discovery
- **Wallet System**: Key management and transaction signing
- **Smart Contract Engine**: EVM-compatible execution environment
- **Explorer UI**: Block and transaction visualization

## Features

### Blockchain Platform

- **GENX Native Coin**: A secure, deflationary cryptocurrency
- **Proof of Stake Consensus**: Energy-efficient block validation
- **Smart Contract Support**: Deploy and execute EVM-compatible contracts
- **Web-based Explorer**: Visualize blockchain data
- **Modular Architecture**: Easily extensible codebase

### TokenX Builder

- Create tokens with validation rules
  - Alphanumeric symbols, length 3-8 characters
  - Total supply must be a positive integer less than 1 billion
  - Prevention of duplicate token symbols
- Display tokens in a table with name, symbol, creator address/ID, and total supply
- Mock authentication supporting Web3 wallets (MetaMask) or email
- Prepared for future integration with real smart contracts

## Project Structure

- `/frontend` - React frontend application
- `/backend` - Express API server
- `/frontend/components` - Reusable UI components
- `/frontend/pages` - Application pages
- `/backend/routes` - API routes
- `/backend/models` - Data models

## Getting Started

1. Clone the repository
2. Install dependencies for all components
3. Start the development servers or blockchain node

```bash
# Install all dependencies
npm run install:all

# Start the token builder web application (frontend + backend)
npm run dev

# OR start the blockchain node with Explorer UI
npm run blockchain

# OR start the blockchain node in validator mode
npm run blockchain:validator
```

### Accessing the Blockchain Explorer

Once the blockchain node is running, you can access the Explorer UI at:

```
http://localhost:8080/explorer
```

The Explorer UI provides a visual interface to browse blocks, transactions, and smart contracts on the blockchain.

### Blockchain Node Commands

When running the blockchain node, you can use the following commands in the terminal:

- `help` - Show available commands
- `info` - Show node information
- `explorer` - Open the Explorer UI in your default browser
- `quit` or `exit` - Stop the blockchain node and exit

## Technologies Used

- Frontend: React, Ethers.js, Web3.js
- Backend: Node.js, Express
- Styling: Tailwind CSS
- Authentication: JWT (for email) and Web3 wallet integration