// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import { Script, console } from "forge-std/Script.sol";
import { CREATE3 } from "solady/src/utils/CREATE3.sol";

import { NET } from "../contracts/tokens/NET.sol";

contract DeployNET is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PK");
        address owner = vm.envAddress("OWNER_ADDRESS");
        bytes32 salt = vm.envBytes32("SALT");

        vm.startBroadcast(deployerPrivateKey);

        address deployed = CREATE3.deployDeterministic(type(NET).creationCode, salt);
        address expected = CREATE3.predictDeterministicAddress(salt, vm.addr(deployerPrivateKey));
        require(deployed == expected, "Unexpected deployment address");

        NET token = NET(deployed);
        if (token.owner() != owner) token.transferOwnership(owner);

        vm.stopBroadcast();

        console.log("NET deployed at:", deployed);
        console.log("Owner:", token.owner());
        console.log("Deployer address:", vm.addr(deployerPrivateKey));
        console.log("Contract address:", deployed);
    }
}
