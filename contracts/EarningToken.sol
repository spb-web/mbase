// SPDX-License-Identifier: MIT
pragma solidity 0.8.12;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract EarningToken is ERC20 {
  constructor() ERC20("Mars Base", "MBase") {
    _mint(_msgSender(), 300000000 ether);
  }
}
