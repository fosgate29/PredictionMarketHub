pragma solidity ^0.4.11;

import "./Admin.sol";
import "./SafeMath.sol";
import "./usingOraclize.sol";

contract PredictionMarket is Admin, SafeMath, usingOraclize{
 
    uint    public initialFund;
    
    uint[]  public questionsIds;
    uint    public questionIdWaitingForAnswer;
    
    struct QuestionStruct {
        uint firstRoll;  //first number that Oraclizeit sent
        uint resultRoll; //result to compare with the 
        bool isWaitingForAnswer; //if a query to oraclezit is sent, set this value to true and wait for the answer
        bool isOpenForBets;
    }
    
    struct UserBet {
        bool userBetAnswer; //if it is greater than the first roll
        uint betValue;
        uint multiplier;
        uint profit;
    }
    
    mapping (uint => QuestionStruct) public QuestionsMapping;
    mapping (bytes32 => UserBet)     public BetsMapping;

    //Log question events
    event LogQuestionAdded(address user,  uint id, uint firstRoll, uint resultRoll, 
                           bool isWaitingForAnswer, bool isOpenForBets);
    event LogQuestionIsAnswered(address user, uint id, uint answer);
    event LogQuestionIsWaitingForRandomNumber(address sender, uint questionId);
    event LogQuestionIsClosedForNewBets(address sender, uint questionId, bool isOpenForBets);
    
    //log bets events
    event LogBetIsPlaced(address staker, bytes32 betId, uint questionId, bool answerBet, uint betAmount);
    event LogBetWithdrawn(address user, bytes32 betId, 
                uint questionId, uint profit, bool questionAnswer, bool userAnswer);

    event LogFundsReceived(address sender, uint value);
    
    event LogOraclizeQuery(string description);
    event LogRandomNumber(string _randomNumber);
    
    //Constructor
    //_multiplier = number of wei that will earn
    function PredictionMarket(address _admin, uint _winOdds , uint _multiplier, 
                              uint _minimunBet, uint _maximunBet)
    {
        TrustedUserMapping[_admin] = true; //owner is trusted
        LogSetTrustedUser(_admin, true);

        admin           = _admin;

        winOdds         = _winOdds;
        multiplier      = _multiplier;
        minimunBet      = _minimunBet;
        maximunBet      = _maximunBet;
        maximunBet      = MAX_UINT256;  //to avoid problems during tests
        minimunBalance  = 0;  //it is defaul for now
    }
    
    //Add a question
    function addQuestion(uint initialRandomNumber) 
        onlyIfAdmin
        onlyIfRunning
        onlyIfPredictionMarketHasBalance
        public
        returns(bool success) 
    {
        uint questionId = add(getQuestionsCount(),1) ;
         
        questionsIds.push(questionId);
        
        QuestionsMapping[questionId] = QuestionStruct({
            firstRoll : initialRandomNumber,  //
            resultRoll : 0, //default value,
            isWaitingForAnswer: false,
            isOpenForBets: true
        });
        
        LogQuestionAdded(msg.sender, questionId, QuestionsMapping[questionId].firstRoll, 
                     QuestionsMapping[questionId].resultRoll , QuestionsMapping[questionId].isWaitingForAnswer,
                     QuestionsMapping[questionId].isOpenForBets);
        
        return true;
    }
    
    //to avoid the answer be available in the blockchain while question is open for bets,
    //we have to close it for bets first before requesting a random number
    function closeQuestionForBets(uint questionId) 
        onlyIfRunning
        onlyIfTrustedUser
        public
        returns(bool success) 
    {
        require(QuestionsMapping[questionId].firstRoll > 0);  //question exists
        require(QuestionsMapping[questionId].resultRoll==0);  //question is not answered
        require(QuestionsMapping[questionId].isWaitingForAnswer  == false);
        require(QuestionsMapping[questionId].isOpenForBets); 

        QuestionsMapping[questionId].isOpenForBets = false;

        LogQuestionIsClosedForNewBets(msg.sender, questionId, QuestionsMapping[questionId].isOpenForBets);

        return true;
    }

    //you can set question answer just once
    //it is payable because of the Oraclizeit
    function setQuestionAnswer(uint questionId) 
        onlyIfRunning
        onlyIfTrustedUser
        public
        payable
        returns(bool success) 
    {
        //can´t set a quetion answer if another question is waiting for an answer
        require(questionIdWaitingForAnswer == 0);
        
        //here we are going to use Oraclizeit to get a random number
        //since the number needs to get mined and it can take a long time,
        //we need to stop new betings and wait for the random number
        require(QuestionsMapping[questionId].firstRoll > 0); //question exist
        require(QuestionsMapping[questionId].resultRoll==0);  //question is not answered
        require(!QuestionsMapping[questionId].isOpenForBets); //before get an answer, question must be closed for new bets and avoid attacks!                
        require(QuestionsMapping[questionId].isWaitingForAnswer  == false);

        QuestionsMapping[questionId].isWaitingForAnswer = true;
        questionIdWaitingForAnswer = questionId;
        
        if(!startQuestionAnswerProcess()) revert();

        LogQuestionIsWaitingForRandomNumber(msg.sender, questionId);
        
        return true;
    }
 
    function startQuestionAnswerProcess() 
        onlyIfRunning
        onlyIfTrustedUser
        payable
        returns(bool success)
    {
        LogOraclizeQuery("Oraclize query was sent, standing by for the answer..");
        oraclize_query("WolframAlpha", "random number between 1 and 100");      

        return true;
    }
          
    function __callback(bytes32 myid, string result)
    {
        require(msg.sender == oraclize_cbAddress());
        
        LogRandomNumber(result);
        
        //First, clean the waiting id. 
        //If the question doesn´t pass the requires below,
        //it would have cleaned the question id already for safety.
        //it should not run if the question id doesn´t pass the requires above.
        uint questionId = questionIdWaitingForAnswer;
        questionIdWaitingForAnswer = 0;
        
        require(QuestionsMapping[questionId].firstRoll > 0); //question exist
        require(QuestionsMapping[questionId].resultRoll==0);  //question is not answered
        require(!QuestionsMapping[questionId].isOpenForBets); //wont't hurt another check        
        require(QuestionsMapping[questionId].isWaitingForAnswer  == true);
        
        QuestionsMapping[questionId].isWaitingForAnswer = false;

        uint _result = stringToUint(result);  //convert string to uint

        QuestionsMapping[questionId].resultRoll = _result;
        
        LogQuestionIsAnswered(msg.sender, questionId, _result);
    }
    
    function questionIdAt(uint index)
        public
        constant
        returns (uint id) 
    {
        return questionsIds[index];
    }
    
    function getQuestionsCount() 
        public
        constant 
        returns (uint length) 
    {
        return questionsIds.length; 
    }
    
    function getUserBet(uint questionId)
        public
        constant
        returns(uint _betValue, bool _userAnswer, uint multiplier, uint _profit)
    {
        bytes32 betId = getBetId(msg.sender, questionId);        

        return(BetsMapping[betId].betValue, BetsMapping[betId].userBetAnswer,
                  BetsMapping[betId].multiplier, BetsMapping[betId].profit);
    }

    //regular user can bet
    function bet(uint questionId, bool betAnswer) 
        onlyIfPredictionMarketHasBalance
        onlyIfRunning
        public
        payable
        returns(bool success) 
    {
        require(msg.value!=0); //no zero bettings
        require(msg.value>=minimunBet);
        require(msg.value<=maximunBet);
        require(QuestionsMapping[questionId].firstRoll > 0);  //question exists
        require(QuestionsMapping[questionId].resultRoll == 0);
        require(QuestionsMapping[questionId].isOpenForBets);  //if it is closed, question can receive
                                                              // an ansnwer. This flag will avoid the answer 
                                                              // be available in the blockchain and an attacker
                                                              // could make a bet before then answer is mined
        
        
        bytes32 betId = getBetId(msg.sender, questionId);
        
        //can t bet again
        require(BetsMapping[betId].betValue == 0);
        
        UserBet memory newBet;
        newBet.userBetAnswer = betAnswer;
        newBet.betValue = msg.value;
         
        BetsMapping[betId] = newBet;
        
        //remember, question is: is second rol number going to be greater than x?
        
        LogBetIsPlaced(msg.sender, betId, questionId, betAnswer, msg.value);
        
        return true;
    }
    
    function withdrawBet(uint questionId) 
        onlyIfRunning
        public         
        returns(bool success)
    {
        require(QuestionsMapping[questionId].firstRoll>0);
        require(QuestionsMapping[questionId].resultRoll>0);
        require(!QuestionsMapping[questionId].isOpenForBets); //wont't hurt another check
        
        bytes32 betId = getBetId(msg.sender, questionId);
        
        //if profit is zero, user has not been paid yet
        require(BetsMapping[betId].profit == 0);  
        
        //question exist, it is already answered, user has a bet and is not paid yet
        //so, check if user bet in the correct answer
        //Is first number greater than the second roll number?
        bool questionAnswer = QuestionsMapping[questionId].resultRoll > QuestionsMapping[questionId].firstRoll;
        
        //is second number greater than the firs?
        //
        //if firs = 4 and second = 67, 67 > 4 - true
        //if user said true, pay. if false , dont pay
        //if first = 80 and second = 67, 67 > 80 - false
        //if user said true, dont pay, if false , dont pay.

        if(BetsMapping[betId].userBetAnswer == questionAnswer ){

            //if it is the correct answer, reward the user
            BetsMapping[betId].multiplier = multiplier;
            uint _profit = add(BetsMapping[betId].betValue, BetsMapping[betId].multiplier);

            BetsMapping[betId].profit = _profit;
            
            msg.sender.transfer(_profit);
             
            LogBetWithdrawn(msg.sender, betId, questionId, _profit , questionAnswer , BetsMapping[betId].userBetAnswer);
        }
        else{
            revert(); //user didn´t bet on the right answer and should not have called this function
        }
        
        return true;
    }
    
    function getBetId(address user, uint questionId)
        public
        constant
        returns(bytes32 betId)
    {
        return sha3(user,questionId);    
    }
    
    
    //kill the contract and return all remain funds to the contract owner
    function killMe() 
        onlyOwner
        returns (bool success) 
    {
        selfdestruct(owner);
        return true;
    }

}
