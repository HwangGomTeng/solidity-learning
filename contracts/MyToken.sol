//Token : smart contract based
//BTC, ETH, XRP, KAIA : native token
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract MyToken {
    string public name;
    string public symbol;
    uint8 public decimals; //1 wei ---> 1*10^-18
    // uint8 ---> 8bit unsigned int, uint16,... uint256

    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;

    constructor(
        string memory _name,
        string memory _symbol,
        uint8 _decimals,
        uint256 _amount
    ) {
        name = _name;
        symbol = _symbol;
        decimals = _decimals;
        _mint(_amount * 10 ** uint256(decimals), msg.sender); // 0이 17개 = 10^17
    }
    //transaction
    //from, to , data, value, gas...

    function _mint(uint256 amount, address owner) internal {
        totalSupply += amount;
        balanceOf[owner] += amount;
    }

    function transfer(uint256 amount, address to) external {
        require(balanceOf[msg.sender] >= amount, "insufficient balance");
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
    }

    //function totalSupply() external view returns (uint256){
    //    return totalSupply;
    // }

    //runction balanceOf(address owner) exteranl view returns (uint256){
    //    return balanceOf[owner];
    //}

    //function name() external view returns(string memory){
    //    return name;
    //}
}

//
