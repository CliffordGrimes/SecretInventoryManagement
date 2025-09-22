// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@fhevm/solidity/lib/FHE.sol";

contract SecretInventoryManagement {
    using FHE for euint8;
    using FHE for euint32;
    using FHE for ebool;

    struct InventoryItem {
        string itemName;
        string category;
        string description;
        address owner;
        uint256 timestamp;
        euint32 quantity;
        euint32 minThreshold;
        ebool isActive;
        bool isRevealed;
        uint256 lastUpdated;
    }

    mapping(uint256 => InventoryItem) public inventoryItems;
    mapping(uint256 => mapping(address => bool)) public hasVoted;
    mapping(address => bool) public authorizedManagers;
    uint256 public totalItems;
    uint256 public constant APPROVAL_THRESHOLD = 3;

    event ItemAdded(
        uint256 indexed itemId,
        string itemName,
        string category,
        address owner
    );

    event QuantityVoted(
        uint256 indexed itemId,
        address voter
    );

    event ItemStatusUpdated(
        uint256 indexed itemId,
        bool isActive
    );

    event ManagerAuthorized(address indexed manager);
    event ManagerRevoked(address indexed manager);

    constructor() {
        authorizedManagers[msg.sender] = true;
    }

    modifier onlyAuthorized() {
        require(authorizedManagers[msg.sender], "Not authorized manager");
        _;
    }

    function addInventoryItem(
        string memory _itemName,
        string memory _category,
        string memory _description,
        uint32 _initialQuantity,
        uint32 _minThreshold
    ) external onlyAuthorized returns (uint256) {
        uint256 itemId = totalItems;

        inventoryItems[itemId] = InventoryItem({
            itemName: _itemName,
            category: _category,
            description: _description,
            owner: msg.sender,
            timestamp: block.timestamp,
            quantity: FHE.asEuint32(_initialQuantity),
            minThreshold: FHE.asEuint32(_minThreshold),
            isActive: FHE.asEbool(true),
            isRevealed: false,
            lastUpdated: block.timestamp
        });

        totalItems++;

        emit ItemAdded(itemId, _itemName, _category, msg.sender);
        return itemId;
    }

    function updateQuantity(uint256 _itemId, bool _isIncrease, uint32 _amount) external onlyAuthorized {
        require(_itemId < totalItems, "Item does not exist");
        require(!hasVoted[_itemId][msg.sender], "Already voted on this update");

        InventoryItem storage item = inventoryItems[_itemId];

        // Convert plain boolean to encrypted boolean using FHE.asBool()
        ebool encryptedOperation = FHE.asEbool(_isIncrease);
        euint32 encryptedAmount = FHE.asEuint32(_amount);

        // Update quantity based on operation (increase or decrease)
        item.quantity = FHE.select(
            encryptedOperation,
            FHE.add(item.quantity, encryptedAmount),
            FHE.sub(item.quantity, encryptedAmount)
        );

        item.lastUpdated = block.timestamp;
        hasVoted[_itemId][msg.sender] = true;

        emit QuantityVoted(_itemId, msg.sender);

        // Check if quantity is below threshold
        _checkThresholdAlert(_itemId);
    }

    function _checkThresholdAlert(uint256 _itemId) internal {
        InventoryItem storage item = inventoryItems[_itemId];

        // Check if quantity is below minimum threshold
        ebool belowThreshold = FHE.lt(item.quantity, item.minThreshold);

        // If below threshold, deactivate item
        item.isActive = FHE.select(belowThreshold, FHE.asEbool(false), item.isActive);

        // For now, emit with false since we can't decrypt synchronously
        emit ItemStatusUpdated(_itemId, false);
    }

    function getItemDetails(uint256 _itemId) external view returns (
        string memory itemName,
        string memory category,
        string memory description,
        uint256 quantity,
        uint256 minThreshold,
        bool isActive
    ) {
        require(_itemId < totalItems, "Item does not exist");

        InventoryItem storage item = inventoryItems[_itemId];

        // Only reveal quantities to authorized managers
        uint256 qty = 0;
        uint256 threshold = 0;
        bool active = false;

        if (authorizedManagers[msg.sender] || item.isRevealed) {
            // Note: In production, use async decryption via requestDecryption
            // For demo purposes, these will return 0/false
            qty = 0; // Would be async decrypted value
            threshold = 0; // Would be async decrypted value
            active = false; // Would be async decrypted value
        }

        return (
            item.itemName,
            item.category,
            item.description,
            qty,
            threshold,
            active
        );
    }

    function getItemStatus(uint256 _itemId) external view returns (bool isActive, bool canView) {
        require(_itemId < totalItems, "Item does not exist");

        InventoryItem storage item = inventoryItems[_itemId];

        if (authorizedManagers[msg.sender] || item.isRevealed) {
            // Note: In production, use async decryption via requestDecryption
            bool active = false; // Would be async decrypted value
            return (active, true);
        }

        return (false, false);
    }

    function getTotalItems() external view returns (uint256) {
        return totalItems;
    }

    function getItemOwner(uint256 _itemId) external view returns (address) {
        require(_itemId < totalItems, "Item does not exist");
        return inventoryItems[_itemId].owner;
    }

    function getItemTimestamp(uint256 _itemId) external view returns (uint256) {
        require(_itemId < totalItems, "Item does not exist");
        return inventoryItems[_itemId].timestamp;
    }

    function hasManagerVoted(uint256 _itemId, address _manager) external view returns (bool) {
        require(_itemId < totalItems, "Item does not exist");
        return hasVoted[_itemId][_manager];
    }

    function authorizeManager(address _manager) external onlyAuthorized {
        authorizedManagers[_manager] = true;
        emit ManagerAuthorized(_manager);
    }

    function revokeManager(address _manager) external onlyAuthorized {
        require(_manager != msg.sender, "Cannot revoke self");
        authorizedManagers[_manager] = false;
        emit ManagerRevoked(_manager);
    }

    function isAuthorizedManager(address _manager) external view returns (bool) {
        return authorizedManagers[_manager];
    }

    // Emergency function to reveal item details (only by owner)
    function revealItem(uint256 _itemId) external {
        require(_itemId < totalItems, "Item does not exist");
        require(inventoryItems[_itemId].owner == msg.sender || authorizedManagers[msg.sender], "Not authorized");

        inventoryItems[_itemId].isRevealed = true;
    }

    // Function to get encrypted quantities (for testing FHE functionality)
    function getEncryptedQuantity(uint256 _itemId) external view onlyAuthorized returns (euint32, euint32) {
        require(_itemId < totalItems, "Item does not exist");
        InventoryItem storage item = inventoryItems[_itemId];
        return (item.quantity, item.minThreshold);
    }

    // Batch operation for inventory audit
    function auditInventory(uint256[] calldata _itemIds) external view onlyAuthorized returns (
        string[] memory itemNames,
        uint256[] memory quantities,
        bool[] memory activeStatuses
    ) {
        require(_itemIds.length > 0, "No items to audit");

        itemNames = new string[](_itemIds.length);
        quantities = new uint256[](_itemIds.length);
        activeStatuses = new bool[](_itemIds.length);

        for (uint256 i = 0; i < _itemIds.length; i++) {
            require(_itemIds[i] < totalItems, "Item does not exist");

            InventoryItem storage item = inventoryItems[_itemIds[i]];
            itemNames[i] = item.itemName;
            // Note: In production, use async decryption via requestDecryption
            quantities[i] = 0; // Would be async decrypted value
            activeStatuses[i] = false; // Would be async decrypted value
        }

        return (itemNames, quantities, activeStatuses);
    }
}