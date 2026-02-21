// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/SenateElectionV2.sol";
import "../src/ElectionFactory.sol";
import "../src/interfaces/ISemaphore.sol";
import "./mocks/MockSemaphore.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

contract MockNFTV2 is ERC721 {
    uint256 private _nextTokenId;

    constructor() ERC721("MockNFT", "MNFT") {}

    function mint(address to) external returns (uint256) {
        uint256 tokenId = _nextTokenId++;
        _mint(to, tokenId);
        return tokenId;
    }
}

contract SenateElectionV2Test is Test {
    ElectionFactory public factory;
    MockNFTV2 public nft;
    MockSemaphore public mockSemaphore;
    SenateElectionV2 public election;

    address public alice = makeAddr("alice");
    address public bob = makeAddr("bob");
    address public carol = makeAddr("carol");
    address public dave = makeAddr("dave");
    address public eve = makeAddr("eve");

    uint256 public aliceToken;
    uint256 public bobToken;
    uint256 public carolToken;
    uint256 public daveToken;
    uint256 public eveToken;

    // Identity commitments (arbitrary values for testing)
    uint256 constant ALICE_COMMITMENT = 111;
    uint256 constant BOB_COMMITMENT = 222;
    uint256 constant CAROL_COMMITMENT = 333;
    uint256 constant DAVE_COMMITMENT = 444;
    uint256 constant EVE_COMMITMENT = 555;

    function setUp() public {
        mockSemaphore = new MockSemaphore();

        ElectionFactory impl = new ElectionFactory();
        ERC1967Proxy proxy = new ERC1967Proxy(
            address(impl),
            abi.encodeWithSelector(ElectionFactory.initialize.selector, address(this))
        );
        factory = ElectionFactory(address(proxy));
        factory.setSemaphore(ISemaphore(address(mockSemaphore)));

        nft = new MockNFTV2();

        // Mint NFTs
        aliceToken = nft.mint(alice);
        bobToken = nft.mint(bob);
        carolToken = nft.mint(carol);
        daveToken = nft.mint(dave);
        eveToken = nft.mint(eve);

        // Whitelist and create election
        factory.whitelistCollection(address(nft), "MockNFT", false);
        address electionAddr = factory.createElection(address(nft));
        election = SenateElectionV2(electionAddr);
    }

    // ══════════════════════════════════════
    //  Initial State
    // ══════════════════════════════════════

    function test_initialState() public view {
        assertEq(uint256(election.phase()), uint256(SenateElectionV2.ElectionPhase.Registration));
        assertEq(address(election.nftContract()), address(nft));
        assertEq(election.cycle(), 0);
        assertEq(election.getCandidateCount(), 0);
        assertEq(election.totalVotes(), 0);
    }

    // ══════════════════════════════════════
    //  Candidacy (Registration Phase)
    // ══════════════════════════════════════

    function test_declareCandidacy() public {
        vm.prank(alice);
        election.declareCandidacy(aliceToken, "Alice", "My platform statement");

        SenateElectionV2.Candidate[] memory cands = election.getCandidates();
        assertEq(cands.length, 1);
        assertEq(cands[0].wallet, alice);
        assertEq(cands[0].nftTokenId, aliceToken);
        assertEq(cands[0].name, "Alice");
        assertEq(cands[0].platform, "My platform statement");
        assertEq(cands[0].voteCount, 0);
        assertTrue(cands[0].registered);
    }

    function test_declareCandidacy_revertNotOwner() public {
        vm.prank(bob);
        vm.expectRevert(SenateElectionV2.NotTokenOwner.selector);
        election.declareCandidacy(aliceToken, "Bob", "Fake platform");
    }

    function test_declareCandidacy_revertAlreadyCandidate() public {
        vm.prank(alice);
        election.declareCandidacy(aliceToken, "Alice", "Platform");

        vm.prank(alice);
        vm.expectRevert(SenateElectionV2.AlreadyCandidate.selector);
        election.declareCandidacy(aliceToken, "Alice2", "Platform2");
    }

    function test_declareCandidacy_revertEmptyName() public {
        vm.prank(alice);
        vm.expectRevert(SenateElectionV2.EmptyName.selector);
        election.declareCandidacy(aliceToken, "", "Platform");
    }

    function test_declareCandidacy_revertNameTooLong() public {
        string memory longName = new string(65);
        vm.prank(alice);
        vm.expectRevert(SenateElectionV2.NameTooLong.selector);
        election.declareCandidacy(aliceToken, longName, "Platform");
    }

    function test_declareCandidacy_revertPlatformTooLong() public {
        string memory longPlatform = new string(1025);
        vm.prank(alice);
        vm.expectRevert(SenateElectionV2.PlatformTooLong.selector);
        election.declareCandidacy(aliceToken, "Alice", longPlatform);
    }

    function test_updatePlatform() public {
        vm.prank(alice);
        election.declareCandidacy(aliceToken, "Alice", "Old platform");

        vm.prank(alice);
        election.updatePlatform("New platform");

        SenateElectionV2.Candidate[] memory cands = election.getCandidates();
        assertEq(cands[0].platform, "New platform");
    }

    function test_updatePlatform_revertNotCandidate() public {
        vm.prank(alice);
        vm.expectRevert(SenateElectionV2.NotCandidate.selector);
        election.updatePlatform("Platform");
    }

    // ══════════════════════════════════════
    //  Phase Transitions
    // ══════════════════════════════════════

    function test_phaseTransitions() public {
        // Start: Registration
        assertEq(uint256(election.phase()), uint256(SenateElectionV2.ElectionPhase.Registration));

        // First two candidates: still in Registration
        vm.prank(alice);
        election.declareCandidacy(aliceToken, "Alice", "Platform A");
        assertEq(uint256(election.phase()), uint256(SenateElectionV2.ElectionPhase.Registration));

        vm.prank(bob);
        election.declareCandidacy(bobToken, "Bob", "Platform B");
        assertEq(uint256(election.phase()), uint256(SenateElectionV2.ElectionPhase.Registration));

        // Third candidate triggers VoterRegistration phase
        vm.prank(carol);
        election.declareCandidacy(carolToken, "Carol", "Platform C");
        assertEq(uint256(election.phase()), uint256(SenateElectionV2.ElectionPhase.VoterRegistration));
        assertTrue(election.voterRegistrationEndTime() > 0);

        // Can't open voting too early
        vm.expectRevert(SenateElectionV2.RegistrationNotEnded.selector);
        election.openVoting();

        // Warp past registration end
        vm.warp(election.voterRegistrationEndTime());

        // Open Voting
        election.openVoting();
        assertEq(uint256(election.phase()), uint256(SenateElectionV2.ElectionPhase.Voting));
        assertTrue(election.votingEndTime() > 0);
    }

    // ══════════════════════════════════════
    //  Voter Registration
    // ══════════════════════════════════════

    function test_registerVoter() public {
        _setupVoterRegistrationPhase();

        vm.prank(dave);
        election.registerVoter(daveToken, DAVE_COMMITMENT);

        assertTrue(election.hasRegistered(daveToken));
    }

    function test_registerVoter_revertNotOwner() public {
        _setupVoterRegistrationPhase();

        vm.prank(alice);
        vm.expectRevert(SenateElectionV2.NotTokenOwner.selector);
        election.registerVoter(daveToken, DAVE_COMMITMENT);
    }

    function test_registerVoter_revertAlreadyRegistered() public {
        _setupVoterRegistrationPhase();

        vm.prank(dave);
        election.registerVoter(daveToken, DAVE_COMMITMENT);

        vm.prank(dave);
        vm.expectRevert(SenateElectionV2.AlreadyRegistered.selector);
        election.registerVoter(daveToken, DAVE_COMMITMENT);
    }

    function test_registerVoter_revertWrongPhase() public {
        // Still in Registration
        vm.prank(dave);
        vm.expectRevert(abi.encodeWithSelector(
            SenateElectionV2.WrongPhase.selector,
            SenateElectionV2.ElectionPhase.VoterRegistration,
            SenateElectionV2.ElectionPhase.Registration
        ));
        election.registerVoter(daveToken, DAVE_COMMITMENT);
    }

    // ══════════════════════════════════════
    //  Opening Voting
    // ══════════════════════════════════════

    function test_openVoting_revertTooEarly() public {
        _setupVoterRegistrationPhase();

        vm.expectRevert(SenateElectionV2.RegistrationNotEnded.selector);
        election.openVoting();
    }

    // ══════════════════════════════════════
    //  Anonymous Voting
    // ══════════════════════════════════════

    function test_castAnonymousVote() public {
        _setupVotingPhase();

        ISemaphore.SemaphoreProof memory proof = _makeProof(
            0,    // candidateIndex (message)
            1001, // nullifier
            uint256(uint160(address(election))) // scope
        );

        election.castAnonymousVote(proof, "Go Alice!");

        SenateElectionV2.Candidate[] memory cands = election.getCandidates();
        assertEq(cands[0].voteCount, 1);
        assertEq(election.totalVotes(), 1);
    }

    function test_castAnonymousVote_revertDoubleVote() public {
        _setupVotingPhase();

        ISemaphore.SemaphoreProof memory proof = _makeProof(
            0, 1001, uint256(uint160(address(election)))
        );

        election.castAnonymousVote(proof, "");

        // Same nullifier should revert
        vm.expectRevert(MockSemaphore.DuplicateNullifier.selector);
        election.castAnonymousVote(proof, "");
    }

    function test_castAnonymousVote_revertInvalidCandidate() public {
        _setupVotingPhase();

        ISemaphore.SemaphoreProof memory proof = _makeProof(
            99, // invalid candidate index
            1001,
            uint256(uint160(address(election)))
        );

        vm.expectRevert(SenateElectionV2.InvalidCandidateIndex.selector);
        election.castAnonymousVote(proof, "");
    }

    function test_castAnonymousVote_revertWrongScope() public {
        _setupVotingPhase();

        ISemaphore.SemaphoreProof memory proof = _makeProof(
            0, 1001, 12345 // wrong scope
        );

        vm.expectRevert(SenateElectionV2.InvalidScope.selector);
        election.castAnonymousVote(proof, "");
    }

    function test_castAnonymousVote_revertCommentTooLong() public {
        _setupVotingPhase();

        ISemaphore.SemaphoreProof memory proof = _makeProof(
            0, 1001, uint256(uint160(address(election)))
        );

        string memory longComment = new string(281);
        vm.expectRevert(SenateElectionV2.CommentTooLong.selector);
        election.castAnonymousVote(proof, longComment);
    }

    function test_castAnonymousVote_revertWrongPhase() public {
        // Still in Registration
        ISemaphore.SemaphoreProof memory proof = _makeProof(
            0, 1001, uint256(uint160(address(election)))
        );

        vm.expectRevert(abi.encodeWithSelector(
            SenateElectionV2.WrongPhase.selector,
            SenateElectionV2.ElectionPhase.Voting,
            SenateElectionV2.ElectionPhase.Registration
        ));
        election.castAnonymousVote(proof, "");
    }

    function test_castAnonymousVote_anyoneCanSubmit() public {
        _setupVotingPhase();

        // Eve (who didn't register) can submit a proof as a relayer
        ISemaphore.SemaphoreProof memory proof = _makeProof(
            0, 1001, uint256(uint160(address(election)))
        );

        vm.prank(eve);
        election.castAnonymousVote(proof, "Relayed vote");

        assertEq(election.totalVotes(), 1);
    }

    // ══════════════════════════════════════
    //  Finalization
    // ══════════════════════════════════════

    function test_finalizeElection() public {
        _setupVotingPhase();

        // Alice: 2 votes, Bob: 2 votes, Carol: 0 votes
        // Tie-break: Alice (index 0) beats Bob (index 1)
        _castVote(0, 1001); // vote for Alice
        _castVote(0, 1002); // vote for Alice
        _castVote(1, 1003); // vote for Bob
        _castVote(1, 1004); // vote for Bob

        // Warp past voting end
        vm.warp(election.votingEndTime() + 1);

        election.finalizeElection();

        assertEq(uint256(election.phase()), uint256(SenateElectionV2.ElectionPhase.Finalized));
        address[2] memory w = election.getWinners();
        assertEq(w[0], alice);
        assertEq(w[1], bob);
        assertEq(election.totalVotes(), 4);
    }

    function test_finalizeElection_revertVotingNotEnded() public {
        _setupVotingPhase();

        vm.expectRevert(SenateElectionV2.VotingNotEnded.selector);
        election.finalizeElection();
    }

    function test_finalizeElection_clearWinner() public {
        _setupVotingPhase();

        // Alice gets 2 votes, Bob gets 1, Carol gets 0
        _castVote(0, 2001); // Alice
        _castVote(0, 2002); // Alice
        _castVote(1, 2003); // Bob

        vm.warp(election.votingEndTime() + 1);
        election.finalizeElection();

        address[2] memory w = election.getWinners();
        assertEq(w[0], alice); // 2 votes
        assertEq(w[1], bob);   // 1 vote
    }

    function test_updatePlatform_revertAfterVoterRegistration() public {
        _setupVoterRegistrationPhase();

        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(
            SenateElectionV2.WrongPhase.selector,
            SenateElectionV2.ElectionPhase.Registration,
            SenateElectionV2.ElectionPhase.VoterRegistration
        ));
        election.updatePlatform("Late update");
    }

    function test_candidacyDeclared_revertAfterVoterRegistration() public {
        _setupVoterRegistrationPhase();

        uint256 newToken = nft.mint(makeAddr("newguy"));
        vm.prank(makeAddr("newguy"));
        vm.expectRevert(abi.encodeWithSelector(
            SenateElectionV2.WrongPhase.selector,
            SenateElectionV2.ElectionPhase.Registration,
            SenateElectionV2.ElectionPhase.VoterRegistration
        ));
        election.declareCandidacy(newToken, "NewGuy", "Platform");
    }

    // ══════════════════════════════════════
    //  Helpers
    // ══════════════════════════════════════

    function _setupVoterRegistrationPhase() internal {
        vm.prank(alice);
        election.declareCandidacy(aliceToken, "Alice", "Platform A");
        vm.prank(bob);
        election.declareCandidacy(bobToken, "Bob", "Platform B");
        vm.prank(carol);
        election.declareCandidacy(carolToken, "Carol", "Platform C");

        assertEq(uint256(election.phase()), uint256(SenateElectionV2.ElectionPhase.VoterRegistration));
    }

    function _setupVotingPhase() internal {
        _setupVoterRegistrationPhase();

        // Register some voters
        vm.prank(dave);
        election.registerVoter(daveToken, DAVE_COMMITMENT);
        vm.prank(eve);
        election.registerVoter(eveToken, EVE_COMMITMENT);

        // Warp past registration end and open voting
        vm.warp(election.voterRegistrationEndTime());
        election.openVoting();

        assertEq(uint256(election.phase()), uint256(SenateElectionV2.ElectionPhase.Voting));
    }

    function _makeProof(
        uint256 message,
        uint256 nullifier,
        uint256 scope
    ) internal pure returns (ISemaphore.SemaphoreProof memory) {
        uint256[8] memory points;
        return ISemaphore.SemaphoreProof({
            merkleTreeDepth: 20,
            merkleTreeRoot: 0,
            nullifier: nullifier,
            message: message,
            scope: scope,
            points: points
        });
    }

    function _castVote(uint256 candidateIndex, uint256 nullifier) internal {
        ISemaphore.SemaphoreProof memory proof = _makeProof(
            candidateIndex,
            nullifier,
            uint256(uint160(address(election)))
        );
        election.castAnonymousVote(proof, "");
    }
}
