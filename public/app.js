class SecretInventoryManager {
    constructor() {
        this.contract = null;
        this.provider = null;
        this.signer = null;
        this.contractAddress = '0x306F479e7ebabF08c305db0b4Da80708CEd9E22e';
        this.contractABI = [
            "function addInventoryItem(uint32 _quantity, uint64 _price, uint32 _minStockLevel, string calldata _itemName, address _supplier) external",
            "function updateStock(uint32 _itemId, uint32 _quantityChange, bool _isAddition) external",
            "function placeOrder(uint32 _itemId, uint32 _requestedQuantity) external",
            "function processOrder(uint32 _orderId, uint8 _status) external",
            "function authorizeManager(address _manager) external",
            "function grantInventoryAccess(uint32 _itemId, address _user) external",
            "function emergencyPause() external",
            "function getActiveItemsCount() external view returns (uint256)",
            "function getPendingOrdersCount() external view returns (uint256)",
            "function getItemInfo(uint32 _itemId) external view returns (string memory itemName, address supplier, bool isActive, uint256 createdAt, uint256 lastUpdated)",
            "function getOrderInfo(uint32 _orderId) external view returns (uint32 itemId, uint8 status, uint256 createdAt, uint256 processedAt)",
            "function getContractStats() external view returns (uint32 totalItems, uint32 totalOrders, uint256 activeItemsCount, uint256 pendingOrdersCount)",
            "function deactivateItem(uint32 _itemId) external",
            "function authorizedManagers(address) external view returns (bool)",
            "function suppliers(address) external view returns (bool isAuthorized, uint256 registeredAt)"
        ];
        this.init();
    }

    async init() {
        this.setupEventListeners();
        this.updateUI();
        await this.checkConnection();
    }

    setupEventListeners() {
        document.getElementById('connectWallet').addEventListener('click', () => this.connectWallet());

        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });

        document.getElementById('addItemBtn').addEventListener('click', (e) => this.handleAddItemClick(e));
        document.getElementById('newOrderBtn').addEventListener('click', () => this.openModal('newOrderModal'));
        document.getElementById('authorizeSupplierBtn').addEventListener('click', () => this.authorizeSupplier());

        document.getElementById('submitItem').addEventListener('click', () => this.submitNewItem());
        document.getElementById('submitOrder').addEventListener('click', () => this.submitNewOrder());
        document.getElementById('refreshInventory').addEventListener('click', () => this.loadInventoryData());

        document.getElementById('authorizeManagerBtn').addEventListener('click', () => this.authorizeManager());
        document.getElementById('grantAccessBtn').addEventListener('click', () => this.grantAccess());
        document.getElementById('emergencyPauseBtn').addEventListener('click', () => this.emergencyPause());

        document.querySelectorAll('.close, [data-modal]').forEach(element => {
            element.addEventListener('click', (e) => {
                const modalId = e.target.dataset.modal;
                if (modalId) this.closeModal(modalId);
            });
        });

        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) this.closeModal(modal.id);
            });
        });
    }

    async connectWallet() {
        try {
            if (!window.ethereum) {
                this.showStatus('Please install MetaMask to continue', 'error');
                return;
            }

            this.showStatus('Connecting to wallet...', 'loading');

            await window.ethereum.request({ method: 'eth_requestAccounts' });
            this.provider = new ethers.BrowserProvider(window.ethereum);
            this.signer = await this.provider.getSigner();

            const network = await this.provider.getNetwork();

            // Check if we're on the correct network
            await this.checkAndSwitchNetwork(network);

            this.contract = new ethers.Contract(this.contractAddress, this.contractABI, this.signer);

            const address = await this.signer.getAddress();

            document.getElementById('networkStatus').innerHTML = `
                <span class="status-indicator connected"></span>
                <span class="status-text">Connected to ${network.name || 'Custom Network'}</span>
            `;

            document.getElementById('connectWallet').textContent = `${address.slice(0, 6)}...${address.slice(-4)}`;
            document.getElementById('connectWallet').classList.add('connected');

            // Verify contract deployment
            const isContractValid = await this.verifyContract();
            if (!isContractValid) {
                this.showStatus('⚠️ Contract verification failed. Check address and network.', 'error');
                this.showContractHelp();
                return;
            }

            // Check user permissions
            await this.checkUserPermissions(address);

            this.showStatus('Wallet connected successfully!', 'success');
            await this.loadAllData();

        } catch (error) {
            console.error('Connection failed:', error);
            if (error.message.includes('network')) {
                this.showStatus('❌ Network connection failed. Please check your network settings.', 'error');
                this.showNetworkHelp();
            } else {
                this.showStatus(`Connection failed: ${error.message}`, 'error');
            }
        }
    }

    async checkAndSwitchNetwork(network) {
        const networkConfigs = {
            // Sepolia Testnet
            11155111: {
                chainId: '0xaa36a7',
                chainName: 'Sepolia',
                nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
                rpcUrls: ['https://sepolia.infura.io/v3/'],
                blockExplorerUrls: ['https://sepolia.etherscan.io/']
            },
            // Ethereum Mainnet
            1: {
                chainId: '0x1',
                chainName: 'Ethereum Mainnet',
                nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
                rpcUrls: ['https://mainnet.infura.io/v3/'],
                blockExplorerUrls: ['https://etherscan.io/']
            },
            // Local/Custom networks
            1337: {
                chainId: '0x539',
                chainName: 'Local Network',
                nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
                rpcUrls: ['http://127.0.0.1:8545'],
                blockExplorerUrls: ['']
            }
        };

        const chainId = Number(network.chainId);
        console.log('Current network chain ID:', chainId);

        // If it's a common network, we're good
        if (networkConfigs[chainId]) {
            return;
        }

        // For unknown networks, show guidance
        this.showStatus('⚠️ Custom network detected. Make sure contract is deployed on this network.', 'warning');
    }

    showNetworkHelp() {
        const helpDiv = document.createElement('div');
        helpDiv.className = 'network-help';
        helpDiv.innerHTML = `
            <div style="margin: 1rem; padding: 1rem; background: #fff3cd; border-radius: 8px; border: 1px solid #ffeaa7;">
                <h4>🌐 Network Configuration Help</h4>
                <p>This contract requires a specific network. Common options:</p>
                <div style="margin: 1rem 0;">
                    <button onclick="inventoryManager.switchToSepolia()" style="margin: 0.25rem; padding: 0.5rem 1rem; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer;">
                        🔄 Switch to Sepolia Testnet
                    </button>
                    <button onclick="inventoryManager.switchToMainnet()" style="margin: 0.25rem; padding: 0.5rem 1rem; background: #17a2b8; color: white; border: none; border-radius: 4px; cursor: pointer;">
                        🔄 Switch to Ethereum Mainnet
                    </button>
                </div>
                <p><strong>Contract Address:</strong> <code>${this.contractAddress}</code></p>
                <p><em>Or manually switch network in MetaMask and refresh this page</em></p>
                <button onclick="this.parentElement.remove()" style="margin-top: 0.5rem; padding: 0.5rem 1rem; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer;">Dismiss</button>
            </div>
        `;

        const container = document.querySelector('.container');
        container.insertBefore(helpDiv, container.firstChild);
    }

    async switchToSepolia() {
        try {
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: '0xaa36a7' }],
            });
            this.showStatus('Switched to Sepolia network. Reconnecting...', 'success');
            setTimeout(() => location.reload(), 1500);
        } catch (error) {
            console.error('Failed to switch to Sepolia:', error);
            this.showStatus('Failed to switch network. Please switch manually in MetaMask.', 'error');
        }
    }

    async switchToMainnet() {
        try {
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: '0x1' }],
            });
            this.showStatus('Switched to Ethereum Mainnet. Reconnecting...', 'success');
            setTimeout(() => location.reload(), 1500);
        } catch (error) {
            console.error('Failed to switch to mainnet:', error);
            this.showStatus('Failed to switch network. Please switch manually in MetaMask.', 'error');
        }
    }

    async verifyContract() {
        try {
            console.log('Verifying contract at:', this.contractAddress);

            // Check if there's code at the address
            const code = await this.provider.getCode(this.contractAddress);
            if (code === '0x') {
                console.error('No contract deployed at address:', this.contractAddress);
                return false;
            }

            console.log('Contract code found, length:', code.length);

            // Try a simple read operation to verify the contract interface
            try {
                const stats = await this.contract.getContractStats();
                console.log('Contract verification successful, stats:', stats);
                return true;
            } catch (interfaceError) {
                console.error('Contract interface verification failed:', interfaceError);
                return false;
            }

        } catch (error) {
            console.error('Contract verification error:', error);
            return false;
        }
    }

    showContractHelp() {
        const helpDiv = document.createElement('div');
        helpDiv.className = 'contract-help';
        helpDiv.innerHTML = `
            <div style="margin: 1rem; padding: 1rem; background: #f8d7da; border-radius: 8px; border: 1px solid #f5c6cb; color: #721c24;">
                <h4>❌ Contract Verification Failed</h4>
                <p><strong>Issues detected:</strong></p>
                <ul>
                    <li>Contract may not be deployed at this address</li>
                    <li>Wrong network selected</li>
                    <li>Contract interface mismatch</li>
                </ul>
                <p><strong>Contract Address:</strong> <code>${this.contractAddress}</code></p>
                <div style="margin: 1rem 0;">
                    <button onclick="inventoryManager.checkContractDeployment()" style="margin: 0.25rem; padding: 0.5rem 1rem; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer;">
                        🔍 Check Contract Details
                    </button>
                    <button onclick="inventoryManager.showNetworkHelp()" style="margin: 0.25rem; padding: 0.5rem 1rem; background: #ffc107; color: #212529; border: none; border-radius: 4px; cursor: pointer;">
                        🌐 Network Help
                    </button>
                </div>
                <button onclick="this.parentElement.remove()" style="margin-top: 0.5rem; padding: 0.5rem 1rem; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer;">Dismiss</button>
            </div>
        `;

        const container = document.querySelector('.container');
        container.insertBefore(helpDiv, container.firstChild);
    }

    async checkContractDeployment() {
        try {
            this.showStatus('Checking contract deployment...', 'loading');

            const network = await this.provider.getNetwork();
            const code = await this.provider.getCode(this.contractAddress);
            const balance = await this.provider.getBalance(this.contractAddress);

            const results = `
                <div style="margin: 1rem; padding: 1rem; background: #e7f3ff; border-radius: 8px; border: 1px solid #b8daff;">
                    <h4>🔍 Contract Inspection Results</h4>
                    <p><strong>Network:</strong> ${network.name || 'Unknown'} (Chain ID: ${network.chainId})</p>
                    <p><strong>Address:</strong> ${this.contractAddress}</p>
                    <p><strong>Code Length:</strong> ${code === '0x' ? '0 (No contract)' : code.length + ' bytes'}</p>
                    <p><strong>Balance:</strong> ${ethers.formatEther(balance)} ETH</p>
                    <p><strong>Status:</strong> ${code === '0x' ? '❌ No contract deployed' : '✅ Contract found'}</p>
                    ${code === '0x' ?
                        '<p style="color: #dc3545;"><strong>Problem:</strong> No smart contract is deployed at this address on the current network.</p>' :
                        '<p style="color: #28a745;"><strong>Note:</strong> Contract exists but may have interface issues.</p>'
                    }
                    <button onclick="this.parentElement.remove()" style="margin-top: 1rem; padding: 0.5rem 1rem; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">Close</button>
                </div>
            `;

            const container = document.querySelector('.container');
            const existingResults = container.querySelector('.contract-inspection');
            if (existingResults) existingResults.remove();

            const resultsDiv = document.createElement('div');
            resultsDiv.className = 'contract-inspection';
            resultsDiv.innerHTML = results;
            container.insertBefore(resultsDiv, container.firstChild);

            this.showStatus('Contract inspection completed', 'info');

        } catch (error) {
            console.error('Contract inspection failed:', error);
            this.showStatus('Failed to inspect contract', 'error');
        }
    }

    async checkConnection() {
        if (window.ethereum && window.ethereum.selectedAddress) {
            await this.connectWallet();
        }
    }

    async checkUserPermissions(address) {
        try {
            const isManager = await this.contract.authorizedManagers(address);

            if (isManager) {
                this.showPermissionBanner('✅ Manager Access - You can add items and manage inventory', 'success');
                this.enableManagerFunctions();
            } else {
                this.showPermissionBanner('⚠️ Limited Access - Contact owner for manager authorization', 'warning');
                // Disable manager-only buttons
                this.disableManagerFunctions();
            }
        } catch (error) {
            console.error('Error checking permissions:', error);
            this.showPermissionBanner('❌ Permission Check Failed - Some functions may not work', 'error');
        }
    }

    showPermissionBanner(message, type) {
        // Add a permission banner to the header
        const existingBanner = document.getElementById('permissionBanner');
        if (existingBanner) existingBanner.remove();

        const banner = document.createElement('div');
        banner.id = 'permissionBanner';
        banner.className = `permission-banner ${type}`;
        banner.textContent = message;

        const header = document.querySelector('header');
        header.appendChild(banner);
    }

    disableManagerFunctions() {
        // Disable buttons that require manager access
        const managerButtons = [
            'addItemBtn',
            'authorizeManagerBtn',
            'grantAccessBtn',
            'emergencyPauseBtn'
        ];

        managerButtons.forEach(btnId => {
            const btn = document.getElementById(btnId);
            if (btn) {
                btn.title = 'Manager access required - Click for help';
                btn.style.opacity = '0.5';
                btn.style.cursor = 'pointer';

                // Mark button as requiring authorization
                btn.setAttribute('data-requires-auth', 'true');
            }
        });
    }

    enableManagerFunctions() {
        // Enable buttons that require manager access
        const managerButtons = [
            'addItemBtn',
            'authorizeManagerBtn',
            'grantAccessBtn',
            'emergencyPauseBtn'
        ];

        managerButtons.forEach(btnId => {
            const btn = document.getElementById(btnId);
            if (btn) {
                btn.disabled = false;
                btn.title = '';
                btn.style.opacity = '1';
                btn.style.cursor = 'pointer';

                // Remove authorization requirement
                btn.removeAttribute('data-requires-auth');
            }
        });
    }

    handleAddItemClick(e) {
        const btn = e.target;
        if (btn.getAttribute('data-requires-auth') === 'true') {
            this.showAuthorizationGuidance();
        } else {
            this.openModal('addItemModal');
        }
    }

    showAuthorizationGuidance() {
        const message = `
            🔐 Manager Authorization Required

            To add inventory items, you need manager access.

            Options:
            1. If you're the contract owner, use the Management tab to authorize your address
            2. Contact the contract owner to authorize your address: ${this.signer ? this.signer.address : 'N/A'}
            3. Current contract address: ${this.contractAddress}

            Your current address will be copied to clipboard.
        `;

        if (this.signer && this.signer.address) {
            navigator.clipboard.writeText(this.signer.address).catch(() => {});
        }

        this.showStatus(message, 'info', 8000);
    }

    switchTab(tabName) {
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        document.getElementById(tabName).classList.add('active');

        if (tabName === 'inventory') this.loadInventoryData();
        if (tabName === 'orders') this.loadOrdersData();
        if (tabName === 'suppliers') this.loadSuppliersData();
        if (tabName === 'analytics') this.loadAnalyticsData();
    }

    async loadAllData() {
        await Promise.all([
            this.loadInventoryData(),
            this.loadOrdersData(),
            this.loadSuppliersData(),
            this.loadAnalyticsData()
        ]);
    }

    async loadInventoryData() {
        if (!this.contract) return;

        try {
            const stats = await this.contract.getContractStats();
            const totalItems = parseInt(stats.totalItems.toString());
            const items = [];

            for (let i = 1; i <= totalItems; i++) {
                try {
                    const item = await this.contract.getItemInfo(i);
                    items.push({
                        id: i,
                        name: item.itemName,
                        supplier: item.supplier,
                        isActive: item.isActive,
                        createdAt: new Date(parseInt(item.createdAt.toString()) * 1000).toLocaleDateString(),
                        lastUpdated: new Date(parseInt(item.lastUpdated.toString()) * 1000).toLocaleDateString()
                    });
                } catch (error) {
                    console.error(`Error loading item ${i}:`, error);
                }
            }

            this.renderInventoryItems(items);
            this.updateInventoryStats(items);

        } catch (error) {
            console.error('Error loading inventory:', error);
            this.showStatus('Failed to load inventory data', 'error');
        }
    }

    renderInventoryItems(items) {
        const container = document.getElementById('inventoryItems');

        if (items.length === 0) {
            container.innerHTML = '<div class="empty-state">No inventory items found</div>';
            return;
        }

        container.innerHTML = items.map(item => `
            <div class="item-card ${item.isActive ? '' : 'inactive'}">
                <div class="item-header">
                    <h4>${item.name}</h4>
                    <span class="item-status ${item.isActive ? 'active' : 'inactive'}">
                        ${item.isActive ? '✅ Active' : '⚠️ Inactive'}
                    </span>
                </div>
                <div class="item-details">
                    <div class="detail-row">
                        <span class="label">ID:</span>
                        <span class="value">${item.id}</span>
                    </div>
                    <div class="detail-row">
                        <span class="label">Supplier:</span>
                        <span class="value">${item.supplier.slice(0, 6)}...${item.supplier.slice(-4)}</span>
                    </div>
                    <div class="detail-row">
                        <span class="label">Created:</span>
                        <span class="value">${item.createdAt}</span>
                    </div>
                    <div class="detail-row">
                        <span class="label">Updated:</span>
                        <span class="value">${item.lastUpdated}</span>
                    </div>
                </div>
                <div class="item-actions">
                    <button class="action-btn small" onclick="inventoryManager.updateItemStock(${item.id})">Update Stock</button>
                    <button class="action-btn small secondary" onclick="inventoryManager.viewItemDetails(${item.id})">Details</button>
                </div>
            </div>
        `).join('');
    }

    updateInventoryStats(items) {
        const totalItems = items.length;
        const activeItems = items.filter(item => item.isActive).length;
        const lowStockItems = 0; // This would require decryption in a real implementation

        document.getElementById('totalItems').textContent = totalItems;
        document.getElementById('activeItems').textContent = activeItems;
        document.getElementById('lowStockItems').textContent = lowStockItems;
    }

    async loadOrdersData() {
        if (!this.contract) return;

        try {
            const stats = await this.contract.getContractStats();
            const totalOrders = parseInt(stats.totalOrders.toString());
            const orders = [];

            for (let i = 1; i <= totalOrders; i++) {
                try {
                    const order = await this.contract.getOrderInfo(i);
                    const statusNames = ['Pending', 'Approved', 'Rejected', 'Fulfilled', 'Cancelled'];
                    orders.push({
                        id: i,
                        itemId: order.itemId.toString(),
                        status: statusNames[order.status] || 'Unknown',
                        fulfilled: order.status === 3, // Fulfilled
                        createdAt: new Date(parseInt(order.createdAt.toString()) * 1000).toLocaleString(),
                        processedAt: order.processedAt > 0 ? new Date(parseInt(order.processedAt.toString()) * 1000).toLocaleString() : 'Not processed'
                    });
                } catch (error) {
                    console.error(`Error loading order ${i}:`, error);
                }
            }

            this.renderOrders(orders);
            this.updateOrderStats(orders);

        } catch (error) {
            console.error('Error loading orders:', error);
        }
    }

    renderOrders(orders) {
        const container = document.getElementById('ordersList');

        if (orders.length === 0) {
            container.innerHTML = '<div class="empty-state">No orders found</div>';
            return;
        }

        container.innerHTML = orders.map(order => `
            <div class="order-card">
                <div class="order-header">
                    <span class="order-id">Order #${order.id}</span>
                    <span class="order-status ${order.fulfilled ? 'fulfilled' : 'pending'}">
                        ${order.fulfilled ? '✅ Fulfilled' : '⏳ Pending'}
                    </span>
                </div>
                <div class="order-details">
                    <div class="detail-row">
                        <span class="label">Item ID:</span>
                        <span class="value">${order.itemId}</span>
                    </div>
                    <div class="detail-row">
                        <span class="label">Requester:</span>
                        <span class="value">${order.requester.slice(0, 6)}...${order.requester.slice(-4)}</span>
                    </div>
                    <div class="detail-row">
                        <span class="label">Date:</span>
                        <span class="value">${order.createdAt}</span>
                    </div>
                </div>
                ${!order.fulfilled ? `
                    <div class="order-actions">
                        <button class="action-btn small" onclick="inventoryManager.processOrder(${order.id}, 1)">Approve</button>
                        <button class="action-btn small danger" onclick="inventoryManager.processOrder(${order.id}, 2)">Reject</button>
                    </div>
                ` : ''}
            </div>
        `).join('');
    }

    updateOrderStats(orders) {
        const pendingOrders = orders.filter(order => !order.fulfilled).length;
        const fulfilledOrders = orders.filter(order => order.fulfilled).length;

        document.getElementById('pendingOrders').textContent = pendingOrders;
        document.getElementById('fulfilledOrders').textContent = fulfilledOrders;
    }

    async loadSuppliersData() {
        const container = document.getElementById('suppliersList');
        container.innerHTML = '<div class="empty-state">Supplier data requires additional contract queries</div>';
    }

    async loadAnalyticsData() {
        const container = document.getElementById('systemStats');
        if (!this.contract) {
            container.innerHTML = '<div class="empty-state">Connect wallet to view analytics</div>';
            return;
        }

        try {
            const stats = await this.contract.getContractStats();

            container.innerHTML = `
                <div class="stat-item">
                    <span class="stat-label">Total Items:</span>
                    <span class="stat-value">${stats.totalItems}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Active Items:</span>
                    <span class="stat-value">${stats.activeItemsCount}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Total Orders:</span>
                    <span class="stat-value">${stats.totalOrders}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Pending Orders:</span>
                    <span class="stat-value">${stats.pendingOrdersCount}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Contract Address:</span>
                    <span class="stat-value">${this.contractAddress.slice(0, 6)}...${this.contractAddress.slice(-4)}</span>
                </div>
            `;
        } catch (error) {
            container.innerHTML = '<div class="empty-state">Error loading system stats</div>';
        }
    }

    async submitNewItem() {
        if (!this.contract) {
            this.showStatus('Please connect your wallet first', 'error');
            return;
        }

        try {
            const name = document.getElementById('itemName').value;
            const quantity = document.getElementById('itemQuantity').value;
            const price = document.getElementById('itemPrice').value;
            const minStock = document.getElementById('minStockLevel').value;
            const supplier = document.getElementById('supplierAddress').value;

            if (!name || !quantity || !price || !minStock || !supplier) {
                this.showStatus('Please fill all fields', 'error');
                return;
            }

            // Validate Ethereum address format
            if (!ethers.isAddress(supplier)) {
                this.showStatus('❌ Invalid supplier address format. Please enter a valid Ethereum address (0x...)', 'error');
                return;
            }

            this.showStatus('Adding new inventory item...', 'loading');

            // Convert price from ETH to wei for storage
            const priceInWei = ethers.parseEther(price).toString();

            const tx = await this.contract.addInventoryItem(
                parseInt(quantity),
                priceInWei,
                parseInt(minStock),
                name,
                supplier
            );
            await tx.wait();

            this.showStatus('Inventory item added successfully!', 'success');
            this.closeModal('addItemModal');
            this.clearForm(['itemName', 'itemQuantity', 'itemPrice', 'minStockLevel', 'supplierAddress']);
            await this.loadInventoryData();

        } catch (error) {
            console.error('Error adding item:', error);
            if (error.message.includes('Not authorized manager')) {
                this.showStatus('❌ Access denied: Manager authorization required to add inventory items', 'error');
            } else if (error.message.includes('missing revert data')) {
                this.showStatus('❌ Contract call failed: Contract may not be deployed or network mismatch', 'error');
                this.showContractHelp();
            } else if (error.code === 'CALL_EXCEPTION') {
                this.showStatus('❌ Transaction failed: Check contract address and network', 'error');
            } else {
                this.showStatus(`Failed to add item: ${error.message}`, 'error');
            }
        }
    }

    async submitNewOrder() {
        if (!this.contract) {
            this.showStatus('Please connect your wallet first', 'error');
            return;
        }

        try {
            const itemId = document.getElementById('orderItemId').value;
            const quantity = document.getElementById('orderQuantity').value;

            if (!itemId || !quantity) {
                this.showStatus('Please fill all fields', 'error');
                return;
            }

            // Validate item exists and is active
            try {
                const item = await this.contract.getItemInfo(parseInt(itemId));
                if (!item.isActive) {
                    this.showStatus('❌ Cannot place order: Item is inactive or deactivated', 'error');
                    return;
                }
            } catch (itemError) {
                this.showStatus('❌ Cannot place order: Item ID does not exist', 'error');
                return;
            }

            this.showStatus('Placing order...', 'loading');

            const tx = await this.contract.placeOrder(parseInt(itemId), parseInt(quantity));
            await tx.wait();

            this.showStatus('Order placed successfully!', 'success');
            this.closeModal('newOrderModal');
            this.clearForm(['orderItemId', 'orderQuantity']);
            await this.loadOrdersData();

        } catch (error) {
            console.error('Error placing order:', error);
            if (error.message.includes('Item not active')) {
                this.showStatus('❌ Cannot place order: Item is not active', 'error');
            } else if (error.message.includes('Invalid quantity')) {
                this.showStatus('❌ Invalid quantity: Please enter a positive number', 'error');
            } else {
                this.showStatus(`Failed to place order: ${error.message}`, 'error');
            }
        }
    }

    async authorizeManager() {
        if (!this.contract) return;

        try {
            const address = document.getElementById('newManagerAddress').value;
            if (!address) {
                this.showStatus('Please enter manager address', 'error');
                return;
            }

            // Validate Ethereum address format
            if (!ethers.isAddress(address)) {
                this.showStatus('❌ Invalid manager address format. Please enter a valid Ethereum address (0x...)', 'error');
                return;
            }

            this.showStatus('Authorizing manager...', 'loading');
            const tx = await this.contract.authorizeManager(address);
            await tx.wait();

            this.showStatus('Manager authorized successfully!', 'success');
            document.getElementById('newManagerAddress').value = '';

        } catch (error) {
            console.error('Error authorizing manager:', error);
            this.showStatus(`Failed to authorize manager: ${error.message}`, 'error');
        }
    }

    async authorizeSupplier() {
        const address = prompt('Enter supplier address:');
        if (!address || !this.contract) return;

        // Validate Ethereum address format
        if (!ethers.isAddress(address)) {
            this.showStatus('❌ Invalid supplier address format. Please enter a valid Ethereum address (0x...)', 'error');
            return;
        }

        this.showStatus('Note: Suppliers are automatically authorized when adding items', 'info');
    }

    async grantAccess() {
        if (!this.contract) return;

        try {
            const itemId = document.getElementById('accessItemId').value;
            const userAddress = document.getElementById('accessUserAddress').value;

            if (!itemId || !userAddress) {
                this.showStatus('Please fill all fields', 'error');
                return;
            }

            this.showStatus('Granting access...', 'loading');
            const tx = await this.contract.grantInventoryAccess(parseInt(itemId), userAddress);
            await tx.wait();

            this.showStatus('Access granted successfully!', 'success');
            this.clearForm(['accessItemId', 'accessUserAddress']);

        } catch (error) {
            console.error('Error granting access:', error);
            this.showStatus(`Failed to grant access: ${error.message}`, 'error');
        }
    }

    async emergencyPause() {
        if (!this.contract) return;

        if (!confirm('Are you sure you want to emergency pause all inventory items? This action cannot be undone.')) {
            return;
        }

        try {
            this.showStatus('Emergency pause in progress...', 'loading');
            const tx = await this.contract.emergencyPause();
            await tx.wait();

            this.showStatus('Emergency pause completed!', 'warning');
            await this.loadInventoryData();

        } catch (error) {
            console.error('Error during emergency pause:', error);
            this.showStatus(`Emergency pause failed: ${error.message}`, 'error');
        }
    }

    async processOrder(orderId, status) {
        if (!this.contract) return;

        try {
            const statusNames = ['Pending', 'Approved', 'Rejected', 'Fulfilled', 'Cancelled'];
            this.showStatus(`${statusNames[status]} order...`, 'loading');
            const tx = await this.contract.processOrder(orderId, status);
            await tx.wait();

            this.showStatus(`Order ${statusNames[status].toLowerCase()} successfully!`, 'success');
            await this.loadOrdersData();

        } catch (error) {
            console.error('Error processing order:', error);
            this.showStatus(`Failed to process order: ${error.message}`, 'error');
        }
    }

    async updateItemStock(itemId) {
        const quantityChange = prompt('Enter quantity to add (positive) or subtract (negative):');
        if (!quantityChange || !this.contract) return;

        try {
            this.showStatus('Updating stock...', 'loading');
            const isAddition = parseInt(quantityChange) > 0;
            const absoluteQuantity = Math.abs(parseInt(quantityChange));

            const tx = await this.contract.updateStock(itemId, absoluteQuantity, isAddition);
            await tx.wait();

            this.showStatus('Stock updated successfully!', 'success');
            await this.loadInventoryData();

        } catch (error) {
            console.error('Error updating stock:', error);
            this.showStatus(`Failed to update stock: ${error.message}`, 'error');
        }
    }

    viewItemDetails(itemId) {
        alert(`Item details for ID ${itemId} - Full details would require FHE decryption`);
    }

    async openModal(modalId) {
        document.getElementById(modalId).style.display = 'flex';

        // If it's the order modal, populate available items
        if (modalId === 'newOrderModal' && this.contract) {
            await this.populateAvailableItems();
        }
    }

    async populateAvailableItems() {
        try {
            const stats = await this.contract.getContractStats();
            const totalItems = parseInt(stats.totalItems.toString());
            const availableItems = [];

            for (let i = 1; i <= totalItems; i++) {
                try {
                    const item = await this.contract.getItemInfo(i);
                    if (item.isActive) {
                        availableItems.push({ id: i, name: item.itemName });
                    }
                } catch (error) {
                    // Item doesn't exist, skip
                }
            }

            // Update the order modal with available items info
            const orderModalBody = document.querySelector('#newOrderModal .modal-body');
            let existingHelp = orderModalBody.querySelector('.available-items-help');
            if (existingHelp) existingHelp.remove();

            if (availableItems.length > 0) {
                const helpDiv = document.createElement('div');
                helpDiv.className = 'available-items-help';
                helpDiv.innerHTML = `
                    <div style="margin-bottom: 1rem; padding: 0.75rem; background: #f8f9fa; border-radius: 8px; font-size: 0.9rem;">
                        <strong>📦 Available Items:</strong><br>
                        ${availableItems.map(item => `ID ${item.id}: ${item.name}`).join('<br>')}
                    </div>
                `;
                orderModalBody.insertBefore(helpDiv, orderModalBody.firstChild);
            } else {
                const helpDiv = document.createElement('div');
                helpDiv.className = 'available-items-help';
                helpDiv.innerHTML = `
                    <div style="margin-bottom: 1rem; padding: 0.75rem; background: #fff3cd; border-radius: 8px; font-size: 0.9rem; color: #856404;">
                        ⚠️ No active items available for ordering
                    </div>
                `;
                orderModalBody.insertBefore(helpDiv, orderModalBody.firstChild);
            }
        } catch (error) {
            console.error('Error loading available items:', error);
        }
    }

    closeModal(modalId) {
        document.getElementById(modalId).style.display = 'none';
    }

    clearForm(fieldIds) {
        fieldIds.forEach(id => {
            const field = document.getElementById(id);
            if (field) field.value = '';
        });
    }

    showStatus(message, type = 'info', duration = 5000) {
        const statusDiv = document.getElementById('status');
        statusDiv.innerHTML = message.replace(/\n/g, '<br>');
        statusDiv.className = `status-message ${type}`;
        statusDiv.style.display = 'block';

        // Clear any existing timeout
        if (this.statusTimeout) {
            clearTimeout(this.statusTimeout);
        }

        this.statusTimeout = setTimeout(() => {
            statusDiv.style.display = 'none';
        }, duration);
    }

    updateUI() {
        // Initialize UI state
        this.switchTab('inventory');
    }
}

// Initialize the application
const inventoryManager = new SecretInventoryManager();

// Handle wallet connection events
if (window.ethereum) {
    window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length === 0) {
            location.reload();
        } else {
            inventoryManager.connectWallet();
        }
    });

    window.ethereum.on('chainChanged', () => {
        location.reload();
    });
}