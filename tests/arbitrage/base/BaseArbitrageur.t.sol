// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import { ERC20 } from "openzeppelin-contracts/contracts/token/ERC20/ERC20.sol";

import { BaseArbitrageur } from "../../../contracts/arbitrage/base/BaseArbitrageur.sol";

import { BaseTest } from "../../BaseTest.sol";

contract TestArbitrageur is BaseArbitrageur {}

contract BaseArbitrageurTest is BaseTest {
    TestArbitrageur arbitrageur;
    ERC20 token = new ERC20("Test Token", "TEST");
    address owner = makeAddr("owner");
    address nonOwner = makeAddr("nonOwner");
    address spender1 = makeAddr("spender1");
    address spender2 = makeAddr("spender2");

    // public

    function setUp() public {
        vm.prank(owner);
        arbitrageur = new TestArbitrageur();
    }

    function test_owner() public {
        assertEq(owner, arbitrageur.owner());
    }

    function test_withdrawAll() public {
        assertEq(token.balanceOf(owner), 0);

        deal(address(token), address(arbitrageur), 1 ether);

        vm.prank(owner);
        arbitrageur.withdrawAll(address(token));

        assertEq(token.balanceOf(owner), 1 ether);
    }

    function test_withdrawAll_RevertIf_NotOwner() public {
        vm.expectRevert("UNAUTHORIZED");
        vm.prank(nonOwner);
        arbitrageur.withdrawAll(address(token));
    }
}
