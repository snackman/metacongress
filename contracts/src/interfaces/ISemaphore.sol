// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Minimal interface for the Semaphore v4 contract deployed at
///         0x8A1fd199516489B0Fb7153EB5f075cDAC83c693D on Ethereum mainnet & Sepolia.
///         We only vendor the interface — the full verifier lives in the deployed contract.
interface ISemaphore {
    struct SemaphoreProof {
        uint256 merkleTreeDepth;
        uint256 merkleTreeRoot;
        uint256 nullifier;
        uint256 message;
        uint256 scope;
        uint256[8] points;
    }

    function createGroup() external returns (uint256);

    function addMember(uint256 groupId, uint256 identityCommitment) external;

    function validateProof(uint256 groupId, SemaphoreProof calldata proof) external;
}
