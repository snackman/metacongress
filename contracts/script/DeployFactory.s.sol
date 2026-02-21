// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/ElectionFactory.sol";

contract DeployFactory is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        ElectionFactory factory = new ElectionFactory();
        console.log("ElectionFactory deployed at:", address(factory));

        vm.stopBroadcast();
    }
}
