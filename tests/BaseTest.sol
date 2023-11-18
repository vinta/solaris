// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import { IERC20 } from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";

import "forge-std/Test.sol";

contract BaseTest is Test {
    function test_excludeFromCoverageReport() public virtual {
        // workaround: https://github.com/foundry-rs/foundry/issues/2988#issuecomment-1437784542
    }

    // internal

    function _dealAndApprove(address token, uint256 amount, address account, address spender) internal {
        deal(token, account, amount);
        vm.prank(account);
        IERC20(token).approve(spender, amount);
    }
}
