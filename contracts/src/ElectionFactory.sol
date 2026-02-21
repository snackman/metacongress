// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./SenateElection.sol";

interface ISenateSafeModule {
    function rotateSenators(
        address nftContract,
        address[2] calldata newSenators,
        address[2] calldata previousSenators
    ) external;
}

contract ElectionFactory is Ownable {
    mapping(address => bool) public whitelisted;
    mapping(address => string) public collectionName;
    mapping(address => uint256) public currentCycle;
    mapping(address => mapping(uint256 => address)) public elections;

    address public senateSafe;
    address public safeModule;
    uint256 public defaultVotingDuration = 7 days;

    // Track previous winners for senator rotation
    mapping(address => address[2]) public currentSenators;

    address[] public whitelistedCollections;

    event CollectionWhitelisted(address indexed nftContract, string name);
    event CollectionRemoved(address indexed nftContract);
    event ElectionCreated(address indexed nftContract, uint256 cycle, address election);
    event SenateSafeSet(address safe);
    event SafeModuleSet(address module);
    event VotingDurationUpdated(uint256 newDuration);

    error NotWhitelisted();
    error AlreadyWhitelisted();
    error ActiveElectionExists();
    error OnlyElection();
    error ZeroAddress();

    constructor() Ownable(msg.sender) {}

    function whitelistCollection(address nftContract, string calldata name) external onlyOwner {
        if (nftContract == address(0)) revert ZeroAddress();
        if (whitelisted[nftContract]) revert AlreadyWhitelisted();

        whitelisted[nftContract] = true;
        collectionName[nftContract] = name;
        whitelistedCollections.push(nftContract);

        emit CollectionWhitelisted(nftContract, name);
    }

    function removeCollection(address nftContract) external onlyOwner {
        if (!whitelisted[nftContract]) revert NotWhitelisted();

        whitelisted[nftContract] = false;
        delete collectionName[nftContract];

        // Remove from array
        for (uint256 i = 0; i < whitelistedCollections.length; i++) {
            if (whitelistedCollections[i] == nftContract) {
                whitelistedCollections[i] = whitelistedCollections[whitelistedCollections.length - 1];
                whitelistedCollections.pop();
                break;
            }
        }

        emit CollectionRemoved(nftContract);
    }

    function createElection(address nftContract) external returns (address) {
        if (!whitelisted[nftContract]) revert NotWhitelisted();

        uint256 cycleNum = currentCycle[nftContract];

        // Check if there's an active (non-finalized) election
        if (cycleNum > 0) {
            address prev = elections[nftContract][cycleNum - 1];
            if (prev != address(0)) {
                SenateElection prevElection = SenateElection(prev);
                if (prevElection.phase() != SenateElection.ElectionPhase.Finalized) {
                    revert ActiveElectionExists();
                }
            }
        }

        // Deploy new election using CREATE2 for deterministic address
        bytes32 salt = keccak256(abi.encodePacked(nftContract, cycleNum));
        SenateElection election = new SenateElection{salt: salt}(
            nftContract,
            cycleNum,
            address(this),
            defaultVotingDuration
        );

        elections[nftContract][cycleNum] = address(election);
        currentCycle[nftContract] = cycleNum + 1;

        emit ElectionCreated(nftContract, cycleNum, address(election));
        return address(election);
    }

    function onElectionFinalized(address nftContract, address[2] calldata newWinners) external {
        // Verify caller is a valid election for this collection
        uint256 cycleNum = currentCycle[nftContract];
        if (cycleNum == 0) revert OnlyElection();

        address expected = elections[nftContract][cycleNum - 1];
        if (msg.sender != expected) revert OnlyElection();

        address[2] memory previousSenators = currentSenators[nftContract];
        currentSenators[nftContract] = newWinners;

        // Rotate senators on Safe if module is set
        if (safeModule != address(0)) {
            ISenateSafeModule(safeModule).rotateSenators(nftContract, newWinners, previousSenators);
        }
    }

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
