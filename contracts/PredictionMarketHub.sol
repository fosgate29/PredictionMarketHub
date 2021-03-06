pragma solidity ^0.4.11;

 
import "./PredictionMarket.sol";

contract PredictionMarketHub is Stoppable{
    
    address[] public predictionMarkets;
    mapping(address => bool) public predictionMarketExists;
    
    event LogNewPredictionMarket(address owner, address admin, address newPredictionMarket, 
                                  uint winOdds, uint multiplier, uint minimunBet, uint maximunBet);
    event LogPredictionMarketStopped(address sender, address predictionMarket);
    event LogPredictionMarketStarted(address sender, address predictionMarket);
    event LogPredictionMarketNewOwner(address sender, address predictionMarket, address newOwner);
    
    modifier onlyIfPredictionMarket(address predictionMarket) {
        require(predictionMarketExists[predictionMarket] == true);
        _;
    }

    function getPredictionMarketCount()
        public
        constant
        returns(uint predictionMarketCount)
    {
        return predictionMarkets.length;
    }
    
    function createPredictionMarket(uint winOdds, uint multiplier, uint minimunBet, uint maximunBet)
        public
        returns(address campaignContract)
    {
        PredictionMarket trustedPredictionMarket;   //sempre marcar como trusted o contrato que vc conhece
                                                    //ajuda na hora do code review
        trustedPredictionMarket = new PredictionMarket( msg.sender, winOdds, multiplier, 
                                               minimunBet, maximunBet);
        predictionMarkets.push(trustedPredictionMarket);
        predictionMarketExists[trustedPredictionMarket] = true;

        //Hub contract is the owner and admin is who sent the msg
        LogNewPredictionMarket(owner, msg.sender, trustedPredictionMarket, winOdds, 
                                        multiplier, minimunBet, maximunBet);
        return trustedPredictionMarket;
    }
    
    function stopPredictionMarket(address predictionMarket)
        onlyOwner
        onlyIfPredictionMarket(predictionMarket)
        returns(bool success) 
    {
        PredictionMarket trustedPredictionMarket = PredictionMarket(predictionMarket);
        LogPredictionMarketStopped(msg.sender, predictionMarket);
        return (trustedPredictionMarket.runSwitch(false));
    }
    
    function startPredictionMarket(address predictionMarket)
        onlyOwner
        onlyIfPredictionMarket(predictionMarket)
        returns(bool success)
    {
        PredictionMarket trustedPredictionMarket = PredictionMarket(predictionMarket);
        LogPredictionMarketStarted(msg.sender, predictionMarket);
        return (trustedPredictionMarket.runSwitch(true));
    }
    
    function changePredictionMarketOwner(address predictionMarket, address newOwner)
        onlyOwner
        onlyIfPredictionMarket(predictionMarket)
        returns(bool success)
    {
        PredictionMarket trustedPredictionMarket = PredictionMarket(predictionMarket);
        LogPredictionMarketNewOwner(msg.sender, predictionMarket , newOwner);
        return (trustedPredictionMarket.changeOwner(newOwner));
    }
    
    
}
