// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/ElectionFactory.sol";
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

contract ElectionFactoryTest is Test {
    ElectionFactory public factory;
    MockNFT public nft;
    MockNFT public nft2;

    address public owner = address(this);
    address public alice = makeAddr("alice");
    address public bob = makeAddr("bob");
    address public carol = makeAddr("carol");

    function setUp() public {
        factory = new ElectionFactory();
        nft = new MockNFT();
        nft2 = new MockNFT();
    }

    function test_whitelistCollection() public {
        factory.whitelistCollection(address(nft), "Bored Apes");

        assertTrue(factory.whitelisted(address(nft)));
        assertEq(factory.collectionName(address(nft)), "Bored Apes");
        assertEq(factory.getWhitelistedCollectionCount(), 1);

        address[] memory collections = factory.getWhitelistedCollections();
        assertEq(collections[0], address(nft));
    }

    function test_whitelistCollection_revertNotOwner() public {
        vm.prank(alice);
        vm.expectRevert();
        factory.whitelistCollection(address(nft), "Bored Apes");
    }

    function test_whitelistCollection_revertAlreadyWhitelisted() public {
        factory.whitelistCollection(address(nft), "Bored Apes");

        vm.expectRevert(ElectionFactory.AlreadyWhitelisted.selector);
        factory.whitelistCollection(address(nft), "Bored Apes");
    }

    function test_whitelistCollection_revertZeroAddress() public {
        vm.expectRevert(ElectionFactory.ZeroAddress.selector);
        factory.whitelistCollection(address(0), "Zero");
    }

    function test_removeCollection() public {
        factory.whitelistCollection(address(nft), "Bored Apes");
        factory.removeCollection(address(nft));

        assertFalse(factory.whitelisted(address(nft)));
        assertEq(factory.getWhitelistedCollectionCount(), 0);
    }

    function test_removeCollection_revertNotWhitelisted() public {
        vm.expectRevert(ElectionFactory.NotWhitelisted.selector);
        factory.removeCollection(address(nft));
    }

    function test_createElection() public {
        factory.whitelistCollection(address(nft), "Bored Apes");

        address electionAddr = factory.createElection(address(nft));
        assertTrue(electionAddr != address(0));
        assertEq(factory.currentCycle(address(nft)), 1);
        assertEq(factory.getElection(address(nft), 0), electionAddr);

        SenateElection election = SenateElection(electionAddr);
        assertEq(address(election.nftContract()), address(nft));
        assertEq(election.cycle(), 0);
    }

    function test_createElection_revertNotWhitelisted() public {
        vm.expectRevert(ElectionFactory.NotWhitelisted.selector);
        factory.createElection(address(nft));
    }

    function test_createElection_revertActiveExists() public {
        factory.whitelistCollection(address(nft), "Bored Apes");
        factory.createElection(address(nft));

        vm.expectRevert(ElectionFactory.ActiveElectionExists.selector);
        factory.createElection(address(nft));
    }

    function test_createNewCycleAfterFinalization() public {
        factory.whitelistCollection(address(nft), "Bored Apes");

        // Create first election
        address electionAddr = factory.createElection(address(nft));
        SenateElection election = SenateElection(electionAddr);

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

        // Vote
        vm.prank(alice);
        election.vote(t1, 0, "");
        vm.prank(bob);
        election.vote(t2, 0, "");
        vm.prank(carol);
        election.vote(t3, 1, "");

        // Finalize
        vm.warp(block.timestamp + 7 days + 1);
        election.finalizeElection();

        // Should be able to create new election
        address newElectionAddr = factory.createElection(address(nft));
        assertTrue(newElectionAddr != address(0));
        assertTrue(newElectionAddr != electionAddr);
        assertEq(factory.currentCycle(address(nft)), 2);
    }

    function test_multipleCollections() public {
        factory.whitelistCollection(address(nft), "Collection A");
        factory.whitelistCollection(address(nft2), "Collection B");

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
        factory.whitelistCollection(address(nft), "Bored Apes");
        address electionAddr = factory.createElection(address(nft));
        SenateElection election = SenateElection(electionAddr);

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

        vm.prank(alice);
        election.vote(t1, 0, "");
        vm.prank(bob);
        election.vote(t2, 1, "");
        vm.prank(carol);
        election.vote(t3, 0, "");

        vm.warp(block.timestamp + 7 days + 1);
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
}
