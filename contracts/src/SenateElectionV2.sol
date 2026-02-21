// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "./interfaces/ISemaphore.sol";

interface IElectionFactoryV2 {
    function onElectionFinalized(address nftContract, address[2] calldata winners) external;
}

interface ICryptoPunksV2 {
    function punkIndexToAddress(uint256 punkIndex) external view returns (address);
}

contract SenateElectionV2 {
    enum ElectionPhase { Registration, VoterRegistration, Voting, Finalized }

    struct Candidate {
        address wallet;
        uint256 nftTokenId;
        string name;
        string platform;
        string profileImageUri;
        uint256 voteCount;
        bool registered;
    }

    address public immutable nftContract;
    uint256 public immutable cycle;
    address public immutable factory;
    uint256 public immutable votingDuration;
    uint256 public immutable registrationDuration;
    bool public immutable isCryptoPunks;
    ISemaphore public immutable semaphore;

    ElectionPhase public phase;
    uint256 public votingEndTime;
    uint256 public voterRegistrationEndTime;
    uint256 public groupId;
    uint256 public totalVotes;

    Candidate[] public candidates;
    mapping(address => uint256) public candidateIndex;
    mapping(address => bool) public isCandidate;
    mapping(uint256 => bool) public hasRegistered; // per tokenId
    address[2] public winners;

    uint256 private constant MAX_NAME_LENGTH = 64;
    uint256 private constant MAX_PLATFORM_LENGTH = 1024;
    uint256 private constant MAX_COMMENT_LENGTH = 280;
    uint256 private constant MIN_CANDIDATES = 3;

    event CandidacyDeclared(address indexed candidate, uint256 tokenId, string name, string platform);
    event PlatformUpdated(address indexed candidate, string newPlatform);
    event VoterRegistrationOpened(uint256 endTime, uint256 groupId);
    event VoterRegistered(uint256 tokenId);
    event VotingOpened(uint256 endTime);
    event AnonymousVoteCast(uint256 indexed nullifier, uint256 candidateIndex, string comment);
    event ElectionFinalized(address[2] winners);

    error NotTokenOwner();
    error AlreadyCandidate();
    error NotCandidate();
    error NameTooLong();
    error PlatformTooLong();
    error CommentTooLong();
    error WrongPhase(ElectionPhase expected, ElectionPhase actual);
    error AlreadyRegistered();
    error InvalidCandidateIndex();
    error InvalidScope();
    error VotingNotEnded();
    error RegistrationNotEnded();
    error EmptyName();

    modifier onlyPhase(ElectionPhase expected) {
        if (phase != expected) revert WrongPhase(expected, phase);
        _;
    }

    constructor(
        address _nftContract,
        uint256 _cycle,
        address _factory,
        uint256 _votingDuration,
        bool _isCryptoPunks,
        ISemaphore _semaphore,
        uint256 _registrationDuration
    ) {
        nftContract = _nftContract;
        cycle = _cycle;
        factory = _factory;
        votingDuration = _votingDuration;
        isCryptoPunks = _isCryptoPunks;
        semaphore = _semaphore;
        registrationDuration = _registrationDuration;
        phase = ElectionPhase.Registration;
        groupId = _semaphore.createGroup();
    }

    // ══════════════════════════════════════
    //  Registration Phase — Candidates declare
    // ══════════════════════════════════════

    function declareCandidacy(
        uint256 tokenId,
        string calldata name,
        string calldata platform
    ) external onlyPhase(ElectionPhase.Registration) {
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

        if (candidates.length >= MIN_CANDIDATES) {
            _openVoterRegistration();
        }
    }

    function updatePlatform(string calldata newPlatform)
        external
        onlyPhase(ElectionPhase.Registration)
    {
        if (!isCandidate[msg.sender]) revert NotCandidate();
        if (bytes(newPlatform).length > MAX_PLATFORM_LENGTH) revert PlatformTooLong();

        candidates[candidateIndex[msg.sender]].platform = newPlatform;
        emit PlatformUpdated(msg.sender, newPlatform);
    }

    // ══════════════════════════════════════
    //  Voter Registration Phase — NFT holders register identity commitments
    // ══════════════════════════════════════

    function registerVoter(uint256 tokenId, uint256 identityCommitment)
        external
        onlyPhase(ElectionPhase.VoterRegistration)
    {
        if (_ownerOf(tokenId) != msg.sender) revert NotTokenOwner();
        if (hasRegistered[tokenId]) revert AlreadyRegistered();

        hasRegistered[tokenId] = true;
        semaphore.addMember(groupId, identityCommitment);

        emit VoterRegistered(tokenId);
    }

    function openVoting() external onlyPhase(ElectionPhase.VoterRegistration) {
        if (block.timestamp < voterRegistrationEndTime) revert RegistrationNotEnded();

        phase = ElectionPhase.Voting;
        votingEndTime = block.timestamp + votingDuration;
        emit VotingOpened(votingEndTime);
    }

    // ══════════════════════════════════════
    //  Voting Phase — Anonymous ZK votes (ANYONE can submit to enable relayers)
    // ══════════════════════════════════════

    function castAnonymousVote(
        ISemaphore.SemaphoreProof calldata proof,
        string calldata comment
    ) external onlyPhase(ElectionPhase.Voting) {
        if (proof.scope != uint256(uint160(address(this)))) revert InvalidScope();
        if (proof.message >= candidates.length) revert InvalidCandidateIndex();
        if (bytes(comment).length > MAX_COMMENT_LENGTH) revert CommentTooLong();

        // Validates the ZK proof and reverts on double-vote (nullifier collision)
        semaphore.validateProof(groupId, proof);

        candidates[proof.message].voteCount++;
        totalVotes++;

        emit AnonymousVoteCast(proof.nullifier, proof.message, comment);
    }

    // ══════════════════════════════════════
    //  Finalization
    // ══════════════════════════════════════

    function finalizeElection() external onlyPhase(ElectionPhase.Voting) {
        if (block.timestamp < votingEndTime) revert VotingNotEnded();

        // Find top 2 candidates. Tie-break: earlier declaration (lower index) wins.
        uint256 first = 0;
        uint256 second = 0;
        uint256 firstVotes = 0;
        uint256 secondVotes = 0;

        for (uint256 i = 0; i < candidates.length; i++) {
            uint256 v = candidates[i].voteCount;
            if (v > firstVotes) {
                second = first;
                secondVotes = firstVotes;
                first = i;
                firstVotes = v;
            } else if (v > secondVotes) {
                second = i;
                secondVotes = v;
            }
        }

        // Handle edge case: if only 1 or 2 candidates had votes
        if (candidates.length == 1) {
            winners = [candidates[0].wallet, address(0)];
        } else {
            // Ensure first != second
            if (first == second) {
                second = first == 0 ? 1 : 0;
            }
            winners = [candidates[first].wallet, candidates[second].wallet];
        }

        phase = ElectionPhase.Finalized;
        emit ElectionFinalized(winners);

        IElectionFactoryV2(factory).onElectionFinalized(nftContract, winners);
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

    function getWinners() external view returns (address[2] memory) {
        return winners;
    }

    // ══════════════════════════════════════
    //  Internal
    // ══════════════════════════════════════

    function _ownerOf(uint256 tokenId) internal view returns (address) {
        if (isCryptoPunks) {
            return ICryptoPunksV2(nftContract).punkIndexToAddress(tokenId);
        }
        return IERC721(nftContract).ownerOf(tokenId);
    }

    function _openVoterRegistration() internal {
        phase = ElectionPhase.VoterRegistration;
        voterRegistrationEndTime = block.timestamp + registrationDuration;
        emit VoterRegistrationOpened(voterRegistrationEndTime, groupId);
    }
}
