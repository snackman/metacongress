// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/ElectionFactory.sol";
import "../src/SenateAllocation.sol";
import "../src/interfaces/ISemaphoreVerifier.sol";

/// @notice One-time fix: upgrade factory, set correct Semaphore verifier, redeploy all allocations.
///         Run with: forge script script/FixAllocations.s.sol --rpc-url $RPC_URL --broadcast
contract FixAllocations is Script {
    address constant FACTORY_PROXY = 0x777153E479857BcDc23D82E1228240bD74858EF4;

    // Correct Semaphore v4 verifier on mainnet (Groth16)
    ISemaphoreVerifier constant SEMAPHORE_VERIFIER = ISemaphoreVerifier(0x4DeC9E3784EcC1eE002001BfE91deEf4A48931f8);

    // Whitelisted collections
    address constant CRYPTOPUNKS = 0xb47e3cd837dDF8e4c57F05d70Ab865de6e193BBB;
    address constant BAYC = 0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D;
    address constant PUDGY_PENGUINS = 0xBd3531dA5CF5857e7CfAA92426877b022e612cf8;
    address constant BUFFICORNS = 0x1e988ba4692e52Bc50b375bcC8585b95c48AaD77;

    function run() external {
        ElectionFactory factory = ElectionFactory(FACTORY_PROXY);

        console.log("Current semaphoreVerifier:", address(factory.semaphoreVerifier()));
        console.log("Factory owner:", factory.owner());

        vm.startBroadcast();

        // Step 1: Deploy new factory implementation with setAllocation()
        ElectionFactory newImpl = new ElectionFactory();
        console.log("New implementation deployed:", address(newImpl));

        // Step 2: Upgrade proxy to new implementation
        factory.upgradeToAndCall(address(newImpl), "");
        console.log("Factory proxy upgraded");

        // Step 3: Set correct Semaphore verifier
        factory.setSemaphoreVerifier(SEMAPHORE_VERIFIER);
        console.log("Semaphore verifier set to:", address(SEMAPHORE_VERIFIER));

        // Step 4: Deploy new allocation contracts directly and set on factory
        address[4] memory collections = [CRYPTOPUNKS, BAYC, PUDGY_PENGUINS, BUFFICORNS];
        bool[4] memory isPunks = [true, false, false, false];

        for (uint256 i = 0; i < collections.length; i++) {
            address nft = collections[i];
            address oldAlloc = factory.allocationContracts(nft);
            console.log("Replacing allocation for:", nft);
            console.log("  Old:", oldAlloc);

            SenateAllocation newAlloc = new SenateAllocation(
                nft,
                FACTORY_PROXY,
                isPunks[i],
                SEMAPHORE_VERIFIER
            );

            factory.setAllocation(nft, address(newAlloc));
            console.log("  New:", address(newAlloc));
        }

        vm.stopBroadcast();

        // Verification
        console.log("\n=== Verification ===");
        console.log("Factory verifier:", address(factory.semaphoreVerifier()));
        for (uint256 i = 0; i < collections.length; i++) {
            address alloc = factory.allocationContracts(collections[i]);
            console.log("Allocation:", alloc, "-> verifier:", address(SenateAllocation(alloc).verifier()));
        }
    }
}
