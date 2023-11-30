// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

interface IFlashLoan {
    function flashLoan(
        IFlashLoanRecipient recipient,
        address[] memory tokens,
        uint256[] memory amounts,
        bytes memory userData
    ) external;
}

interface IFlashLoanRecipient {
    function receiveFlashLoan(
        address[] memory tokens,
        uint256[] memory amounts,
        uint256[] memory feeAmounts,
        bytes memory userData
    ) external;
}

abstract contract BeethovenFlashLoanMixin {
    // https://docs.beets.fi/technicals/deployments
    // https://github.com/beethovenxfi/balancer-v2-monorepo/blob/master/pkg/vault/contracts/FlashLoans.sol
    address constant BEETHOVEN_VAULT = 0xBA12222222228d8Ba445958a75a0704d566BF2C8;

    function _flashloanFromBeethoven(address token, uint256 amount, bytes memory callbackData) internal {
        address[] memory tokens = new address[](1);
        tokens[0] = token;

        uint256[] memory amounts = new uint256[](1);
        amounts[0] = amount;

        IFlashLoan(BEETHOVEN_VAULT).flashLoan(IFlashLoanRecipient(address(this)), tokens, amounts, callbackData);
    }
}
