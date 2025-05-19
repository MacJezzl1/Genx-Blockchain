//! Wallet implementation for the GENX blockchain
//!
//! This module provides wallet functionality including key management,
//! transaction signing, and account operations.

use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};

use serde::{Deserialize, Serialize};
use thiserror::Error;

use core::transaction::Transaction;
use core::{BlockchainError, Result as CoreResult};

// Export the API module
pub mod api;

/// Wallet error types
#[derive(Debug, Error)]
pub enum WalletError {
    #[error("IO error: {0}")]
    IoError(#[from] std::io::Error),
    
    #[error("Serialization error: {0}")]
    SerializationError(String),
    
    #[error("Key error: {0}")]
    KeyError(String),
    
    #[error("Account error: {0}")]
    AccountError(String),
    
    #[error("Blockchain error: {0}")]
    BlockchainError(#[from] BlockchainError),
}

/// Result type for wallet operations
pub type Result<T> = std::result::Result<T, WalletError>;

/// Represents a wallet account
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Account {
    /// Account address (public key)
    pub address: String,
    
    /// Encrypted private key
    pub encrypted_private_key: Vec<u8>,
    
    /// Account label
    pub label: String,
    
    /// Whether this is the default account
    pub is_default: bool,
    
    /// Account creation timestamp
    pub created_at: u64,
}

/// Wallet configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WalletConfig {
    /// Wallet name
    pub name: String,
    
    /// Wallet version
    pub version: String,
    
    /// Encryption algorithm used
    pub encryption_algorithm: String,
    
    /// Whether the wallet is encrypted
    pub is_encrypted: bool,
}

impl Default for WalletConfig {
    fn default() -> Self {
        Self {
            name: "GENX Wallet".to_string(),
            version: "1.0.0".to_string(),
            encryption_algorithm: "aes-256-gcm".to_string(),
            is_encrypted: true,
        }
    }
}

/// Manages wallet accounts and operations
pub struct Wallet {
    /// Wallet configuration
    config: WalletConfig,
    
    /// Wallet accounts
    accounts: HashMap<String, Account>,
    
    /// Default account address
    default_account: Option<String>,
    
    /// Wallet file path
    wallet_path: PathBuf,
    
    /// Whether the wallet is unlocked
    is_unlocked: bool,
    
    /// Decryption key (only in memory when unlocked)
    decryption_key: Option<Vec<u8>>,
}

impl Wallet {
    /// Creates a new wallet with the given configuration
    pub fn new(config: WalletConfig, wallet_path: PathBuf) -> Self {
        Self {
            config,
            accounts: HashMap::new(),
            default_account: None,
            wallet_path,
            is_unlocked: false,
            decryption_key: None,
        }
    }
    
    /// Creates a new wallet at the given path
    pub fn create(wallet_path: PathBuf, password: &str) -> Result<Self> {
        // Create the wallet directory if it doesn't exist
        if let Some(parent) = wallet_path.parent() {
            fs::create_dir_all(parent)?;
        }
        
        let config = WalletConfig::default();
        let mut wallet = Self::new(config, wallet_path);
        
        // Derive the encryption key from the password
        let encryption_key = Self::derive_key(password);
        wallet.decryption_key = Some(encryption_key);
        wallet.is_unlocked = true;
        
        // Save the wallet
        wallet.save()?;
        
        Ok(wallet)
    }
    
    /// Loads a wallet from the given path
    pub fn load(wallet_path: PathBuf) -> Result<Self> {
        // Check if the wallet file exists
        if !wallet_path.exists() {
            return Err(WalletError::IoError(std::io::Error::new(
                std::io::ErrorKind::NotFound,
                "Wallet file not found",
            )));
        }
        
        // Read the wallet file
        let wallet_data = fs::read_to_string(&wallet_path)?;
        
        // Deserialize the wallet
        let wallet_json: serde_json::Value = serde_json::from_str(&wallet_data)
            .map_err(|e| WalletError::SerializationError(e.to_string()))?;
        
        // Extract the configuration
        let config: WalletConfig = serde_json::from_value(wallet_json["config"].clone())
            .map_err(|e| WalletError::SerializationError(e.to_string()))?;
        
        // Create the wallet
        let mut wallet = Self::new(config, wallet_path);
        
        // Extract the accounts
        let accounts: HashMap<String, Account> = serde_json::from_value(wallet_json["accounts"].clone())
            .map_err(|e| WalletError::SerializationError(e.to_string()))?;
        
        wallet.accounts = accounts;
        
        // Extract the default account
        if let Some(default) = wallet_json["default_account"].as_str() {
            wallet.default_account = Some(default.to_string());
        }
        
        Ok(wallet)
    }
    
    /// Unlocks the wallet with the given password
    pub fn unlock(&mut self, password: &str) -> Result<()> {
        if self.is_unlocked {
            return Ok(());
        }
        
        // Derive the decryption key from the password
        let decryption_key = Self::derive_key(password);
        
        // In a real implementation, we would verify the key here
        // by trying to decrypt a test value
        
        self.decryption_key = Some(decryption_key);
        self.is_unlocked = true;
        
        Ok(())
    }
    
    /// Locks the wallet
    pub fn lock(&mut self) {
        self.decryption_key = None;
        self.is_unlocked = false;
    }
    
    /// Creates a new account in the wallet
    pub fn create_account(&mut self, label: &str) -> Result<String> {
        if !self.is_unlocked {
            return Err(WalletError::AccountError("Wallet is locked".to_string()));
        }
        
        // Generate a new key pair
        let (private_key, public_key) = self.generate_key_pair()?;
        
        // Encrypt the private key
        let encrypted_private_key = self.encrypt_private_key(&private_key)?;
        
        // Create the account
        let account = Account {
            address: public_key.clone(),
            encrypted_private_key,
            label: label.to_string(),
            is_default: self.accounts.is_empty(), // First account is default
            created_at: core::current_timestamp(),
        };
        
        // Set as default if it's the first account
        if account.is_default {
            self.default_account = Some(public_key.clone());
        }
        
        // Add the account to the wallet
        self.accounts.insert(public_key.clone(), account);
        
        // Save the wallet
        self.save()?;
        
        Ok(public_key)
    }
    
    /// Sets the default account
    pub fn set_default_account(&mut self, address: &str) -> Result<()> {
        if !self.accounts.contains_key(address) {
            return Err(WalletError::AccountError(format!("Account {} not found", address)));
        }
        
        // Update the default flag for all accounts
        for (addr, account) in &mut self.accounts {
            account.is_default = addr == address;
        }
        
        // Update the default account
        self.default_account = Some(address.to_string());
        
        // Save the wallet
        self.save()?;
        
        Ok(())
    }
    
    /// Gets all accounts in the wallet
    pub fn get_accounts(&self) -> Vec<&Account> {
        self.accounts.values().collect()
    }
    
    /// Gets an account by address
    pub fn get_account(&self, address: &str) -> Option<&Account> {
        self.accounts.get(address)
    }
    
    /// Gets the default account
    pub fn get_default_account(&self) -> Option<&Account> {
        if let Some(address) = &self.default_account {
            self.accounts.get(address)
        } else {
            None
        }
    }
    
    /// Creates and signs a transaction
    pub fn create_transaction(
        &self,
        sender: &str,
        recipient: &str,
        amount: u64,
        fee: u64,
        data: Option<Vec<u8>>,
    ) -> Result<Transaction> {
        if !self.is_unlocked {
            return Err(WalletError::AccountError("Wallet is locked".to_string()));
        }
        
        // Check that the sender account exists
        let account = self.accounts.get(sender).ok_or_else(|| {
            WalletError::AccountError(format!("Sender account {} not found", sender))
        })?;
        
        // Create the transaction
        let mut tx = Transaction::new(
            sender.to_string(),
            recipient.to_string(),
            amount,
            fee,
            data,
        ).map_err(|e| WalletError::BlockchainError(e))?;
        
        // Decrypt the private key
        let private_key = self.decrypt_private_key(&account.encrypted_private_key)?;
        
        // Sign the transaction using ed25519
        use ed25519_dalek::{Keypair, PublicKey, SecretKey, Signature};
        
        // Reconstruct the keypair from the private key
        let secret = SecretKey::from_bytes(&private_key)
            .map_err(|e| WalletError::KeyError(format!("Invalid private key: {}", e)))?;
        
        // Extract the public key from the address (remove the GENX prefix and decode hex)
        let public_bytes = hex::decode(account.address.trim_start_matches("GENX"))
            .map_err(|e| WalletError::KeyError(format!("Invalid address format: {}", e)))?;
        
        let public = PublicKey::from_bytes(&public_bytes)
            .map_err(|e| WalletError::KeyError(format!("Invalid public key: {}", e)))?;
        
        let keypair = Keypair { secret, public };
        
        // Calculate the transaction hash and sign it
        let tx_hash = tx.calculate_hash().map_err(|e| WalletError::BlockchainError(e))?;
        let signature = keypair.sign(&tx_hash);
        
        // Set the signature in the transaction
        tx.signature = Some(signature.to_bytes().to_vec());
        
        Ok(tx)
    }
    
    /// Saves the wallet to disk
    fn save(&self) -> Result<()> {
        // Create a JSON representation of the wallet
        let mut wallet_json = serde_json::json!({
            "config": self.config,
            "accounts": self.accounts,
        });
        
        if let Some(default) = &self.default_account {
            wallet_json["default_account"] = serde_json::Value::String(default.clone());
        }
        
        // Serialize to JSON
        let wallet_data = serde_json::to_string_pretty(&wallet_json)
            .map_err(|e| WalletError::SerializationError(e.to_string()))?;
        
        // Write to file
        fs::write(&self.wallet_path, wallet_data)?;
        
        Ok(())
    }
    
    /// Generates a new key pair
    fn generate_key_pair(&self) -> Result<(Vec<u8>, String)> {
        use ed25519_dalek::{Keypair, PublicKey, SecretKey};
        use rand::rngs::OsRng;
        
        // Generate a new keypair using the OS random number generator
        let mut csprng = OsRng{};
        let keypair = Keypair::generate(&mut csprng);
        
        // Extract the private and public keys
        let private_key = keypair.secret.as_bytes().to_vec();
        let public_key = format!("GENX{}", hex::encode(keypair.public.as_bytes()));
        
        Ok((private_key, public_key))
    }
    
    /// Encrypts a private key
    fn encrypt_private_key(&self, private_key: &[u8]) -> Result<Vec<u8>> {
        use aes_gcm::{Aes256Gcm, Key, Nonce};
        use aes_gcm::aead::{Aead, NewAead};
        use rand::{Rng, rngs::OsRng};
        
        if !self.is_unlocked || self.decryption_key.is_none() {
            return Err(WalletError::KeyError("Wallet is locked".to_string()));
        }
        
        // Get the encryption key
        let key_bytes = self.decryption_key.as_ref().unwrap();
        if key_bytes.len() < 32 {
            return Err(WalletError::KeyError("Invalid encryption key".to_string()));
        }
        
        // Create a 32-byte key for AES-256-GCM
        let key = Key::from_slice(&key_bytes[0..32]);
        let cipher = Aes256Gcm::new(key);
        
        // Generate a random 12-byte nonce
        let mut nonce_bytes = [0u8; 12];
        OsRng.fill(&mut nonce_bytes);
        let nonce = Nonce::from_slice(&nonce_bytes);
        
        // Encrypt the private key
        let ciphertext = cipher.encrypt(nonce, private_key)
            .map_err(|e| WalletError::KeyError(format!("Encryption failed: {}", e)))?;
        
        // Combine the nonce and ciphertext for storage
        let mut result = Vec::with_capacity(nonce_bytes.len() + ciphertext.len());
        result.extend_from_slice(&nonce_bytes);
        result.extend_from_slice(&ciphertext);
        
        Ok(result)
    }
    
    /// Decrypts a private key
    fn decrypt_private_key(&self, encrypted_private_key: &[u8]) -> Result<Vec<u8>> {
        use aes_gcm::{Aes256Gcm, Key, Nonce};
        use aes_gcm::aead::{Aead, NewAead};
        
        if !self.is_unlocked || self.decryption_key.is_none() {
            return Err(WalletError::KeyError("Wallet is locked".to_string()));
        }
        
        // Check that the encrypted key is long enough to contain a nonce
        if encrypted_private_key.len() <= 12 {
            return Err(WalletError::KeyError("Invalid encrypted key format".to_string()));
        }
        
        // Get the encryption key
        let key_bytes = self.decryption_key.as_ref().unwrap();
        if key_bytes.len() < 32 {
            return Err(WalletError::KeyError("Invalid decryption key".to_string()));
        }
        
        // Create a 32-byte key for AES-256-GCM
        let key = Key::from_slice(&key_bytes[0..32]);
        let cipher = Aes256Gcm::new(key);
        
        // Extract the nonce and ciphertext
        let nonce = Nonce::from_slice(&encrypted_private_key[0..12]);
        let ciphertext = &encrypted_private_key[12..];
        
        // Decrypt the private key
        let plaintext = cipher.decrypt(nonce, ciphertext)
            .map_err(|e| WalletError::KeyError(format!("Decryption failed: {}", e)))?;
        
        Ok(plaintext)
    }
    
    /// Derives an encryption key from a password
    fn derive_key(password: &str) -> Vec<u8> {
        use pbkdf2::pbkdf2;
        use hmac::Hmac;
        use sha2::Sha256;
        
        // Use a fixed salt for simplicity
        // In a production system, each wallet would have its own salt
        let salt = b"GENX_WALLET_SALT";
        
        // Derive a 32-byte key using PBKDF2 with 10000 iterations
        let mut key = [0u8; 32];
        pbkdf2::<Hmac<Sha256>>(password.as_bytes(), salt, 10000, &mut key)
            .expect("PBKDF2 should not fail");
        
        key.to_vec()
    }
}