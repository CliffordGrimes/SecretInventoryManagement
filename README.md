# Secret Inventory Management System

<div align="center">

![Secret Inventory Management](https://img.shields.io/badge/Secret%20Inventory-FHE%20Powered-gold?style=for-the-badge&logo=ethereum)

**A privacy-preserving inventory management system built with Zama's Fully Homomorphic Encryption (FHE) technology**

[![Live Demo](https://img.shields.io/badge/🌐_Live_Demo-secret--inventory--management.vercel.app-success?style=for-the-badge)](https://secret-inventory-management.vercel.app/)
[![GitHub](https://img.shields.io/badge/GitHub-Repository-black?style=for-the-badge&logo=github)](https://github.com/CliffordGrimes/SecretInventoryManagement)
[![Sepolia](https://img.shields.io/badge/Network-Sepolia_Testnet-blue?style=for-the-badge)](https://sepolia.etherscan.io/)

</div>

## 🔐 What is Secret Inventory Management?

Secret Inventory Management is a revolutionary inventory tracking system that leverages **Fully Homomorphic Encryption (FHE)** to create completely private and confidential storage management. All inventory operations are performed on encrypted data, ensuring that sensitive business information remains hidden even from the system administrators.

### 🔗 **Live Application**
**Demo:** [https://secret-inventory-management.vercel.app/](https://secret-inventory-management.vercel.app/)

## 🌟 Core Concepts

### 🔐 **FHE Smart Contract**
The system is built on a sophisticated smart contract that utilizes Zama's FHEVM (Fully Homomorphic Encryption Virtual Machine) to enable:
- **Encrypted Inventory Operations**: All quantity updates and stock movements are encrypted
- **Private Threshold Management**: Minimum stock alerts without revealing actual quantities
- **Confidential Access Control**: Manager authorization with encrypted permissions
- **Secure Audit Trails**: Complete transaction history with privacy preservation

### 📦 **Confidential Inventory Management**
A privacy-first approach to inventory control featuring:
- **Secret Stock Levels**: Actual quantities remain encrypted at all times
- **Private Category Management**: Confidential classification of inventory items
- **Encrypted Threshold Alerts**: Low stock warnings without data exposure
- **Anonymous Usage Tracking**: Monitor inventory flow while preserving privacy

### 🏢 **Privacy Storage System**
An enterprise-grade solution for sensitive inventory management:
- **Zero-Knowledge Operations**: Perform inventory functions without revealing data
- **Cryptographic Verification**: Mathematical proof of inventory accuracy
- **Decentralized Privacy**: No central authority can access sensitive information
- **Regulatory Compliance**: Meet privacy standards while maintaining functionality

## 🛠️ Technology Stack

### **Smart Contract Infrastructure**
- **Solidity ^0.8.24**: Smart contract development language
- **Zama FHEVM**: Fully Homomorphic Encryption virtual machine
- **Hardhat**: Development environment and testing framework
- **Sepolia Testnet**: Ethereum test network for secure deployment

### **Frontend Technologies**
- **Vanilla JavaScript**: Pure JavaScript for optimal performance
- **HTML5/CSS3**: Modern web standards with responsive design
- **Ethers.js**: Blockchain interaction library with MetaMask integration
- **CDN Architecture**: Fast loading with multiple fallback sources

### **Encryption Features**
- **euint32 Types**: Encrypted 32-bit integers for quantity management
- **ebool Operations**: Encrypted boolean logic for status tracking
- **Access Control Lists**: Granular permission management
- **Async Decryption**: Oracle-based result revelation system

## 🎯 Key Features

### 🔒 **Privacy-First Design**
- **End-to-End Encryption**: All sensitive data encrypted before blockchain storage
- **Zero-Knowledge Proofs**: Verify operations without revealing data
- **Cryptographic Access Control**: Role-based permissions with encryption
- **Anonymous Operations**: Track inventory without exposing business secrets

### 📊 **Inventory Management**
- **Real-Time Tracking**: Live inventory updates with encrypted operations
- **Category Organization**: Structured classification system for different item types
- **Threshold Management**: Automated low-stock alerts with privacy preservation
- **Audit Functionality**: Complete transaction history with cryptographic verification

### 🔐 **Security Architecture**
- **Multi-Layer Encryption**: FHE protection at smart contract level
- **Manager Authorization**: Decentralized permission system
- **Secure Operations**: All modifications require cryptographic verification
- **Privacy Preservation**: Business intelligence without data exposure

## 📋 Smart Contract Details

### **Contract Address**
- **Sepolia Testnet**: `0x8ee4EE930Fdb29811fc44067b5c25807d4ce3613`
- **Network**: Sepolia Test Network (Chain ID: 11155111)
- **Explorer**: [View on Etherscan](https://sepolia.etherscan.io/address/0x8ee4EE930Fdb29811fc44067b5c25807d4ce3613)

### **Core Functions**

#### Inventory Management
- `addInventoryItem()`: Add new encrypted inventory items
- `updateQuantity()`: Modify stock levels with FHE operations
- `getItemDetails()`: Retrieve item information with access control
- `auditInventory()`: Perform encrypted inventory audits

#### Access Control
- `authorizeManager()`: Grant management permissions
- `isAuthorizedManager()`: Verify user permissions
- `revokeManager()`: Remove management access

#### Privacy Operations
- `revealItem()`: Decrypt specific items for authorized viewing
- `getEncryptedQuantity()`: Access encrypted stock levels
- `getItemStatus()`: Check item status with privacy preservation

## 🎥 Demo Video

Watch our comprehensive demonstration of the Secret Inventory Management System in action, showcasing:
- Wallet connection and manager authorization
- Adding encrypted inventory items
- Performing confidential stock updates
- Conducting privacy-preserving audits

*[Demo video showcases real blockchain interactions with encrypted data]*

## 🔧 System Requirements

### **User Prerequisites**
- **MetaMask Wallet**: Browser extension for blockchain interaction
- **Sepolia ETH**: Test tokens for transaction fees
- **Modern Browser**: Chrome, Firefox, Safari, or Edge

### **Network Configuration**
- **Network Name**: Sepolia Test Network
- **Chain ID**: 11155111
- **Currency Symbol**: ETH
- **Block Explorer**: https://sepolia.etherscan.io/

## 🚀 Getting Started

### **Quick Start**
1. **Visit Application**: Open [secret-inventory-management.vercel.app](https://secret-inventory-management.vercel.app/)
2. **Connect Wallet**: Link your MetaMask to Sepolia testnet
3. **Authorize Manager**: Grant yourself management permissions
4. **Add Inventory**: Create your first encrypted inventory item
5. **Manage Stock**: Perform confidential quantity updates

### **Inventory Categories**
- **Electronics**: Computers, devices, and technical equipment
- **Pharmaceuticals**: Medical supplies and medications
- **Documents**: Classified papers and certificates
- **Chemicals**: Laboratory reagents and compounds
- **Precious Metals**: Valuable materials and commodities
- **Security Equipment**: Safety and protection devices
- **Data Storage**: Digital storage devices and media
- **Biological Samples**: Research and medical specimens

## 🔐 Privacy Architecture

### **Encryption Workflow**
1. **Data Input**: Plain text inventory data entered by user
2. **Client-Side Validation**: Input verification before encryption
3. **FHE Encryption**: Conversion to encrypted format using Zama FHEVM
4. **Blockchain Storage**: Encrypted data stored on Sepolia testnet
5. **Encrypted Operations**: All calculations performed on encrypted data
6. **Selective Decryption**: Authorized revelation of specific results

### **Security Guarantees**
- **Computational Privacy**: Operations never reveal intermediate values
- **Access Control**: Only authorized managers can decrypt specific data
- **Tamper Resistance**: Blockchain immutability ensures data integrity
- **Zero-Knowledge Verification**: Prove operations without revealing data

## 🌐 Links and Resources

### **Project Links**
- **Live Application**: [secret-inventory-management.vercel.app](https://secret-inventory-management.vercel.app/)
- **GitHub Repository**: [CliffordGrimes/SecretInventoryManagement](https://github.com/CliffordGrimes/SecretInventoryManagement)
- **Smart Contract**: [0x8ee4EE930Fdb29811fc44067b5c25807d4ce3613](https://sepolia.etherscan.io/address/0x8ee4EE930Fdb29811fc44067b5c25807d4ce3613)

### **Technology Documentation**
- **Zama FHEVM**: [docs.zama.ai](https://docs.zama.ai)
- **Hardhat Framework**: [hardhat.org](https://hardhat.org)
- **Ethers.js Library**: [docs.ethers.org](https://docs.ethers.org)

### **Blockchain Resources**
- **Sepolia Testnet**: [sepoliafaucet.com](https://sepoliafaucet.com)
- **MetaMask Wallet**: [metamask.io](https://metamask.io)
- **Sepolia Explorer**: [sepolia.etherscan.io](https://sepolia.etherscan.io)

## 📞 Contact Information

**Repository**: [github.com/CliffordGrimes/SecretInventoryManagement](https://github.com/CliffordGrimes/SecretInventoryManagement)

---

<div align="center">

**Built with privacy-first principles using Zama's FHEVM technology**

[![Zama](https://img.shields.io/badge/Powered_by-Zama_FHEVM-gold?style=flat-square)](https://zama.ai)
[![Ethereum](https://img.shields.io/badge/Built_on-Ethereum-blue?style=flat-square)](https://ethereum.org)
[![Privacy](https://img.shields.io/badge/Privacy-First-green?style=flat-square)](https://en.wikipedia.org/wiki/Privacy_by_design)

</div>