// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "./interfaces/ISemaphore.sol";
import "./interfaces/ISemaphoreVerifier.sol";

interface IElectionFactoryAllocation {
    function onSenatorsChanged(
        address nftContract,
        address[2] calldata newSenators,
        address[2] calldata previousSenators
    ) external;
}

interface ICryptoPunksAllocation {
    function punkIndexToAddress(uint256 punkIndex) external view returns (address);
}

/// @title SenateAllocation — Ongoing anonymous vote allocation for senator selection
/// @notice Replaces time-bounded elections with always-on vote allocation.
///         The top 2 candidates by voteCount are the current senators at any moment.
///         Voters can reallocate (change) their vote at any time.
contract SenateAllocation {
    struct Candidate {
        address wallet;
        uint256 nftTokenId;
        string name;
        string platform;
        string profileImageUri;
        uint256 voteCount;
        bool registered; // kept for ABI compat with CandidateCard
    }

    // ── Immutables ──
    address public immutable nftContract;
    address public immutable factory;
    bool public immutable isCryptoPunks;
    ISemaphoreVerifier public immutable verifier;

    // ── State ──
    uint256 public eligibilityRoot;
    uint256 public totalVotes;

    Candidate[] public candidates;
    mapping(address => uint256) public candidateIndex;
    mapping(address => bool) public isCandidate;

    // Vote reallocation: nullifier → (candidateIndex + 1).
    // 0 means not voted. We add 1 because candidate index 0 is valid.
    mapping(uint256 => uint256) public nullifierToCandidate;

    address[2] public currentSenators;

    // ── Constants ──
    uint256 private constant MAX_NAME_LENGTH = 64;
    uint256 private constant MAX_PLATFORM_LENGTH = 1024;
    uint256 private constant MAX_COMMENT_LENGTH = 280;

    // ── Events ──
    event CandidacyDeclared(address indexed candidate, uint256 tokenId, string name, string platform);
    event PlatformUpdated(address indexed candidate, string newPlatform);
    event VoteAllocated(uint256 indexed nullifier, uint256 candidateIndex, string comment);
    event VoteReallocated(uint256 indexed nullifier, uint256 oldCandidateIndex, uint256 newCandidateIndex, string comment);
    event EligibilityRootUpdated(uint256 newRoot);
    event SenatorsChanged(address[2] newSenators);

    // ── Errors ──
    error NotTokenOwner();
    error AlreadyCandidate();
    error NotCandidate();
    error NameTooLong();
    error PlatformTooLong();
    error CommentTooLong();
    error InvalidCandidateIndex();
    error InvalidScope();
    error InvalidRoot();
    error NoEligibilityRoot();
    error ZeroRoot();
    error EmptyName();
    error OnlyFactory();
    error SameCandidate();

    constructor(
        address _nftContract,
        address _factory,
        bool _isCryptoPunks,
        ISemaphoreVerifier _verifier
    ) {
        nftContract = _nftContract;
        factory = _factory;
        isCryptoPunks = _isCryptoPunks;
        verifier = _verifier;
    }

    // ══════════════════════════════════════
    //  Candidacy — always open
    // ══════════════════════════════════════

    function declareCandidacy(
        uint256 tokenId,
        string calldata name,
        string calldata platform
    ) external {
        if (_ownerOf(tokenId) != msg.sender) revert NotTokenOwner();
        if (isCandidate[msg.sender]) revert AlreadyCandidate();
        if (bytes(name).length == 0) revert EmptyName();
        if (bytes(name).length > MAX_NAME_LENGTH) revert NameTooLong();
        if (bytes(platform).length > MAX_PLATFORM_LENGTH) revert PlatformTooLong();

        uint256 idx = candidates.length;
        candidates.push(Candidate({
            wallet: msg.sender,
            nftTokenId: tokenId,
            name: name,
            platform: platform,
            profileImageUri: "",
            voteCount: 0,
            registered: true
        }));

        candidateIndex[msg.sender] = idx;
        isCandidate[msg.sender] = true;

        emit CandidacyDeclared(msg.sender, tokenId, name, platform);
    }

    function updatePlatform(string calldata newPlatform) external {
        if (!isCandidate[msg.sender]) revert NotCandidate();
        if (bytes(newPlatform).length > MAX_PLATFORM_LENGTH) revert PlatformTooLong();

        candidates[candidateIndex[msg.sender]].platform = newPlatform;
        emit PlatformUpdated(msg.sender, newPlatform);
    }

    // ══════════════════════════════════════
    //  Eligibility Root — factory updates as new commitments arrive
    // ══════════════════════════════════════

    function updateEligibilityRoot(uint256 newRoot) external {
        if (msg.sender != factory) revert OnlyFactory();
        if (newRoot == 0) revert ZeroRoot();

        eligibilityRoot = newRoot;
        emit EligibilityRootUpdated(newRoot);
    }

    // ══════════════════════════════════════
    //  Vote Allocation — anonymous, reallocation supported
    // ══════════════════════════════════════

    function allocateVote(
        ISemaphore.SemaphoreProof calldata proof,
        string calldata comment
    ) external {
        if (eligibilityRoot == 0) revert NoEligibilityRoot();
        if (proof.merkleTreeRoot != eligibilityRoot) revert InvalidRoot();
        if (proof.scope != uint256(uint160(address(this)))) revert InvalidScope();
        if (proof.message >= candidates.length) revert InvalidCandidateIndex();
        if (bytes(comment).length > MAX_COMMENT_LENGTH) revert CommentTooLong();

        // Verify the ZK proof
        verifier.verifyProof(
            proof.merkleTreeDepth,
            proof.merkleTreeRoot,
            proof.nullifier,
            proof.message,
            proof.scope,
            proof.points
        );

        uint256 existing = nullifierToCandidate[proof.nullifier];

        if (existing != 0) {
            // Reallocation: existing stores candidateIndex + 1
            uint256 oldIdx = existing - 1;
            if (oldIdx == proof.message) revert SameCandidate();

            candidates[oldIdx].voteCount--;
            candidates[proof.message].voteCount++;
            nullifierToCandidate[proof.nullifier] = proof.message + 1;

            emit VoteReallocated(proof.nullifier, oldIdx, proof.message, comment);
        } else {
            // First-time vote
            candidates[proof.message].voteCount++;
            totalVotes++;
            nullifierToCandidate[proof.nullifier] = proof.message + 1;

            emit VoteAllocated(proof.nullifier, proof.message, comment);
        }

        _updateSenators();
    }

    // ══════════════════════════════════════
    //  Views
    // ══════════════════════════════════════

    function getCandidates() external view returns (Candidate[] memory) {
        return candidates;
    }

    function getCandidateCount() external view returns (uint256) {
        return candidates.length;
    }

    function getCurrentSenators() external view returns (address[2] memory) {
        return currentSenators;
    }

    // ══════════════════════════════════════
    //  Internal
    // ══════════════════════════════════════

    /// @dev Recompute top 2 candidates and notify factory if senators changed.
    function _updateSenators() internal {
        uint256 len = candidates.length;
        if (len == 0) return;

        uint256 firstIdx = 0;
        uint256 secondIdx = 0;
        uint256 firstVotes = 0;
        uint256 secondVotes = 0;

        for (uint256 i = 0; i < len; i++) {
            uint256 v = candidates[i].voteCount;
            if (v > firstVotes) {
                secondIdx = firstIdx;
                secondVotes = firstVotes;
                firstIdx = i;
                firstVotes = v;
            } else if (v > secondVotes) {
                secondIdx = i;
                secondVotes = v;
            }
        }

        address[2] memory newSenators;
        if (len == 1) {
            newSenators = [candidates[0].wallet, address(0)];
        } else {
            if (firstIdx == secondIdx) {
                secondIdx = firstIdx == 0 ? 1 : 0;
            }
            newSenators = [candidates[firstIdx].wallet, candidates[secondIdx].wallet];
        }

        // Only notify factory if senators actually changed
        if (newSenators[0] != currentSenators[0] || newSenators[1] != currentSenators[1]) {
            address[2] memory previousSenators = currentSenators;
            currentSenators = newSenators;
            emit SenatorsChanged(newSenators);

            IElectionFactoryAllocation(factory).onSenatorsChanged(
                nftContract,
                newSenators,
                previousSenators
            );
        }
    }

    function _ownerOf(uint256 tokenId) internal view returns (address) {
        if (isCryptoPunks) {
            return ICryptoPunksAllocation(nftContract).punkIndexToAddress(tokenId);
        }
        return IERC721(nftContract).ownerOf(tokenId);
    }
}
