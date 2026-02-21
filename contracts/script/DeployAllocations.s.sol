// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/ElectionFactory.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

contract DeployAllocations is Script {
    // ElectionFactory proxy on mainnet
    address constant FACTORY_PROXY = 0x777153E479857BcDc23D82E1228240bD74858EF4;

    // Supported collections
    address constant CRYPTOPUNKS = 0xb47e3cd837dDF8e4c57F05d70Ab865de6e193BBB;
    address constant BAYC = 0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D;
    address constant PUDGY_PENGUINS = 0xBd3531dA5CF5857e7CfAA92426877b022e612cf8;
    address constant BUFFICORNS = 0x1e988ba4692e52Bc50b375bcC8585b95c48AaD77;

    function run() external {
        ElectionFactory factory = ElectionFactory(FACTORY_PROXY);

        vm.startBroadcast();

        // Step 1: Deploy new implementation and upgrade proxy
        ElectionFactory newImpl = new ElectionFactory();
        console.log("New implementation:", address(newImpl));

        factory.upgradeToAndCall(address(newImpl), "");
        console.log("Factory proxy upgraded");

        // Step 2: Create allocations for all collections
        address[] memory collections = new address[](4);
        collections[0] = CRYPTOPUNKS;
        collections[1] = BAYC;
        collections[2] = PUDGY_PENGUINS;
        collections[3] = BUFFICORNS;

        for (uint256 i = 0; i < collections.length; i++) {
            address nft = collections[i];

            // Skip if allocation already exists
            if (factory.allocationContracts(nft) != address(0)) {
                console.log("Allocation already exists for:", nft);
                console.log("  ->", factory.allocationContracts(nft));
                continue;
            }

            // Skip if not whitelisted
            if (!factory.whitelisted(nft)) {
                console.log("Not whitelisted, skipping:", nft);
                continue;
            }

            address allocation = factory.createAllocation(nft);
            console.log("Created allocation for:", nft);
            console.log("  ->", allocation);
        }

        vm.stopBroadcast();
    }
}
