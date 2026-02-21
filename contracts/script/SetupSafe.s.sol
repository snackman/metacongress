// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/ElectionFactory.sol";
import "../src/SenateSafeModule.sol";

contract SetupSafe is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address factoryAddr = vm.envAddress("FACTORY_ADDRESS");
        address safeAddr = vm.envAddress("SAFE_ADDRESS");

        vm.startBroadcast(deployerPrivateKey);

        // Deploy module
        SenateSafeModule module = new SenateSafeModule(factoryAddr, safeAddr);
        console.log("SenateSafeModule deployed at:", address(module));

        // Configure factory
        ElectionFactory factory = ElectionFactory(factoryAddr);
        factory.setSenateSafe(safeAddr);
        factory.setSafeModule(address(module));

        console.log("Factory configured with Safe and Module");

        vm.stopBroadcast();
    }
}
