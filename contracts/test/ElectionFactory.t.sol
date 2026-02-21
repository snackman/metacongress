// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/ElectionFactory.sol";
import "../src/SenateElection.sol";
import "../src/SenateElectionV2.sol";
import "../src/SenateElectionV3.sol";
import "../src/interfaces/ISemaphore.sol";
import "../src/interfaces/ISemaphoreVerifier.sol";
import "./mocks/MockSemaphore.sol";
import "./mocks/MockSemaphoreVerifier.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

contract MockNFT is ERC721 {
    uint256 private _nextTokenId;

    constructor() ERC721("MockNFT", "MNFT") {}

    function mint(address to) external returns (uint256) {
        uint256 tokenId = _nextTokenId++;
        _mint(to, tokenId);
        return tokenId;
    }
}

contract MockCryptoPunks {
    mapping(uint256 => address) public punkIndexToAddress;
    uint256 private _nextPunkId;

    function mint(address to) external returns (uint256) {
        uint256 punkId = _nextPunkId++;
        punkIndexToAddress[punkId] = to;
        return punkId;
    }
}

contract ElectionFactoryTest is Test {
    ElectionFactory public factory;
    MockNFT public nft;
    MockNFT public nft2;
    MockSemaphore public mockSemaphore;
    MockSemaphoreVerifier public mockVerifier;

    address public owner = address(this);
    address public alice = makeAddr("alice");
    address public bob = makeAddr("bob");
    address public carol = makeAddr("carol");

    function setUp() public {
        mockSemaphore = new MockSemaphore();
        mockVerifier = new MockSemaphoreVerifier();

        ElectionFactory impl = new ElectionFactory();
        ERC1967Proxy proxy = new ERC1967Proxy(
            address(impl),
            abi.encodeWithSelector(ElectionFactory.initialize.selector, owner)
        );
        factory = ElectionFactory(address(proxy));
        factory.setSemaphore(ISemaphore(address(mockSemaphore)));
        factory.setSemaphoreVerifier(ISemaphoreVerifier(address(mockVerifier)));

        nft = new MockNFT();
        nft2 = new MockNFT();
    }

    function test_whitelistCollection() public {
        factory.whitelistCollection(address(nft), "Bored Apes", false);

        assertTrue(factory.whitelisted(address(nft)));
        assertEq(factory.collectionName(address(nft)), "Bored Apes");
        assertEq(factory.getWhitelistedCollectionCount(), 1);

        address[] memory collections = factory.getWhitelistedCollections();
        assertEq(collections[0], address(nft));
    }

    function test_whitelistCollection_revertNotOwner() public {
        vm.prank(alice);
        vm.expectRevert();
        factory.whitelistCollection(address(nft), "Bored Apes", false);
    }

    function test_whitelistCollection_revertAlreadyWhitelisted() public {
        factory.whitelistCollection(address(nft), "Bored Apes", false);

        vm.expectRevert(ElectionFactory.AlreadyWhitelisted.selector);
        factory.whitelistCollection(address(nft), "Bored Apes", false);
    }

    function test_whitelistCollection_revertZeroAddress() public {
        vm.expectRevert(ElectionFactory.ZeroAddress.selector);
        factory.whitelistCollection(address(0), "Zero", false);
    }

    function test_removeCollection() public {
        factory.whitelistCollection(address(nft), "Bored Apes", false);
        factory.removeCollection(address(nft));

        assertFalse(factory.whitelisted(address(nft)));
        assertEq(factory.getWhitelistedCollectionCount(), 0);
    }

    function test_removeCollection_revertNotWhitelisted() public {
        vm.expectRevert(ElectionFactory.NotWhitelisted.selector);
        factory.removeCollection(address(nft));
    }

    function test_createElection() public {
        factory.whitelistCollection(address(nft), "Bored Apes", false);

        address electionAddr = factory.createElection(address(nft));
        assertTrue(electionAddr != address(0));
        assertEq(factory.currentCycle(address(nft)), 1);
        assertEq(factory.getElection(address(nft), 0), electionAddr);

        SenateElectionV2 election = SenateElectionV2(electionAddr);
        assertEq(address(election.nftContract()), address(nft));
        assertEq(election.cycle(), 0);
    }

    function test_createElection_revertNotWhitelisted() public {
        vm.expectRevert(ElectionFactory.NotWhitelisted.selector);
        factory.createElection(address(nft));
    }

    function test_createElection_revertActiveExists() public {
        factory.whitelistCollection(address(nft), "Bored Apes", false);
        factory.createElection(address(nft));

        vm.expectRevert(ElectionFactory.ActiveElectionExists.selector);
        factory.createElection(address(nft));
    }

    function test_createNewCycleAfterFinalization() public {
        factory.whitelistCollection(address(nft), "Bored Apes", false);

        // Create first election (V2)
        address electionAddr = factory.createElection(address(nft));
        SenateElectionV2 election = SenateElectionV2(electionAddr);

        // Mint NFTs and run full election
        uint256 t1 = nft.mint(alice);
        uint256 t2 = nft.mint(bob);
        uint256 t3 = nft.mint(carol);

        vm.prank(alice);
        election.declareCandidacy(t1, "Alice", "Platform A");
        vm.prank(bob);
        election.declareCandidacy(t2, "Bob", "Platform B");
        vm.prank(carol);
        election.declareCandidacy(t3, "Carol", "Platform C");

        // Register voters
        vm.prank(alice);
        election.registerVoter(t1, 111);
        vm.prank(bob);
        election.registerVoter(t2, 222);
        vm.prank(carol);
        election.registerVoter(t3, 333);

        // Open voting
        vm.warp(election.voterRegistrationEndTime());
        election.openVoting();

        // Cast anonymous votes
        _castVote(election, 0, 1001);
        _castVote(election, 0, 1002);
        _castVote(election, 1, 1003);

        // Finalize
        vm.warp(election.votingEndTime() + 1);
        election.finalizeElection();

        // Should be able to create new election
        address newElectionAddr = factory.createElection(address(nft));
        assertTrue(newElectionAddr != address(0));
        assertTrue(newElectionAddr != electionAddr);
        assertEq(factory.currentCycle(address(nft)), 2);
    }

    function test_multipleCollections() public {
        factory.whitelistCollection(address(nft), "Collection A", false);
        factory.whitelistCollection(address(nft2), "Collection B", false);

        address electionA = factory.createElection(address(nft));
        address electionB = factory.createElection(address(nft2));

        assertTrue(electionA != electionB);
        assertEq(factory.getWhitelistedCollectionCount(), 2);
    }

    function test_setSenateSafe() public {
        address safe = makeAddr("safe");
        factory.setSenateSafe(safe);
        assertEq(factory.senateSafe(), safe);
    }

    function test_setSenateSafe_revertZeroAddress() public {
        vm.expectRevert(ElectionFactory.ZeroAddress.selector);
        factory.setSenateSafe(address(0));
    }

    function test_setSafeModule() public {
        address module = makeAddr("module");
        factory.setSafeModule(module);
        assertEq(factory.safeModule(), module);
    }

    function test_setVotingDuration() public {
        factory.setVotingDuration(14 days);
        assertEq(factory.defaultVotingDuration(), 14 days);
    }

    function test_getCurrentSenators() public {
        factory.whitelistCollection(address(nft), "Bored Apes", false);
        address electionAddr = factory.createElection(address(nft));
        SenateElectionV2 election = SenateElectionV2(electionAddr);

        // Run election
        uint256 t1 = nft.mint(alice);
        uint256 t2 = nft.mint(bob);
        uint256 t3 = nft.mint(carol);

        vm.prank(alice);
        election.declareCandidacy(t1, "Alice", "A");
        vm.prank(bob);
        election.declareCandidacy(t2, "Bob", "B");
        vm.prank(carol);
        election.declareCandidacy(t3, "Carol", "C");

        // Register voters
        vm.prank(alice);
        election.registerVoter(t1, 111);
        vm.prank(bob);
        election.registerVoter(t2, 222);
        vm.prank(carol);
        election.registerVoter(t3, 333);

        // Open voting
        vm.warp(election.voterRegistrationEndTime());
        election.openVoting();

        // Cast anonymous votes
        _castVote(election, 0, 2001); // Alice
        _castVote(election, 1, 2002); // Bob
        _castVote(election, 0, 2003); // Alice

        vm.warp(election.votingEndTime() + 1);
        election.finalizeElection();

        address[2] memory senators = factory.getCurrentSenators(address(nft));
        assertEq(senators[0], alice);
        assertEq(senators[1], bob);
    }

    function test_onElectionFinalized_revertOnlyElection() public {
        address[2] memory fakeWinners = [alice, bob];
        vm.expectRevert(ElectionFactory.OnlyElection.selector);
        factory.onElectionFinalized(address(nft), fakeWinners);
    }

    // ══════════════════════════════════════
    //  Signaling Proposals
    // ══════════════════════════════════════

    function test_createProposal() public {
        factory.whitelistCollection(address(nft), "Bored Apes", false);
        uint256 tokenId = nft.mint(alice);

        vm.prank(alice);
        uint256 proposalId = factory.createProposal("Test Proposal", "A description", address(nft), tokenId);

        assertEq(proposalId, 0);
        assertEq(factory.getProposalCount(), 1);
    }

    function test_createProposal_revertNotCollectionMember() public {
        factory.whitelistCollection(address(nft), "Bored Apes", false);
        uint256 tokenId = nft.mint(alice);

        // Bob doesn't own the token
        vm.prank(bob);
        vm.expectRevert(ElectionFactory.NotCollectionMember.selector);
        factory.createProposal("Test", "Desc", address(nft), tokenId);
    }

    function test_createProposal_revertNotWhitelisted() public {
        uint256 tokenId = nft.mint(alice);

        vm.prank(alice);
        vm.expectRevert(ElectionFactory.NotWhitelisted.selector);
        factory.createProposal("Test", "Desc", address(nft), tokenId);
    }

    function test_createProposal_revertEmptyTitle() public {
        factory.whitelistCollection(address(nft), "Bored Apes", false);
        uint256 tokenId = nft.mint(alice);

        vm.prank(alice);
        vm.expectRevert(ElectionFactory.EmptyTitle.selector);
        factory.createProposal("", "Desc", address(nft), tokenId);
    }

    function test_createProposal_cryptoPunks() public {
        MockCryptoPunks punks = new MockCryptoPunks();
        factory.whitelistCollection(address(punks), "CryptoPunks", true);
        uint256 punkId = punks.mint(alice);

        vm.prank(alice);
        uint256 proposalId = factory.createProposal("Punk Proposal", "Description", address(punks), punkId);
        assertEq(proposalId, 0);
    }

    // ══════════════════════════════════════
    //  Delegation Tokens (Safe multisig only)
    // ══════════════════════════════════════

    function test_addDelegationToken() public {
        address safe = makeAddr("safe");
        factory.setSenateSafe(safe);

        address token = makeAddr("token");
        vm.prank(safe);
        factory.addDelegationToken(token, "Uniswap", "UNI");

        assertTrue(factory.approvedToken(token));
        assertEq(factory.getDelegationTokenCount(), 1);
    }

    function test_addDelegationToken_revertNotSafe() public {
        address safe = makeAddr("safe");
        factory.setSenateSafe(safe);

        address token = makeAddr("token");
        vm.prank(alice);
        vm.expectRevert(ElectionFactory.OnlySenator.selector);
        factory.addDelegationToken(token, "Uniswap", "UNI");
    }

    function test_addDelegationToken_revertOwnerCantAdd() public {
        address safe = makeAddr("safe");
        factory.setSenateSafe(safe);

        address token = makeAddr("token");
        // Owner (address(this)) can't add tokens anymore
        vm.expectRevert(ElectionFactory.OnlySenator.selector);
        factory.addDelegationToken(token, "Uniswap", "UNI");
    }

    function test_removeDelegationToken() public {
        address safe = makeAddr("safe");
        factory.setSenateSafe(safe);

        address token = makeAddr("token");
        vm.prank(safe);
        factory.addDelegationToken(token, "Uniswap", "UNI");

        vm.prank(safe);
        factory.removeDelegationToken(token);

        assertFalse(factory.approvedToken(token));
        assertEq(factory.getDelegationTokenCount(), 0);
    }

    function test_removeDelegationToken_revertNotSafe() public {
        address safe = makeAddr("safe");
        factory.setSenateSafe(safe);

        address token = makeAddr("token");
        vm.prank(safe);
        factory.addDelegationToken(token, "Uniswap", "UNI");

        vm.prank(alice);
        vm.expectRevert(ElectionFactory.OnlySenator.selector);
        factory.removeDelegationToken(token);
    }

    // ══════════════════════════════════════
    //  Token Nominations
    // ══════════════════════════════════════

    function test_nominateDelegationToken() public {
        factory.whitelistCollection(address(nft), "Bored Apes", false);
        uint256 tokenId = nft.mint(alice);
        address token = makeAddr("token");

        vm.prank(alice);
        factory.nominateDelegationToken(token, "Uniswap", "UNI", "Great governance token", false, address(nft), tokenId);

        assertTrue(factory.nominatedToken(token));
        assertEq(factory.getTokenNominationCount(), 1);

        ElectionFactory.TokenNomination[] memory noms = factory.getTokenNominations();
        assertEq(noms[0].tokenAddress, token);
        assertEq(noms[0].name, "Uniswap");
        assertEq(noms[0].symbol, "UNI");
        assertEq(noms[0].nominator, alice);
        assertEq(noms[0].reason, "Great governance token");
        assertFalse(noms[0].forRemoval);
    }

    function test_nominateDelegationToken_revertNotMember() public {
        factory.whitelistCollection(address(nft), "Bored Apes", false);
        uint256 tokenId = nft.mint(alice);
        address token = makeAddr("token");

        // Bob doesn't own the token
        vm.prank(bob);
        vm.expectRevert(ElectionFactory.NotCollectionMember.selector);
        factory.nominateDelegationToken(token, "Uniswap", "UNI", "Reason", false, address(nft), tokenId);
    }

    function test_nominateDelegationToken_revertAlreadyNominated() public {
        factory.whitelistCollection(address(nft), "Bored Apes", false);
        uint256 tokenId = nft.mint(alice);
        address token = makeAddr("token");

        vm.prank(alice);
        factory.nominateDelegationToken(token, "Uniswap", "UNI", "Reason", false, address(nft), tokenId);

        vm.prank(alice);
        vm.expectRevert(ElectionFactory.TokenAlreadyNominated.selector);
        factory.nominateDelegationToken(token, "Uniswap", "UNI", "Reason again", false, address(nft), tokenId);
    }

    function test_nominateDelegationToken_forRemoval() public {
        // First approve a token via Safe
        address safe = makeAddr("safe");
        factory.setSenateSafe(safe);
        address token = makeAddr("token");
        vm.prank(safe);
        factory.addDelegationToken(token, "Uniswap", "UNI");

        // Now nominate it for removal
        factory.whitelistCollection(address(nft), "Bored Apes", false);
        uint256 tokenId = nft.mint(alice);

        vm.prank(alice);
        factory.nominateDelegationToken(token, "Uniswap", "UNI", "No longer needed", true, address(nft), tokenId);

        ElectionFactory.TokenNomination[] memory noms = factory.getTokenNominations();
        assertTrue(noms[0].forRemoval);
    }

    function test_nominateDelegationToken_forRemoval_revertNotApproved() public {
        factory.whitelistCollection(address(nft), "Bored Apes", false);
        uint256 tokenId = nft.mint(alice);
        address token = makeAddr("token");

        // Token is not approved, so forRemoval=true should revert
        vm.prank(alice);
        vm.expectRevert(ElectionFactory.TokenNotApproved.selector);
        factory.nominateDelegationToken(token, "Uniswap", "UNI", "Remove it", true, address(nft), tokenId);
    }

    // ══════════════════════════════════════
    //  CryptoPunks
    // ══════════════════════════════════════

    function test_cryptoPunksElection() public {
        MockCryptoPunks punks = new MockCryptoPunks();
        factory.whitelistCollection(address(punks), "CryptoPunks", true);
        assertTrue(factory.isCryptoPunks(address(punks)));

        address electionAddr = factory.createElection(address(punks));
        SenateElectionV2 election = SenateElectionV2(electionAddr);
        assertTrue(election.isCryptoPunks());

        // Mint punks
        uint256 p1 = punks.mint(alice);
        uint256 p2 = punks.mint(bob);
        uint256 p3 = punks.mint(carol);

        // Declare candidacy using punkIndexToAddress ownership
        vm.prank(alice);
        election.declareCandidacy(p1, "Alice", "Punk platform A");
        vm.prank(bob);
        election.declareCandidacy(p2, "Bob", "Punk platform B");
        vm.prank(carol);
        election.declareCandidacy(p3, "Carol", "Punk platform C");

        assertEq(uint256(election.phase()), uint256(SenateElectionV2.ElectionPhase.VoterRegistration));

        // Register voters
        vm.prank(alice);
        election.registerVoter(p1, 111);
        vm.prank(bob);
        election.registerVoter(p2, 222);
        vm.prank(carol);
        election.registerVoter(p3, 333);

        // Open voting
        vm.warp(election.voterRegistrationEndTime());
        election.openVoting();

        // Cast anonymous votes
        _castVote(election, 0, 3001);
        _castVote(election, 0, 3002);
        _castVote(election, 1, 3003);

        // Finalize
        vm.warp(election.votingEndTime() + 1);
        election.finalizeElection();

        address[2] memory senators = factory.getCurrentSenators(address(punks));
        assertEq(senators[0], alice);
        assertEq(senators[1], bob);
    }

    // ══════════════════════════════════════
    //  Helpers
    // ══════════════════════════════════════

    function _castVote(SenateElectionV2 election, uint256 candidateIndex, uint256 nullifier) internal {
        uint256[8] memory points;
        ISemaphore.SemaphoreProof memory proof = ISemaphore.SemaphoreProof({
            merkleTreeDepth: 20,
            merkleTreeRoot: 0,
            nullifier: nullifier,
            message: candidateIndex,
            scope: uint256(uint160(address(election))),
            points: points
        });
        election.castAnonymousVote(proof, "");
    }

    // ══════════════════════════════════════
    //  V3 Election Tests
    // ══════════════════════════════════════

    function _createV3Election() internal returns (SenateElectionV3) {
        factory.whitelistCollection(address(nft), "Bored Apes", false);
        address electionAddr = factory.createElectionV3(address(nft));
        return SenateElectionV3(electionAddr);
    }

    function _setupV3VotingPhase(SenateElectionV3 election) internal {
        uint256 t1 = nft.mint(alice);
        uint256 t2 = nft.mint(bob);
        uint256 t3 = nft.mint(carol);

        vm.prank(alice);
        election.declareCandidacy(t1, "Alice", "Platform A");
        vm.prank(bob);
        election.declareCandidacy(t2, "Bob", "Platform B");
        vm.prank(carol);
        election.declareCandidacy(t3, "Carol", "Platform C");

        // Warp past commitment deadline
        vm.warp(election.commitmentDeadline());

        // Admin opens voting with a mock root
        factory.openElectionVoting(address(election), 12345);
    }

    function _castVoteV3(SenateElectionV3 election, uint256 candidateIdx, uint256 nullifier) internal {
        uint256[8] memory points;
        ISemaphore.SemaphoreProof memory proof = ISemaphore.SemaphoreProof({
            merkleTreeDepth: 20,
            merkleTreeRoot: election.eligibilityRoot(),
            nullifier: nullifier,
            message: candidateIdx,
            scope: uint256(uint160(address(election))),
            points: points
        });
        election.castAnonymousVote(proof, "");
    }

    function test_createElectionV3() public {
        factory.whitelistCollection(address(nft), "Bored Apes", false);
        address electionAddr = factory.createElectionV3(address(nft));

        assertTrue(electionAddr != address(0));
        assertEq(factory.currentCycle(address(nft)), 1);
        assertEq(factory.getElection(address(nft), 0), electionAddr);

        SenateElectionV3 election = SenateElectionV3(electionAddr);
        assertEq(address(election.nftContract()), address(nft));
        assertEq(election.cycle(), 0);
        assertEq(uint256(election.phase()), uint256(SenateElectionV3.ElectionPhase.Registration));
    }

    function test_declareCandidacyV3() public {
        SenateElectionV3 election = _createV3Election();

        uint256 t1 = nft.mint(alice);
        uint256 t2 = nft.mint(bob);
        uint256 t3 = nft.mint(carol);

        vm.prank(alice);
        election.declareCandidacy(t1, "Alice", "Platform A");
        assertEq(election.commitmentDeadline(), 0); // Not set yet

        vm.prank(bob);
        election.declareCandidacy(t2, "Bob", "Platform B");
        assertEq(election.commitmentDeadline(), 0); // Still not set

        vm.prank(carol);
        election.declareCandidacy(t3, "Carol", "Platform C");
        assertTrue(election.commitmentDeadline() > 0); // Now set!
        assertEq(election.getCandidateCount(), 3);
        // Still in Registration phase (not VoterRegistration like V2)
        assertEq(uint256(election.phase()), uint256(SenateElectionV3.ElectionPhase.Registration));
    }

    function test_openElectionVoting() public {
        SenateElectionV3 election = _createV3Election();
        _setupV3VotingPhase(election);

        assertEq(uint256(election.phase()), uint256(SenateElectionV3.ElectionPhase.Voting));
        assertEq(election.eligibilityRoot(), 12345);
        assertTrue(election.votingEndTime() > 0);
    }

    function test_openElectionVoting_revertBeforeDeadline() public {
        SenateElectionV3 election = _createV3Election();

        uint256 t1 = nft.mint(alice);
        uint256 t2 = nft.mint(bob);
        uint256 t3 = nft.mint(carol);

        vm.prank(alice);
        election.declareCandidacy(t1, "Alice", "Platform A");
        vm.prank(bob);
        election.declareCandidacy(t2, "Bob", "Platform B");
        vm.prank(carol);
        election.declareCandidacy(t3, "Carol", "Platform C");

        // Try to open voting before deadline passes
        vm.expectRevert(SenateElectionV3.DeadlineNotPassed.selector);
        factory.openElectionVoting(address(election), 12345);
    }

    function test_castAnonymousVoteV3() public {
        SenateElectionV3 election = _createV3Election();
        _setupV3VotingPhase(election);

        _castVoteV3(election, 0, 5001);

        assertEq(election.totalVotes(), 1);
        SenateElectionV3.Candidate[] memory cands = election.getCandidates();
        assertEq(cands[0].voteCount, 1);
    }

    function test_castAnonymousVoteV3_revertDuplicateNullifier() public {
        SenateElectionV3 election = _createV3Election();
        _setupV3VotingPhase(election);

        _castVoteV3(election, 0, 6001);

        // Build proof inline to avoid external calls before vm.expectRevert
        uint256[8] memory points;
        ISemaphore.SemaphoreProof memory proof = ISemaphore.SemaphoreProof({
            merkleTreeDepth: 20,
            merkleTreeRoot: 12345,
            nullifier: 6001,
            message: 1,
            scope: uint256(uint160(address(election))),
            points: points
        });

        vm.expectRevert(SenateElectionV3.DuplicateNullifier.selector);
        election.castAnonymousVote(proof, "");
    }

    function test_castAnonymousVoteV3_revertWrongRoot() public {
        SenateElectionV3 election = _createV3Election();
        _setupV3VotingPhase(election);

        uint256[8] memory points;
        ISemaphore.SemaphoreProof memory proof = ISemaphore.SemaphoreProof({
            merkleTreeDepth: 20,
            merkleTreeRoot: 99999, // Wrong root
            nullifier: 7001,
            message: 0,
            scope: uint256(uint160(address(election))),
            points: points
        });

        vm.expectRevert(SenateElectionV3.InvalidRoot.selector);
        election.castAnonymousVote(proof, "");
    }

    function test_finalizeElectionV3() public {
        SenateElectionV3 election = _createV3Election();
        _setupV3VotingPhase(election);

        // Alice gets 2 votes, Bob gets 1
        _castVoteV3(election, 0, 8001);
        _castVoteV3(election, 0, 8002);
        _castVoteV3(election, 1, 8003);

        // Warp past voting end
        vm.warp(election.votingEndTime() + 1);
        election.finalizeElection();

        assertEq(uint256(election.phase()), uint256(SenateElectionV3.ElectionPhase.Finalized));
        address[2] memory electionWinners = election.getWinners();
        assertEq(electionWinners[0], alice);
        assertEq(electionWinners[1], bob);

        // Verify factory got the callback
        address[2] memory senators = factory.getCurrentSenators(address(nft));
        assertEq(senators[0], alice);
        assertEq(senators[1], bob);
    }
}
