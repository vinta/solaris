// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "forge-std/Test.sol";

import { Ownable } from "openzeppelin-contracts-v5.4.0/contracts/access/Ownable.sol";
import { ERC20Capped } from "openzeppelin-contracts-v5.4.0/contracts/token/ERC20/extensions/ERC20Capped.sol";

import { NET } from "../../contracts/tokens/NET.sol";

contract NETTest is Test {
    NET internal net;
    address internal user = makeAddr("user");

    function setUp() public {
        net = new NET();
    }

    function test_InitialState() public view {
        assertEq(net.name(), "The net is vast and infinite");
        assertEq(net.symbol(), "NET");
        assertEq(net.cap(), 1000000000 ether);
        assertEq(net.totalSupply(), 0);
        assertEq(net.owner(), address(this));
    }

    function test_Mint_Burn() public {
        net.mint(user, 1 ether);
        assertEq(net.balanceOf(user), 1 ether);
        assertEq(net.totalSupply(), 1 ether);

        net.burn(user, 0.4 ether);
        assertEq(net.balanceOf(user), 0.6 ether);
        assertEq(net.totalSupply(), 0.6 ether);
    }

    function test_Mint_RevertIf_NotOwner() public {
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, user));
        vm.prank(user);
        net.mint(user, 1);
    }

    function test_Burn_RevertIf_NotOwner() public {
        net.mint(user, 1 ether);

        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, user));
        vm.prank(user);
        net.burn(user, 1 ether);
    }

    function test_RevertIf_MintBeyondCap() public {
        uint256 cap = net.cap();
        net.mint(user, cap);

        vm.expectRevert(abi.encodeWithSelector(ERC20Capped.ERC20ExceededCap.selector, cap + 1, cap));
        net.mint(user, 1);
    }
}
