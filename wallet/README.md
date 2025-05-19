# GENX Blockchain Wallet

This module provides a secure wallet implementation for the GENX blockchain platform. The wallet handles key management, transaction signing, and account operations.

## Features

- Secure key generation using ed25519 cryptography
- AES-256-GCM encryption for private keys
- PBKDF2 key derivation for wallet passwords
- Multiple account management
- Transaction creation and signing
- Clean API for integration with UI components

## Implementation Details

### Cryptography

The wallet uses industry-standard cryptographic algorithms:

- **Key Generation**: Ed25519 elliptic curve cryptography for generating keypairs
- **Key Encryption**: AES-256-GCM for encrypting private keys
- **Key Derivation**: PBKDF2 with HMAC-SHA256 for deriving encryption keys from passwords
- **Transaction Signing**: Ed25519 signatures for transaction authentication

### Wallet Structure

The wallet is organized into several components:

- `lib.rs`: Core wallet implementation with account management and cryptographic operations
- `api.rs`: High-level API for wallet operations that can be used by the UI

## Integration with UI

The wallet module is designed to be integrated with the Explorer UI through a React component. The UI provides:

- Wallet creation and loading
- Password-based unlocking
- Account management
- Balance viewing
- Transaction creation and sending

## Next Steps

1. **API Server Integration**: Implement a REST API server that connects the wallet module with the UI
2. **Blockchain Integration**: Connect the wallet to the blockchain node for balance queries and transaction broadcasting
3. **Testing**: Create comprehensive tests for wallet operations
4. **Security Audit**: Perform a security audit of the cryptographic implementations
5. **UI Refinement**: Enhance the wallet UI with transaction history and advanced features

## Usage Example

```rust
// Create a new wallet
let wallet_path = PathBuf::from("./my_wallet.json");
let wallet_api = WalletApi::create_wallet(wallet_path, "secure_password").unwrap();

// Create a new account
let address = wallet_api.create_account("Main Account").unwrap();

// Create and sign a transaction
let tx = wallet_api.create_transaction(
    &address,
    "GENX123456789abcdef",
    100,  // amount
    1,    // fee
    None, // data
).unwrap();

// The transaction is now ready to be broadcast to the network
```