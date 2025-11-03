// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "forge-std/Test.sol";

import { Ownable } from "openzeppelin-contracts-v5.4.0/contracts/access/Ownable.sol";
import { ERC20Capped } from "openzeppelin-contracts-v5.4.0/contracts/token/ERC20/extensions/ERC20Capped.sol";
import { ERC20Permit } from "openzeppelin-contracts-v5.4.0/contracts/token/ERC20/extensions/ERC20Permit.sol";

import { NET } from "../../contracts/tokens/NET.sol";

contract NETTest is Test {
    NET internal net;
    address internal user = makeAddr("user");

    uint256 internal ownerPrivateKey = 0xA11CE;
    address internal owner;
    uint256 internal spenderPrivateKey = 0xB0B;
    address internal spender;

    function setUp() public {
        owner = vm.addr(ownerPrivateKey);
        spender = vm.addr(spenderPrivateKey);
        net = new NET(address(this));
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

    function test_Permit() public {
        uint256 value = 1000 ether;
        uint256 deadline = block.timestamp + 1 days;
        uint256 nonce = net.nonces(owner);

        bytes32 structHash = keccak256(
            abi.encode(
                keccak256("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)"),
                owner,
                spender,
                value,
                nonce,
                deadline
            )
        );

        bytes32 domainSeparator = net.DOMAIN_SEPARATOR();
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", domainSeparator, structHash));

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(ownerPrivateKey, digest);

        assertEq(net.allowance(owner, spender), 0);
        assertEq(net.nonces(owner), 0);

        net.permit(owner, spender, value, deadline, v, r, s);

        assertEq(net.allowance(owner, spender), value);
        assertEq(net.nonces(owner), 1);
    }

    function test_Permit_RevertIf_ExpiredDeadline() public {
        uint256 value = 1000 ether;
        uint256 deadline = block.timestamp - 1;
        uint256 nonce = net.nonces(owner);

        bytes32 structHash = keccak256(
            abi.encode(
                keccak256("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)"),
                owner,
                spender,
                value,
                nonce,
                deadline
            )
        );

        bytes32 domainSeparator = net.DOMAIN_SEPARATOR();
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", domainSeparator, structHash));

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(ownerPrivateKey, digest);

        vm.expectRevert(abi.encodeWithSelector(ERC20Permit.ERC2612ExpiredSignature.selector, 0));
        net.permit(owner, spender, value, deadline, v, r, s);
    }

    function test_Permit_RevertIf_InvalidSignature() public {
        uint256 value = 1000 ether;
        uint256 deadline = block.timestamp + 1 days;
        uint256 nonce = net.nonces(owner);

        bytes32 structHash = keccak256(
            abi.encode(
                keccak256("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)"),
                owner,
                spender,
                value,
                nonce,
                deadline
            )
        );

        bytes32 domainSeparator = net.DOMAIN_SEPARATOR();
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", domainSeparator, structHash));

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(spenderPrivateKey, digest);

        vm.expectRevert(abi.encodeWithSelector(ERC20Permit.ERC2612InvalidSigner.selector, spender, owner));
        net.permit(owner, spender, value, deadline, v, r, s);
    }

    function test_Permit_RevertIf_InvalidNonce() public {
        uint256 value = 1000 ether;
        uint256 deadline = block.timestamp + 1 days;
        uint256 wrongNonce = 1;

        bytes32 structHash = keccak256(
            abi.encode(
                keccak256("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)"),
                owner,
                spender,
                value,
                wrongNonce,
                deadline
            )
        );

        bytes32 domainSeparator = net.DOMAIN_SEPARATOR();
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", domainSeparator, structHash));

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(ownerPrivateKey, digest);

        vm.expectPartialRevert(ERC20Permit.ERC2612InvalidSigner.selector);
        net.permit(owner, spender, value, deadline, v, r, s);
    }
}
