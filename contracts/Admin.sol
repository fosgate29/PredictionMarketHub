pragma solidity ^0.4.11;

import "./Stoppable.sol";

contract Admin is Stoppable{
    
    address public admin;
    uint    public winOdds;
    uint    public multiplier;
    uint    public minimunBet;
    uint    public maximunBet;
    uint    public minimunBalance;
    
    uint256 constant public MAX_UINT256 =
    0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF;
    
    mapping (address => bool) public TrustedUserMapping;
    
    //log admin events
    event LogSetTrustedUser(address user, bool isTrustedUser);
    event LogWinOddsUpdated(address user, uint newWinOdsValue);
    event LogMultiplierUpdated(address user, uint newMultiplierValue);
    event LogMinimunBetUpdated(address user, uint newMinimunBetValue);
    event LogMaximunBetUpdated(address user, uint newMaximunBetValue);
    
    modifier onlyIfAdmin { require(msg.sender==admin); _; }
    modifier onlyIfTrustedUser{ require(TrustedUserMapping[msg.sender]==true); _; }
    modifier onlyIfPredictionMarketHasBalance{ require(this.balance>=minimunBalance); _; }

    //checks if user is trusted.
    //truested user can set answer to question
    function isUserTrusted(address user) 
        public 
        constant 
        returns(bool isTrustedUSer)
    {
        return TrustedUserMapping[user]==true;
    }
    
    //checks if user is admin. now, only owner can be admin
    //truested user can set answer to question
    function isAdmin(address user) 
        public 
        constant 
        returns(bool _isAdmin)
    {
        return user==admin;
    }
    
    //only owner can set if a user is trusted or not
    function setUserIsTrusted(address trustedUser, bool isTrusted)
        onlyIfAdmin
        public 
        returns(bool success)
    {
        TrustedUserMapping[trustedUser] = isTrusted;
        LogSetTrustedUser(trustedUser, isTrusted);
        
        return true;
    }
    
    //set win odds
    function setWinOdds(uint _winOdds)
        onlyIfAdmin
        public
        returns(bool success)
    {
        winOdds = _winOdds;
        return true;
    }
    
    function setMultiplier(uint _multiplier)
        onlyIfAdmin
        public
        returns(bool success)
    {
        multiplier = _multiplier;
        return true;
    }
    
    function setMinimunBet(uint _minimunBet)
        onlyIfAdmin
        public
        returns(bool sucess)
    {
        minimunBet = _minimunBet;
        return true;
    }
    
    function setMaximumBet(uint _maximunBet)
        onlyIfAdmin
        public
        returns(bool success)
    {
        maximunBet = _maximunBet;
        return true;
    }

    function setMinimunBalance(uint _minimunBalance)
        onlyIfAdmin
        public
        returns(bool success)
    {
        minimunBalance = _minimunBalance;
        return true;
    }
    
    function stringToUint(string s) 
        constant 
        returns (uint result) 
    {
        bytes memory b = bytes(s);
        uint i;
        result = 0;
        for (i = 0; i < b.length; i++) {
            uint c = uint(b[i]);
            if (c >= 48 && c <= 57) {
                result = result * 10 + (c - 48);
            }
        }
    }

}
