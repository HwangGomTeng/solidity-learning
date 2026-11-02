// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

abstract contract MultiManagedAccess {
    uint256 public constant MIN_MANAGERS = 3;

    address public owner;
    address[] public managers;
    mapping(address => bool) public isManager;
    mapping(address => bool) public confirmed;

    constructor(address _owner, address[] memory _managers) {
        require(
            _managers.length >= MIN_MANAGERS,
            "At least 3 managers required"
        );
        owner = _owner;
        for (uint256 i = 0; i < _managers.length; i++) {
            require(!isManager[_managers[i]], "Duplicated manager");
            isManager[_managers[i]] = true;
            managers.push(_managers[i]);
        }
    }

    modifier onlyAllConfirmed() {
        require(isManager[msg.sender], "You are not a manager");
        require(_allConfirmed(), "Not all confirmed yet");
        _resetConfirmed();
        _;
    }

    function confirm() external {
        require(isManager[msg.sender], "You are not a manager");
        confirmed[msg.sender] = true;
    }

    function _allConfirmed() internal view returns (bool) {
        for (uint256 i = 0; i < managers.length; i++) {
            if (!confirmed[managers[i]]) return false;
        }
        return true;
    }

    function _resetConfirmed() internal {
        for (uint256 i = 0; i < managers.length; i++) {
            confirmed[managers[i]] = false;
        }
    }
}
