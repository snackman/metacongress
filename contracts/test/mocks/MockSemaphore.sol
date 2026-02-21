// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../../src/interfaces/ISemaphore.sol";

/// @notice Mock Semaphore for unit tests — skips ZK verification,
///         just tracks nullifiers for double-vote prevention.
contract MockSemaphore is ISemaphore {
    uint256 private _nextGroupId;

    // groupId => list of identity commitments
    mapping(uint256 => uint256[]) public groupMembers;

    // groupId => nullifier => used
    mapping(uint256 => mapping(uint256 => bool)) public usedNullifiers;

    error DuplicateNullifier();

    function createGroup() external override returns (uint256) {
        uint256 id = _nextGroupId++;
        return id;
    }

    function addMember(uint256 groupId, uint256 identityCommitment) external override {
        groupMembers[groupId].push(identityCommitment);
    }

    function validateProof(uint256 groupId, SemaphoreProof calldata proof) external override {
        // Skip actual ZK verification — just check nullifier hasn't been used
        if (usedNullifiers[groupId][proof.nullifier]) revert DuplicateNullifier();
        usedNullifiers[groupId][proof.nullifier] = true;
    }

    function getGroupMembers(uint256 groupId) external view returns (uint256[] memory) {
        return groupMembers[groupId];
    }
}
