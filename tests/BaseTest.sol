// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "forge-std/Test.sol";

contract BaseTest is Test {
    // function test_excludeFromCoverageReport() public virtual {
    //     // workaround: https://github.com/foundry-rs/foundry/issues/2988#issuecomment-1437784542
    // }

    function _enableInitialize(address account) internal {
        // We assume Initializable is always at the top of the inheritance chain, so `_initialized` is always in slot 0.
        bytes32 _slotInitialized = bytes32(uint256(0));
        vm.store(account, _slotInitialized, bytes32(uint256(0)));
    }
}
