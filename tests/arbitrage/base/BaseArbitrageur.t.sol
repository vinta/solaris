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

    function test_owner_Success() public {
        assertEq(owner, arbitrageur.owner());
    }

    function test_approveAll_Success() public {
        address[] memory spenders = new address[](2);
        spenders[0] = spender1;
        spenders[1] = spender2;

        vm.prank(owner);
        arbitrageur.approveAll(address(token), spenders, 1 ether);

        assertEq(token.allowance(address(arbitrageur), spender1), 1 ether);
        assertEq(token.allowance(address(arbitrageur), spender2), 1 ether);
    }

    function test_approveAll_RevertIf_NotOwner() public {
        address[] memory spenders = new address[](2);
        spenders[0] = spender1;
        spenders[1] = spender2;

        vm.expectRevert("Ownable: caller is not the owner");
        vm.prank(nonOwner);
        arbitrageur.approveAll(address(token), spenders, 1 ether);
    }

    function test_withdrawAll_Success() public {
        assertEq(token.balanceOf(owner), 0);

        deal(address(token), address(arbitrageur), 1 ether);

        vm.prank(owner);
        arbitrageur.withdrawAll(address(token));

        assertEq(token.balanceOf(owner), 1 ether);
    }

    function test_withdrawAll_RevertIf_NotOwner() public {
        vm.expectRevert("Ownable: caller is not the owner");
        vm.prank(nonOwner);
        arbitrageur.withdrawAll(address(token));
    }
}
