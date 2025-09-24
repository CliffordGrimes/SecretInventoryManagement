// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@fhevm/solidity/lib/FHE.sol";

contract SecretInventoryManagement {
    using FHE for euint32;
    using FHE for euint64;
    using FHE for ebool;

    address public owner;
    uint32 public nextItemId;
    uint32 public nextOrderId;

    struct InventoryItem {
        euint32 quantity;           // Encrypted stock quantity
        euint64 price;              // Encrypted unit price
        euint32 minStockLevel;      // Encrypted minimum stock level
        string itemName;            // Public item name/description
        address supplier;           // Supplier address
        bool isActive;             // Item status
        uint256 createdAt;         // Creation timestamp
        uint256 lastUpdated;       // Last update timestamp
    }

    struct StockOrder {
        uint32 itemId;             // Item reference
        eaddress requester;        // Encrypted requester address
        euint32 requestedQuantity; // Encrypted requested quantity
        euint64 totalCost;         // Encrypted total cost
        OrderStatus status;        // Order status
        uint256 createdAt;         // Order timestamp
        uint256 processedAt;       // Processing timestamp
    }

    struct SupplierAccess {
        mapping(uint32 => bool) canAccessItem;
        bool isAuthorized;
        uint256 registeredAt;
    }

    enum OrderStatus { Pending, Approved, Rejected, Fulfilled, Cancelled }

    mapping(uint32 => InventoryItem) public inventory;
    mapping(uint32 => StockOrder) public orders;
    mapping(address => SupplierAccess) public suppliers;
    mapping(address => bool) public authorizedManagers;

    uint32[] public activeItems;
    uint32[] public pendingOrders;

    event ItemAdded(uint32 indexed itemId, string itemName, address indexed supplier);
    event StockUpdated(uint32 indexed itemId, uint256 timestamp);
    event OrderPlaced(uint32 indexed orderId, uint32 indexed itemId, address indexed requester);
    event OrderProcessed(uint32 indexed orderId, OrderStatus status, uint256 timestamp);
    event SupplierAuthorized(address indexed supplier, uint256 timestamp);
    event LowStockAlert(uint32 indexed itemId, uint256 timestamp);
    event AccessGranted(address indexed user, uint32 indexed itemId);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not authorized");
        _;
    }

    modifier onlyManager() {
        require(msg.sender == owner || authorizedManagers[msg.sender], "Not authorized manager");
        _;
    }

    modifier onlySupplier(uint32 itemId) {
        require(suppliers[msg.sender].isAuthorized &&
                suppliers[msg.sender].canAccessItem[itemId], "Not authorized supplier");
        _;
    }

    constructor() {
        owner = msg.sender;
        nextItemId = 1;
        nextOrderId = 1;
        authorizedManagers[msg.sender] = true;
    }

    // Add new inventory item with encrypted quantities
    function addInventoryItem(
        uint32 _quantity,
        uint64 _price,
        uint32 _minStockLevel,
        string calldata _itemName,
        address _supplier
    ) external onlyManager {
        require(_supplier != address(0), "Invalid supplier");
        require(bytes(_itemName).length > 0, "Item name required");

        uint32 itemId = nextItemId++;

        // Encrypt the sensitive data
        euint32 encryptedQuantity = FHE.asEuint32(_quantity);
        euint64 encryptedPrice = FHE.asEuint64(_price);
        euint32 encryptedMinStock = FHE.asEuint32(_minStockLevel);

        inventory[itemId] = InventoryItem({
            quantity: encryptedQuantity,
            price: encryptedPrice,
            minStockLevel: encryptedMinStock,
            itemName: _itemName,
            supplier: _supplier,
            isActive: true,
            createdAt: block.timestamp,
            lastUpdated: block.timestamp
        });

        // Grant access permissions
        FHE.allowThis(encryptedQuantity);
        FHE.allowThis(encryptedPrice);
        FHE.allowThis(encryptedMinStock);
        FHE.allow(encryptedQuantity, _supplier);
        FHE.allow(encryptedPrice, _supplier);

        activeItems.push(itemId);

        // Authorize supplier for this item
        if (!suppliers[_supplier].isAuthorized) {
            suppliers[_supplier].isAuthorized = true;
            suppliers[_supplier].registeredAt = block.timestamp;
        }
        suppliers[_supplier].canAccessItem[itemId] = true;

        emit ItemAdded(itemId, _itemName, _supplier);
        emit SupplierAuthorized(_supplier, block.timestamp);
    }

    // Update stock quantity (suppliers can add, managers can add/subtract)
    function updateStock(uint32 _itemId, uint32 _quantityChange, bool _isAddition) external {
        require(inventory[_itemId].isActive, "Item not active");
        require(_quantityChange > 0, "Invalid quantity");

        bool isSupplier = suppliers[msg.sender].isAuthorized &&
                         suppliers[msg.sender].canAccessItem[_itemId];
        bool isManager = msg.sender == owner || authorizedManagers[msg.sender];

        require(isSupplier || isManager, "Not authorized");

        // Suppliers can only add stock, managers can add or subtract
        if (isSupplier && !_isAddition) {
            revert("Suppliers can only add stock");
        }

        euint32 changeAmount = FHE.asEuint32(_quantityChange);

        if (_isAddition) {
            inventory[_itemId].quantity = FHE.add(inventory[_itemId].quantity, changeAmount);
        } else {
            // For subtraction, we assume managers verify stock levels externally
            // In production, this would use async decryption to verify stock
            inventory[_itemId].quantity = FHE.sub(inventory[_itemId].quantity, changeAmount);
        }

        inventory[_itemId].lastUpdated = block.timestamp;

        // Grant access to updated quantity
        FHE.allowThis(inventory[_itemId].quantity);
        FHE.allow(inventory[_itemId].quantity, inventory[_itemId].supplier);

        emit StockUpdated(_itemId, block.timestamp);

        // Check for low stock alert
        _checkLowStock(_itemId);
    }

    // Place stock order with encrypted details
    function placeOrder(uint32 _itemId, uint32 _requestedQuantity) external {
        require(inventory[_itemId].isActive, "Item not active");
        require(_requestedQuantity > 0, "Invalid quantity");

        uint32 orderId = nextOrderId++;

        // Encrypt order details
        eaddress encryptedRequester = FHE.asEaddress(msg.sender);
        euint32 encryptedQuantity = FHE.asEuint32(_requestedQuantity);

        // Calculate total cost: quantity * price
        euint64 totalCost = FHE.mul(
            FHE.asEuint64(_requestedQuantity),
            inventory[_itemId].price
        );

        orders[orderId] = StockOrder({
            itemId: _itemId,
            requester: encryptedRequester,
            requestedQuantity: encryptedQuantity,
            totalCost: totalCost,
            status: OrderStatus.Pending,
            createdAt: block.timestamp,
            processedAt: 0
        });

        // Grant access permissions
        FHE.allowThis(encryptedRequester);
        FHE.allowThis(encryptedQuantity);
        FHE.allowThis(totalCost);
        FHE.allow(encryptedRequester, msg.sender);
        FHE.allow(encryptedQuantity, msg.sender);
        FHE.allow(totalCost, msg.sender);

        pendingOrders.push(orderId);

        emit OrderPlaced(orderId, _itemId, msg.sender);
    }

    // Process order (approve/reject)
    function processOrder(uint32 _orderId, OrderStatus _status) external onlyManager {
        require(_status == OrderStatus.Approved || _status == OrderStatus.Rejected, "Invalid status");
        require(orders[_orderId].status == OrderStatus.Pending, "Order not pending");

        orders[_orderId].status = _status;
        orders[_orderId].processedAt = block.timestamp;

        if (_status == OrderStatus.Approved) {
            uint32 itemId = orders[_orderId].itemId;

            // In production, stock verification would be done via async decryption
            // For now, we assume the manager has verified stock availability
            inventory[itemId].quantity = FHE.sub(
                inventory[itemId].quantity,
                orders[_orderId].requestedQuantity
            );
            inventory[itemId].lastUpdated = block.timestamp;
            orders[_orderId].status = OrderStatus.Fulfilled;

            emit StockUpdated(itemId, block.timestamp);
            _checkLowStock(itemId);
        }

        // Remove from pending orders
        _removePendingOrder(_orderId);

        emit OrderProcessed(_orderId, orders[_orderId].status, block.timestamp);
    }

    // Check if stock is below minimum level
    function _checkLowStock(uint32 _itemId) private {
        // In production, this would use async decryption to compare values
        // For now, we emit the alert to let external systems check stock levels
        emit LowStockAlert(_itemId, block.timestamp);
    }

    // Grant access to specific inventory data
    function grantInventoryAccess(uint32 _itemId, address _user) external onlyManager {
        require(inventory[_itemId].isActive, "Item not active");

        FHE.allow(inventory[_itemId].quantity, _user);
        FHE.allow(inventory[_itemId].price, _user);
        FHE.allow(inventory[_itemId].minStockLevel, _user);

        emit AccessGranted(_user, _itemId);
    }

    // Get item basic info (public data)
    function getItemInfo(uint32 _itemId) external view returns (
        string memory itemName,
        address supplier,
        bool isActive,
        uint256 createdAt,
        uint256 lastUpdated
    ) {
        InventoryItem storage item = inventory[_itemId];
        return (
            item.itemName,
            item.supplier,
            item.isActive,
            item.createdAt,
            item.lastUpdated
        );
    }

    // Get order basic info
    function getOrderInfo(uint32 _orderId) external view returns (
        uint32 itemId,
        OrderStatus status,
        uint256 createdAt,
        uint256 processedAt
    ) {
        StockOrder storage order = orders[_orderId];
        return (
            order.itemId,
            order.status,
            order.createdAt,
            order.processedAt
        );
    }

    // Authorize new manager
    function authorizeManager(address _manager) external onlyOwner {
        require(_manager != address(0), "Invalid address");
        authorizedManagers[_manager] = true;
    }

    // Remove manager authorization
    function revokeManagerAuth(address _manager) external onlyOwner {
        require(_manager != owner, "Cannot revoke owner");
        authorizedManagers[_manager] = false;
    }

    // Deactivate item
    function deactivateItem(uint32 _itemId) external onlyManager {
        inventory[_itemId].isActive = false;
        _removeActiveItem(_itemId);
    }

    // Get active items count
    function getActiveItemsCount() external view returns (uint256) {
        return activeItems.length;
    }

    // Get pending orders count
    function getPendingOrdersCount() external view returns (uint256) {
        return pendingOrders.length;
    }

    // Helper function to remove item from active list
    function _removeActiveItem(uint32 _itemId) private {
        for (uint i = 0; i < activeItems.length; i++) {
            if (activeItems[i] == _itemId) {
                activeItems[i] = activeItems[activeItems.length - 1];
                activeItems.pop();
                break;
            }
        }
    }

    // Helper function to remove order from pending list
    function _removePendingOrder(uint32 _orderId) private {
        for (uint i = 0; i < pendingOrders.length; i++) {
            if (pendingOrders[i] == _orderId) {
                pendingOrders[i] = pendingOrders[pendingOrders.length - 1];
                pendingOrders.pop();
                break;
            }
        }
    }

    // Emergency pause (only owner)
    function emergencyPause() external onlyOwner {
        // Pause all operations by deactivating all items
        for (uint i = 0; i < activeItems.length; i++) {
            inventory[activeItems[i]].isActive = false;
        }
    }

    // Get contract statistics
    function getContractStats() external view returns (
        uint32 totalItems,
        uint32 totalOrders,
        uint256 activeItemsCount,
        uint256 pendingOrdersCount
    ) {
        return (
            nextItemId - 1,
            nextOrderId - 1,
            activeItems.length,
            pendingOrders.length
        );
    }
}