// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import { IERC20 } from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";

interface IMummyRouter {
    function swap(address[] memory _path, uint256 _amountIn, uint256 _minOut, address _receiver) external;
}

// forked GMX
abstract contract MummyRouterMixin {
    // https://docs.mummy.finance/contracts
    // https://github.com/mummy-finance/mummy-contracts/blob/master/contracts/core/Router.sol
    address constant MUMMY_ROUTER = 0x68d1CA32Aee9a73534429D8376743Bf222ff1870;

    // internal

    function _swapOnMummyRouter(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOutMinimum,
        address recipient
    ) internal returns (uint256) {
        IERC20(tokenIn).approve(MUMMY_ROUTER, amountIn);

        uint256 tokenOutBalanceBefore = IERC20(tokenOut).balanceOf(recipient);

        address[] memory path = new address[](2);
        path[0] = tokenIn;
        path[1] = tokenOut;
        IMummyRouter(MUMMY_ROUTER).swap(path, amountIn, amountOutMinimum, recipient);

        return IERC20(tokenOut).balanceOf(recipient) - tokenOutBalanceBefore;
    }
}
