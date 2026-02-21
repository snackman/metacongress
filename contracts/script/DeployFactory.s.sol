// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/ElectionFactory.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

contract DeployFactory is Script {
    function run() external {
        address deployer = msg.sender;
        console.log("Deployer:", deployer);

        vm.startBroadcast();

        // 1. Deploy implementation
        ElectionFactory impl = new ElectionFactory();
        console.log("Implementation:", address(impl));

        // 2. Deploy proxy, initializing with deployer as owner
        ERC1967Proxy proxy = new ERC1967Proxy(
            address(impl),
            abi.encodeWithSelector(ElectionFactory.initialize.selector, deployer)
        );
        console.log("Proxy (ElectionFactory):", address(proxy));

        vm.stopBroadcast();
    }
}
