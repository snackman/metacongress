// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Minimal interface for the deployed SemaphoreVerifier at
///         0x4DeC9E3784EcC1eE002001BfE91deEf4A48931f8 on Ethereum mainnet & Sepolia.
///         Used by V3 elections to verify ZK proofs directly (without the full Semaphore contract).
interface ISemaphoreVerifier {
    function verifyProof(
        uint256 merkleTreeDepth,
        uint256 merkleTreeRoot,
        uint256 nullifier,
        uint256 message,
        uint256 scope,
        uint256[8] calldata points
    ) external view;
}
