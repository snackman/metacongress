// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IGnosisSafe {
    function getOwners() external view returns (address[] memory);
    function getThreshold() external view returns (uint256);
    function isOwner(address owner) external view returns (bool);

    /// @dev Allows a Module to execute a Safe transaction without any further confirmations.
    function execTransactionFromModule(
        address to,
        uint256 value,
        bytes memory data,
        uint8 operation
    ) external returns (bool success);
}

contract SenateSafeModule {
    address public immutable factory;
    address public immutable safe;

    event SenatorsRotated(address indexed nftContract, address[2] newSenators, address[2] previousSenators);

    error OnlyFactory();
    error SafeExecFailed();

    modifier onlyFactory() {
        if (msg.sender != factory) revert OnlyFactory();
        _;
    }

    constructor(address _factory, address _safe) {
        factory = _factory;
        safe = _safe;
    }

    function rotateSenators(
        address nftContract,
        address[2] calldata newSenators,
        address[2] calldata previousSenators
    ) external onlyFactory {
        // Remove previous senators (if they exist and are owners)
        for (uint256 i = 0; i < 2; i++) {
            if (previousSenators[i] != address(0) && IGnosisSafe(safe).isOwner(previousSenators[i])) {
                _removeOwner(previousSenators[i]);
            }
        }

        // Add new senators
        for (uint256 i = 0; i < 2; i++) {
            if (newSenators[i] != address(0) && !IGnosisSafe(safe).isOwner(newSenators[i])) {
                _addOwner(newSenators[i]);
            }
        }

        // Update threshold to simple majority
        uint256 ownerCount = IGnosisSafe(safe).getOwners().length;
        uint256 newThreshold = (ownerCount / 2) + 1;
        _changeThreshold(newThreshold);

        emit SenatorsRotated(nftContract, newSenators, previousSenators);
    }

    function _addOwner(address owner) internal {
        bytes memory data = abi.encodeWithSignature(
            "addOwnerWithThreshold(address,uint256)",
            owner,
            1 // threshold will be updated after
        );
        bool success = IGnosisSafe(safe).execTransactionFromModule(safe, 0, data, 0);
        if (!success) revert SafeExecFailed();
    }

    function _removeOwner(address owner) internal {
        // To remove an owner, we need the previous owner in the linked list.
        // We find it by iterating the owners array.
        address[] memory owners = IGnosisSafe(safe).getOwners();

        address prevOwner = address(0x1); // SENTINEL_OWNERS
        for (uint256 i = 0; i < owners.length; i++) {
            if (owners[i] == owner) {
                break;
            }
            prevOwner = owners[i];
        }

        bytes memory data = abi.encodeWithSignature(
            "removeOwner(address,address,uint256)",
            prevOwner,
            owner,
            1 // threshold will be updated after
        );
        bool success = IGnosisSafe(safe).execTransactionFromModule(safe, 0, data, 0);
        if (!success) revert SafeExecFailed();
    }

    function _changeThreshold(uint256 threshold) internal {
        bytes memory data = abi.encodeWithSignature(
            "changeThreshold(uint256)",
            threshold
        );
        bool success = IGnosisSafe(safe).execTransactionFromModule(safe, 0, data, 0);
        if (!success) revert SafeExecFailed();
    }
}
