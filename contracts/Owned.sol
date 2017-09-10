pragma solidity ^0.4.11;

contract Owned {
    address public owner;
    
    event LogNewOwner(address sender, address oldOwner, address newOwner);
    
    modifier onlyOwner { 
        if(msg.sender != owner) revert();
        _; 
    }
    
    function Owned() {
        owner = msg.sender;
    }
    
    function changeOwner(address newOwner)
        onlyOwner
        returns(bool success)
    {
        require(newOwner > 0);
        LogNewOwner(msg.sender, owner, newOwner);
        owner = newOwner;
        return true;
    }
}
