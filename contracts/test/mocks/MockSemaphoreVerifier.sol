// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../../src/interfaces/ISemaphoreVerifier.sol";

/// @notice Mock SemaphoreVerifier for unit tests — always succeeds (no ZK verification).
contract MockSemaphoreVerifier is ISemaphoreVerifier {
    function verifyProof(
        uint256,
        uint256,
        uint256,
        uint256,
        uint256,
        uint256[8] calldata
    ) external pure override {
        // Always succeeds — no actual ZK verification in tests
    }
}
