pragma solidity ^0.4.11;

import "./Owned.sol";

contract Stoppable is Owned{
    
    bool public running;
    
    event LogRunSwitch(address sender, bool switchSetting);
    
    modifier onlyIfRunning  
    { 
        if(!running) revert(); 
        _; 
    }

    function Stoppable(){
        running = true;
    }
    
    function runSwitch(bool onOff)
        public
        onlyOwner
        returns(bool sucess)
    {
        running = onOff;
        LogRunSwitch(msg.sender, onOff);
        return true;
    }
}
