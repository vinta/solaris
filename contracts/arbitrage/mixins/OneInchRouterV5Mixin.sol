// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import { IERC20 } from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";

abstract contract OneInchRouterV5Mixin {
    // https://optimistic.etherscan.io/address/0x1111111254eeb25477b68fb85ed929f73a960582#code
    // https://github.com/1inch/limit-order-protocol-utils/blob/master/src/limit-order-protocol.const.ts
    address public constant ONEINCH_AGGREGATION_ROUTER_V5 = address(0x1111111254EEB25477B68fb85Ed929f73A960582);

    error SwapFail();

    // internal

    function _swapOnOneInchRouterV5(
        address,
        address tokenOut,
        uint256,
        bytes calldata oneInchData
    ) internal returns (uint256) {
        uint256 tokenOutBalanceBefore = IERC20(tokenOut).balanceOf(address(this));

        (bool success, ) = ONEINCH_AGGREGATION_ROUTER_V5.call{ value: 0 }(oneInchData);
        if (!success) {
            // ex: due to slippage
            revert SwapFail();
        }

        uint256 tokenOutBalanceAfter = IERC20(tokenOut).balanceOf(address(this));

        return tokenOutBalanceAfter - tokenOutBalanceBefore;
    }
}
