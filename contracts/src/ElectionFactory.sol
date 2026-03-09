// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "./SenateAllocation.sol";
import "./SenateElectionV3.sol";
import "./interfaces/ISemaphore.sol";
import "./interfaces/ISemaphoreVerifier.sol";

interface ICryptoPunks {
    function punkIndexToAddress(uint256) external view returns (address);
}

interface ISenateSafeModule {
    function rotateSenators(
        address nftContract,
        address[2] calldata newSenators,
        address[2] calldata previousSenators
    ) external;
}

contract ElectionFactory is Initializable, OwnableUpgradeable, UUPSUpgradeable {
    // ── Collections ──
    mapping(address => bool) public whitelisted;
    mapping(address => bool) public isCryptoPunks;
    mapping(address => string) public collectionName;
    mapping(address => uint256) public currentCycle;
    mapping(address => mapping(uint256 => address)) public elections;
    mapping(address => address[2]) public currentSenators;
    address[] public whitelistedCollections;

    // ── Config ──
    address public senateSafe;
    address public safeModule;
    uint256 public defaultVotingDuration;
    ISemaphore public semaphore;
    uint256 public defaultRegistrationDuration;

    // ── V3 Config ──
    ISemaphoreVerifier public semaphoreVerifier;
    uint256 public defaultCommitmentCollectionDuration;

    // ── Allocation Contracts ──
    mapping(address => address) public allocationContracts; // nftContract -> SenateAllocation

    // ── Nominations ──
    struct Nomination {
        address nftContract;
        string name;
        address nominator;
        string reason;
        uint256 timestamp;
    }

    Nomination[] public nominations;
    mapping(address => bool) public nominated;

    // ── Signaling Proposals ──
    struct Proposal {
        address proposer;
        string title;
        string description;
        uint256 timestamp;
        uint256 yesVotes;
        uint256 noVotes;
        bool executed;
        address nftContract;
        uint256 tokenId;
    }

    Proposal[] public proposals;
    mapping(uint256 => mapping(address => bool)) public hasVotedOnProposal;

    // ── Delegation Tokens ──
    struct DelegationToken {
        address tokenAddress;
        string name;
        string symbol;
    }

    DelegationToken[] public delegationTokens;
    mapping(address => bool) public approvedToken;

    // ── Token Nominations ──
    struct TokenNomination {
        address tokenAddress;
        string name;
        string symbol;
        address nominator;
        string reason;
        uint256 timestamp;
        bool forRemoval;
    }

    TokenNomination[] public tokenNominations;
    mapping(address => bool) public nominatedToken;

    // ── Events ──
    event CollectionWhitelisted(address indexed nftContract, string name);
    event CollectionRemoved(address indexed nftContract);
    event ElectionCreated(address indexed nftContract, uint256 cycle, address election);
    event CollectionNominated(address indexed nftContract, string name, address indexed nominator, string reason);
    event SenateSafeSet(address safe);
    event SafeModuleSet(address module);
    event VotingDurationUpdated(uint256 newDuration);
    event ProposalCreated(uint256 indexed proposalId, address indexed proposer, string title);
    event ProposalVoted(uint256 indexed proposalId, address indexed voter, bool support);
    event DelegationTokenAdded(address indexed tokenAddress, string name, string symbol);
    event DelegationTokenRemoved(address indexed tokenAddress);
    event DelegationTokenNominated(address indexed tokenAddress, string name, string symbol, address indexed nominator, string reason, bool forRemoval);
    event ElectionV3Created(address indexed nftContract, uint256 cycle, address election);
    event ElectionVotingOpened(address indexed election, uint256 eligibilityRoot);
    event AllocationCreated(address indexed nftContract, address allocation);
    event AllocationRootUpdated(address indexed nftContract, uint256 newRoot);

    // ── Errors ──
    error NotWhitelisted();
    error AlreadyWhitelisted();
    error AlreadyNominated();
    error ActiveElectionExists();
    error OnlyElection();
    error OnlySenator();
    error ZeroAddress();
    error EmptyName();
    error EmptyTitle();
    error ReasonTooLong();
    error DescriptionTooLong();
    error AlreadyVotedOnProposal();
    error InvalidProposal();
    error TokenAlreadyApproved();
    error TokenNotApproved();
    error NotCollectionMember();
    error TokenAlreadyNominated();
    error VerifierNotSet();
    error AllocationAlreadyExists();
    error OnlyAllocation();

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address _owner) public initializer {
        __Ownable_init(_owner);
        defaultVotingDuration = 7 days;
        defaultRegistrationDuration = 3 days;
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    // ══════════════════════════════════════
    //  Collections
    // ══════════════════════════════════════

    function whitelistCollection(address nftContract, string calldata name, bool _isCryptoPunks) external onlyOwner {
        if (nftContract == address(0)) revert ZeroAddress();
        if (whitelisted[nftContract]) revert AlreadyWhitelisted();

        whitelisted[nftContract] = true;
        isCryptoPunks[nftContract] = _isCryptoPunks;
        collectionName[nftContract] = name;
        whitelistedCollections.push(nftContract);

        emit CollectionWhitelisted(nftContract, name);
    }

    function removeCollection(address nftContract) external onlyOwner {
        if (!whitelisted[nftContract]) revert NotWhitelisted();

        whitelisted[nftContract] = false;
        delete collectionName[nftContract];

        for (uint256 i = 0; i < whitelistedCollections.length; i++) {
            if (whitelistedCollections[i] == nftContract) {
                whitelistedCollections[i] = whitelistedCollections[whitelistedCollections.length - 1];
                whitelistedCollections.pop();
                break;
            }
        }

        emit CollectionRemoved(nftContract);
    }

    // ══════════════════════════════════════
    //  Nominations
    // ══════════════════════════════════════

    function nominateCollection(
        address nftContract,
        string calldata name,
        string calldata reason,
        address memberCollection,
        uint256 memberTokenId
    ) external {
        if (nftContract == address(0)) revert ZeroAddress();
        if (bytes(name).length == 0) revert EmptyName();
        if (bytes(reason).length > 512) revert ReasonTooLong();
        if (whitelisted[nftContract]) revert AlreadyWhitelisted();
        if (nominated[nftContract]) revert AlreadyNominated();
        if (!whitelisted[memberCollection]) revert NotWhitelisted();

        // Verify caller owns a token in an existing whitelisted collection
        if (isCryptoPunks[memberCollection]) {
            if (ICryptoPunks(memberCollection).punkIndexToAddress(memberTokenId) != msg.sender) revert NotCollectionMember();
        } else {
            if (IERC721(memberCollection).ownerOf(memberTokenId) != msg.sender) revert NotCollectionMember();
        }

        nominated[nftContract] = true;
        nominations.push(Nomination({
            nftContract: nftContract,
            name: name,
            nominator: msg.sender,
            reason: reason,
            timestamp: block.timestamp
        }));

        emit CollectionNominated(nftContract, name, msg.sender, reason);
    }

    function getNominations() external view returns (Nomination[] memory) {
        return nominations;
    }

    function getNominationCount() external view returns (uint256) {
        return nominations.length;
    }

    // ══════════════════════════════════════
    //  Elections
    // ══════════════════════════════════════

    // createElection (V2) removed — use createAllocation for new communities

    function onElectionFinalized(address nftContract, address[2] calldata newWinners) external {
        uint256 cycleNum = currentCycle[nftContract];
        if (cycleNum == 0) revert OnlyElection();

        address expected = elections[nftContract][cycleNum - 1];
        if (msg.sender != expected) revert OnlyElection();

        address[2] memory previousSenators = currentSenators[nftContract];
        currentSenators[nftContract] = newWinners;

        if (safeModule != address(0)) {
            ISenateSafeModule(safeModule).rotateSenators(nftContract, newWinners, previousSenators);
        }
    }

    // ══════════════════════════════════════
    //  Signaling Proposals
    // ══════════════════════════════════════

    function createProposal(
        string calldata title,
        string calldata description,
        address nftContract,
        uint256 tokenId
    ) external returns (uint256) {
        if (bytes(title).length == 0) revert EmptyTitle();
        if (bytes(description).length > 4096) revert DescriptionTooLong();
        if (!whitelisted[nftContract]) revert NotWhitelisted();

        // Verify caller owns a token in a whitelisted collection
        if (isCryptoPunks[nftContract]) {
            if (ICryptoPunks(nftContract).punkIndexToAddress(tokenId) != msg.sender) revert NotCollectionMember();
        } else {
            if (IERC721(nftContract).ownerOf(tokenId) != msg.sender) revert NotCollectionMember();
        }

        uint256 proposalId = proposals.length;
        proposals.push(Proposal({
            proposer: msg.sender,
            title: title,
            description: description,
            timestamp: block.timestamp,
            yesVotes: 0,
            noVotes: 0,
            executed: false,
            nftContract: nftContract,
            tokenId: tokenId
        }));

        emit ProposalCreated(proposalId, msg.sender, title);
        return proposalId;
    }

    function voteOnProposal(uint256 proposalId, bool support) external {
        if (proposalId >= proposals.length) revert InvalidProposal();
        if (hasVotedOnProposal[proposalId][msg.sender]) revert AlreadyVotedOnProposal();

        // Only senators (Safe owners) can vote
        if (senateSafe == address(0)) revert OnlySenator();
        (bool success, bytes memory result) = senateSafe.staticcall(
            abi.encodeWithSignature("isOwner(address)", msg.sender)
        );
        if (!success || !abi.decode(result, (bool))) revert OnlySenator();

        hasVotedOnProposal[proposalId][msg.sender] = true;

        if (support) {
            proposals[proposalId].yesVotes++;
        } else {
            proposals[proposalId].noVotes++;
        }

        emit ProposalVoted(proposalId, msg.sender, support);
    }

    function getProposals() external view returns (Proposal[] memory) {
        return proposals;
    }

    function getProposalCount() external view returns (uint256) {
        return proposals.length;
    }

    // ══════════════════════════════════════
    //  Delegation Tokens
    // ══════════════════════════════════════

    function addDelegationToken(address tokenAddress, string calldata name, string calldata symbol) external {
        if (msg.sender != senateSafe) revert OnlySenator();
        if (tokenAddress == address(0)) revert ZeroAddress();
        if (approvedToken[tokenAddress]) revert TokenAlreadyApproved();

        approvedToken[tokenAddress] = true;
        delegationTokens.push(DelegationToken({
            tokenAddress: tokenAddress,
            name: name,
            symbol: symbol
        }));

        emit DelegationTokenAdded(tokenAddress, name, symbol);
    }

    function removeDelegationToken(address tokenAddress) external {
        if (msg.sender != senateSafe) revert OnlySenator();
        if (!approvedToken[tokenAddress]) revert TokenNotApproved();

        approvedToken[tokenAddress] = false;

        for (uint256 i = 0; i < delegationTokens.length; i++) {
            if (delegationTokens[i].tokenAddress == tokenAddress) {
                delegationTokens[i] = delegationTokens[delegationTokens.length - 1];
                delegationTokens.pop();
                break;
            }
        }

        emit DelegationTokenRemoved(tokenAddress);
    }

    function getDelegationTokens() external view returns (DelegationToken[] memory) {
        return delegationTokens;
    }

    function getDelegationTokenCount() external view returns (uint256) {
        return delegationTokens.length;
    }

    // ══════════════════════════════════════
    //  Token Nominations
    // ══════════════════════════════════════

    function nominateDelegationToken(
        address tokenAddress,
        string calldata name,
        string calldata symbol,
        string calldata reason,
        bool forRemoval,
        address memberCollection,
        uint256 memberTokenId
    ) external {
        if (tokenAddress == address(0)) revert ZeroAddress();
        if (bytes(name).length == 0) revert EmptyName();
        if (bytes(reason).length > 512) revert ReasonTooLong();
        if (nominatedToken[tokenAddress]) revert TokenAlreadyNominated();
        if (!whitelisted[memberCollection]) revert NotWhitelisted();

        if (forRemoval) {
            if (!approvedToken[tokenAddress]) revert TokenNotApproved();
        } else {
            if (approvedToken[tokenAddress]) revert TokenAlreadyApproved();
        }

        // Verify caller owns a token in an existing whitelisted collection
        if (isCryptoPunks[memberCollection]) {
            if (ICryptoPunks(memberCollection).punkIndexToAddress(memberTokenId) != msg.sender) revert NotCollectionMember();
        } else {
            if (IERC721(memberCollection).ownerOf(memberTokenId) != msg.sender) revert NotCollectionMember();
        }

        nominatedToken[tokenAddress] = true;
        tokenNominations.push(TokenNomination({
            tokenAddress: tokenAddress,
            name: name,
            symbol: symbol,
            nominator: msg.sender,
            reason: reason,
            timestamp: block.timestamp,
            forRemoval: forRemoval
        }));

        emit DelegationTokenNominated(tokenAddress, name, symbol, msg.sender, reason, forRemoval);
    }

    function getTokenNominations() external view returns (TokenNomination[] memory) {
        return tokenNominations;
    }

    function getTokenNominationCount() external view returns (uint256) {
        return tokenNominations.length;
    }

    // ══════════════════════════════════════
    //  V3 Elections
    // ══════════════════════════════════════

    // createElectionV3 removed — use createAllocation for new communities

    function openElectionVoting(address election, uint256 _eligibilityRoot) external onlyOwner {
        SenateElectionV3(election).openVoting(_eligibilityRoot);
        emit ElectionVotingOpened(election, _eligibilityRoot);
    }

    // _isV3Election removed — no longer needed without createElectionV3

    // ══════════════════════════════════════
    //  Allocations — ongoing vote allocation
    // ══════════════════════════════════════

    function createAllocation(address nftContract) external onlyOwner returns (address) {
        if (!whitelisted[nftContract]) revert NotWhitelisted();
        if (address(semaphoreVerifier) == address(0)) revert VerifierNotSet();
        if (allocationContracts[nftContract] != address(0)) revert AllocationAlreadyExists();

        bytes32 salt = keccak256(abi.encodePacked(nftContract, "allocation"));
        SenateAllocation allocation = new SenateAllocation{salt: salt}(
            nftContract,
            address(this),
            isCryptoPunks[nftContract],
            semaphoreVerifier
        );

        allocationContracts[nftContract] = address(allocation);
        emit AllocationCreated(nftContract, address(allocation));
        return address(allocation);
    }

    /// @notice Override the allocation contract address for a collection (for migration/fixes).
    function setAllocation(address nftContract, address allocation) external onlyOwner {
        allocationContracts[nftContract] = allocation;
        emit AllocationCreated(nftContract, allocation);
    }

    function updateAllocationRoot(address nftContract, uint256 newRoot) external onlyOwner {
        address allocation = allocationContracts[nftContract];
        if (allocation == address(0)) revert NotWhitelisted();

        SenateAllocation(allocation).updateEligibilityRoot(newRoot);
        emit AllocationRootUpdated(nftContract, newRoot);
    }

    function onSenatorsChanged(
        address nftContract,
        address[2] calldata newSenators,
        address[2] calldata previousSenators
    ) external {
        if (msg.sender != allocationContracts[nftContract]) revert OnlyAllocation();

        currentSenators[nftContract] = newSenators;

        if (safeModule != address(0)) {
            ISenateSafeModule(safeModule).rotateSenators(nftContract, newSenators, previousSenators);
        }
    }

    // ══════════════════════════════════════
    //  Config
    // ══════════════════════════════════════

    function setSenateSafe(address _safe) external onlyOwner {
        if (_safe == address(0)) revert ZeroAddress();
        senateSafe = _safe;
        emit SenateSafeSet(_safe);
    }

    function setSafeModule(address _module) external onlyOwner {
        if (_module == address(0)) revert ZeroAddress();
        safeModule = _module;
        emit SafeModuleSet(_module);
    }

    function setVotingDuration(uint256 _duration) external onlyOwner {
        defaultVotingDuration = _duration;
        emit VotingDurationUpdated(_duration);
    }

    function setSemaphore(ISemaphore _semaphore) external onlyOwner {
        semaphore = _semaphore;
    }

    function setRegistrationDuration(uint256 _duration) external onlyOwner {
        defaultRegistrationDuration = _duration;
    }

    function setSemaphoreVerifier(ISemaphoreVerifier _verifier) external onlyOwner {
        semaphoreVerifier = _verifier;
    }

    function setCommitmentCollectionDuration(uint256 _duration) external onlyOwner {
        defaultCommitmentCollectionDuration = _duration;
    }

    // ══════════════════════════════════════
    //  Views
    // ══════════════════════════════════════

    function getElection(address nftContract, uint256 cycleNum) external view returns (address) {
        return elections[nftContract][cycleNum];
    }

    function getWhitelistedCollections() external view returns (address[] memory) {
        return whitelistedCollections;
    }

    function getWhitelistedCollectionCount() external view returns (uint256) {
        return whitelistedCollections.length;
    }

    function getCurrentSenators(address nftContract) external view returns (address[2] memory) {
        return currentSenators[nftContract];
    }
}
