// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "forge-std/Test.sol";

contract BaseTest is Test {
    function test_excludeFromCoverageReport() public virtual {
        // workaround: https://github.com/foundry-rs/foundry/issues/2988#issuecomment-1437784542
    }
}
