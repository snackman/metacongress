// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/SenateElection.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract MockNFT is ERC721 {
    uint256 private _nextTokenId;

    constructor() ERC721("MockNFT", "MNFT") {}

    function mint(address to) external returns (uint256) {
        uint256 tokenId = _nextTokenId++;
        _mint(to, tokenId);
        return tokenId;
    }
}

contract SenateElectionTest is Test {
    MockNFT public nft;
    SenateElection public election;

    address public alice = makeAddr("alice");
    address public bob = makeAddr("bob");
    address public carol = makeAddr("carol");
    address public dave = makeAddr("dave");

    uint256 public aliceToken;
    uint256 public bobToken;
    uint256 public carolToken;
    uint256 public daveToken;

    function setUp() public {
        nft = new MockNFT();

        // Mint NFTs
        aliceToken = nft.mint(alice);
        bobToken = nft.mint(bob);
        carolToken = nft.mint(carol);
        daveToken = nft.mint(dave);

        // Deploy V1 election directly (factory now deploys V2)
        election = new SenateElection(
            address(nft),
            0,
            address(this),
            7 days,
            false
        );
    }

    // Stub for the factory callback
    function onElectionFinalized(address, address[2] calldata) external {}

    function test_initialState() public view {
        assertEq(uint256(election.phase()), uint256(SenateElection.ElectionPhase.Registration));
        assertEq(address(election.nftContract()), address(nft));
        assertEq(election.cycle(), 0);
        assertEq(election.getCandidateCount(), 0);
    }

    function test_declareCandidacy() public {
        vm.prank(alice);
        election.declareCandidacy(aliceToken, "Alice", "My platform statement");

        SenateElection.Candidate[] memory candidates = election.getCandidates();
        assertEq(candidates.length, 1);
        assertEq(candidates[0].wallet, alice);
        assertEq(candidates[0].nftTokenId, aliceToken);
        assertEq(candidates[0].name, "Alice");
        assertEq(candidates[0].platform, "My platform statement");
        assertEq(candidates[0].voteCount, 0);
        assertTrue(candidates[0].registered);
    }

    function test_declareCandidacy_revertNotOwner() public {
        vm.prank(bob);
        vm.expectRevert(SenateElection.NotTokenOwner.selector);
        election.declareCandidacy(aliceToken, "Bob", "Fake platform");
    }

    function test_declareCandidacy_revertAlreadyCandidate() public {
        vm.prank(alice);
        election.declareCandidacy(aliceToken, "Alice", "Platform");

        vm.prank(alice);
        vm.expectRevert(SenateElection.AlreadyCandidate.selector);
        election.declareCandidacy(aliceToken, "Alice2", "Platform2");
    }

    function test_declareCandidacy_revertEmptyName() public {
        vm.prank(alice);
        vm.expectRevert(SenateElection.EmptyName.selector);
        election.declareCandidacy(aliceToken, "", "Platform");
    }

    function test_declareCandidacy_revertNameTooLong() public {
        string memory longName = new string(65);
        vm.prank(alice);
        vm.expectRevert(SenateElection.NameTooLong.selector);
        election.declareCandidacy(aliceToken, longName, "Platform");
    }

    function test_declareCandidacy_revertPlatformTooLong() public {
        string memory longPlatform = new string(1025);
        vm.prank(alice);
        vm.expectRevert(SenateElection.PlatformTooLong.selector);
        election.declareCandidacy(aliceToken, "Alice", longPlatform);
    }

    function test_updatePlatform() public {
        vm.prank(alice);
        election.declareCandidacy(aliceToken, "Alice", "Old platform");

        vm.prank(alice);
        election.updatePlatform("New platform");

        SenateElection.Candidate[] memory candidates = election.getCandidates();
        assertEq(candidates[0].platform, "New platform");
    }

    function test_updatePlatform_revertNotCandidate() public {
        vm.prank(alice);
        vm.expectRevert(SenateElection.NotCandidate.selector);
        election.updatePlatform("Platform");
    }

    function test_votingOpensAfterThreeCandidates() public {
        // First two candidates: still in Registration
        vm.prank(alice);
        election.declareCandidacy(aliceToken, "Alice", "Platform A");
        assertEq(uint256(election.phase()), uint256(SenateElection.ElectionPhase.Registration));

        vm.prank(bob);
        election.declareCandidacy(bobToken, "Bob", "Platform B");
        assertEq(uint256(election.phase()), uint256(SenateElection.ElectionPhase.Registration));

        // Third candidate triggers Voting phase
        vm.prank(carol);
        election.declareCandidacy(carolToken, "Carol", "Platform C");
        assertEq(uint256(election.phase()), uint256(SenateElection.ElectionPhase.Voting));
        assertEq(election.votingEndTime(), block.timestamp + 7 days);
    }

    function test_vote() public {
        _setupVotingPhase();

        vm.prank(dave);
        election.vote(daveToken, 0, "Go Alice!");

        SenateElection.Candidate[] memory candidates = election.getCandidates();
        assertEq(candidates[0].voteCount, 1);

        SenateElection.Vote memory v = election.getVote(daveToken);
        assertEq(v.voterTokenId, daveToken);
        assertEq(v.candidateIndex, 0);
        assertEq(v.comment, "Go Alice!");
        assertTrue(v.timestamp > 0);
    }

    function test_vote_revertNotOwner() public {
        _setupVotingPhase();

        vm.prank(alice);
        vm.expectRevert(SenateElection.NotTokenOwner.selector);
        election.vote(daveToken, 0, "");
    }

    function test_vote_revertAlreadyVoted() public {
        _setupVotingPhase();

        vm.prank(dave);
        election.vote(daveToken, 0, "");

        vm.prank(dave);
        vm.expectRevert(SenateElection.AlreadyVoted.selector);
        election.vote(daveToken, 1, "");
    }

    function test_vote_revertInvalidCandidate() public {
        _setupVotingPhase();

        vm.prank(dave);
        vm.expectRevert(SenateElection.InvalidCandidateIndex.selector);
        election.vote(daveToken, 99, "");
    }

    function test_vote_revertCommentTooLong() public {
        _setupVotingPhase();

        string memory longComment = new string(281);
        vm.prank(dave);
        vm.expectRevert(SenateElection.CommentTooLong.selector);
        election.vote(daveToken, 0, longComment);
    }

    function test_vote_revertWrongPhase() public {
        // Still in Registration
        vm.prank(dave);
        vm.expectRevert(abi.encodeWithSelector(
            SenateElection.WrongPhase.selector,
            SenateElection.ElectionPhase.Voting,
            SenateElection.ElectionPhase.Registration
        ));
        election.vote(daveToken, 0, "");
    }

    function test_finalizeElection() public {
        _setupVotingPhase();

        // Alice, Bob, Carol are candidates (indices 0, 1, 2)
        // Dave votes for Alice
        vm.prank(dave);
        election.vote(daveToken, 0, "");

        // Alice votes for herself (candidates can vote)
        vm.prank(alice);
        election.vote(aliceToken, 0, "");

        // Bob votes for himself
        vm.prank(bob);
        election.vote(bobToken, 1, "");

        // Carol votes for Bob
        vm.prank(carol);
        election.vote(carolToken, 1, "");

        // Alice: 2 votes, Bob: 2 votes, Carol: 0 votes
        // Tie-break: Alice (index 0) beats Bob (index 1)

        // Warp past voting end
        vm.warp(block.timestamp + 7 days + 1);

        election.finalizeElection();

        assertEq(uint256(election.phase()), uint256(SenateElection.ElectionPhase.Finalized));
        address[2] memory w = election.getWinners();
        assertEq(w[0], alice);
        assertEq(w[1], bob);
    }

    function test_finalizeElection_revertVotingNotEnded() public {
        _setupVotingPhase();

        vm.expectRevert(SenateElection.VotingNotEnded.selector);
        election.finalizeElection();
    }

    function test_finalizeElection_clearWinner() public {
        _setupVotingPhase();

        // Alice gets 2 votes, Bob gets 1, Carol gets 0
        vm.prank(dave);
        election.vote(daveToken, 0, "");
        vm.prank(alice);
        election.vote(aliceToken, 0, "");
        vm.prank(bob);
        election.vote(bobToken, 1, "");

        vm.warp(block.timestamp + 7 days + 1);
        election.finalizeElection();

        address[2] memory w = election.getWinners();
        assertEq(w[0], alice); // 2 votes
        assertEq(w[1], bob);   // 1 vote
    }

    function test_updatePlatform_revertAfterVotingStarts() public {
        _setupVotingPhase();

        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(
            SenateElection.WrongPhase.selector,
            SenateElection.ElectionPhase.Registration,
            SenateElection.ElectionPhase.Voting
        ));
        election.updatePlatform("Late update");
    }

    function test_candidacyDeclared_revertAfterVotingStarts() public {
        _setupVotingPhase();

        uint256 newToken = nft.mint(makeAddr("newguy"));
        vm.prank(makeAddr("newguy"));
        vm.expectRevert(abi.encodeWithSelector(
            SenateElection.WrongPhase.selector,
            SenateElection.ElectionPhase.Registration,
            SenateElection.ElectionPhase.Voting
        ));
        election.declareCandidacy(newToken, "NewGuy", "Platform");
    }

    function _setupVotingPhase() internal {
        vm.prank(alice);
        election.declareCandidacy(aliceToken, "Alice", "Platform A");
        vm.prank(bob);
        election.declareCandidacy(bobToken, "Bob", "Platform B");
        vm.prank(carol);
        election.declareCandidacy(carolToken, "Carol", "Platform C");

        assertEq(uint256(election.phase()), uint256(SenateElection.ElectionPhase.Voting));
    }
}
