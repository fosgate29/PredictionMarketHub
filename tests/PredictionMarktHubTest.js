var PredictionMarketHub = artifacts.require("./PredictionMarketHub.sol");
var PredictionMarket = artifacts.require("./PredictionMarket.sol");

// Found here https://gist.github.com/xavierlepretre/88682e871f4ad07be4534ae560692ee6
web3.eth.getTransactionReceiptMined = function (txnHash, interval) {
  var transactionReceiptAsync;
  interval = interval ? interval : 500;
  transactionReceiptAsync = function(txnHash, resolve, reject) {
    try {
      var receipt = web3.eth.getTransactionReceipt(txnHash);
      if (receipt == null) {
        setTimeout(function () {
          transactionReceiptAsync(txnHash, resolve, reject);
        }, interval);
      } else {
        resolve(receipt);
      }
    } catch(e) {
      reject(e);
    }
  };

  return new Promise(function (resolve, reject) {
      transactionReceiptAsync(txnHash, resolve, reject);
  });
};

// Found here https://gist.github.com/xavierlepretre/afab5a6ca65e0c52eaf902b50b807401
var getEventsPromise = function (myFilter, count) {
  return new Promise(function (resolve, reject) {
    count = count ? count : 1;
    var results = [];
    myFilter.watch(function (error, result) {
      if (error) {
        reject(error);
      } else {
        count--;
        results.push(result);
      }
      if (count <= 0) {
        resolve(results);
        myFilter.stopWatching();
      }
    });
  });
};

// Found here https://gist.github.com/xavierlepretre/d5583222fde52ddfbc58b7cfa0d2d0a9
var expectedExceptionPromise = function (action, gasToUse) {
  return new Promise(function (resolve, reject) {
      try {
        resolve(action());
      } catch(e) {
        reject(e);
      }
    })
    .then(function (txn) {
      return web3.eth.getTransactionReceiptMined(txn);
    })
    .then(function (receipt) {
      // We are in Geth
      assert.equal(receipt.gasUsed, gasToUse, "should have used all the gas");
    })
    .catch(function (e) {
      if ((e + "").indexOf("invalid opcode") > -1) {
        // We are in TestRPC
      } else {
        throw e;
      }
    });
};

contract('PredictionMarketHub', function(accounts) {


  var contract;

  var account0 = accounts[0];
  var owner = account0;
  var account1 = accounts[1];  

  var betValue = web3.toWei(1, 'ether');

  var question_text = "Is it going to rain on 10/10/2017?";


  beforeEach(function() {
    return PredictionMarketHub.new({from:owner})
    .then(function(instance) {
      contract = instance;
    })
  });

  it("...should create a new Prediction Market", function() {
      return contract.createPredictionMarket(1,1,1,9999, {from: accounts[0], gas:3000000})
        .then(function(tx) {            
            var address = tx.logs[0].args.newPredictionMarket;
            return contract.getPredictionMarketCount.call({from: accounts[0], gas:3000000})            
            .then(function(num){
              assert.equal(num.toString(10),1, "Prediction Market wasn't created correctly");
              return contract.predictionMarketExists(address)
              .then(function(success){
                assert.isTrue(success, "Prediciton Market doesn't exist")
              });
            })           
      });
  });

  it("...should stop and start again a new Prediction Market", function() {
      return contract.createPredictionMarket(1,1,1,9999, {from: accounts[0], gas:3000000})
        .then(function(tx) {
            var address = tx.logs[0].args.newPredictionMarket;
            return contract.stopPredictionMarket.call(address, {from: accounts[0], gas:3000000})            
            .then(function(stopOk){
              assert.isTrue(stopOk, "Prediction Market didn't stop"); 
              return contract.startPredictionMarket.call(address, {from: accounts[0], gas:3000000})            
              .then(function(startOk){
                assert.isTrue(startOk, "Prediction Market didn't start"); 
              })
            })                    
      });
  });


  it("...should check isAdmin.", function() {
      return contract.createPredictionMarket( 1,1,1,9999, {from: accounts[2], gas:3000000})
        .then(function(tx) {            
            var address = tx.logs[0].args.newPredictionMarket;
            var abi = PredictionMarket.abi;          
            return  web3.eth.contract(abi).at(address, function (err, pm_contract) {
              return pm_contract.isAdmin.call(accounts[2], (error, isAdmin) => {
                assert.isTrue(isAdmin, "Account 2 is not Admin");
                return pm_contract.isAdmin.call(accounts[0], (error, isNotAdmin) => {
                  assert.isFalse(isNotAdmin, "Account 0 is Admin");
                })
               })              
            })     
      });
  });

  it("...should add a question, bet and withdrawn.", function() {
      return contract.createPredictionMarket( 1,1,1,9999, {from: accounts[0], gas:3000000})
        .then(function(tx) {            
            var address = tx.logs[0].args.newPredictionMarket;
            var abi = PredictionMarket.abi;       
            return  web3.eth.contract(abi).at(address, function (err, pm_contract) {
              return pm_contract.addQuestion(60,{from: accounts[0], gas:3000000} , (error, success) => {
                return pm_contract.addQuestion(10,{from: accounts[0], gas:3000000} , (error, success) => {
                  return pm_contract.questionIdAt(0, (err, q) => { 
                    var questionId = q; 
                    return pm_contract.getQuestionsCount.call( (err, num) =>{ 
                      assert.equal(num, 2, "Question count isn't 2.") 
                      return pm_contract.bet(questionId, true, {from: accounts[1], value:90000000000, gas:3000000}, (error, betOk) => { 
                        assert.isOk(betOk, "Bet wasn't made."); 
                        return pm_contract.bet(2, true, {from: accounts[2], value:55555555, gas:3000000}, (error, bet2Ok) => { 
                          var user2Balance_Initial = web3.eth.getBalance(accounts[2]).toNumber();
                          assert.isOk(betOk, "Bet wasn't made.") ;
                          return pm_contract.closeQuestionForBets(2, {from: accounts[0], gas:3000000}, (error, questionIsClosed) => { 
                            return pm_contract.setQuestionAnswer(2, {from: accounts[0], gas:3000000}, (error, answerOk) => { 
                              assert.isOk(answerOk, "Question wasn't answered.") ;
                              return pm_contract.withdrawBet(2, {from: accounts[2], gas:3000000}, (error, withdrawOk) => { 
                                var user2Balance_afterWithdraw = web3.eth.getBalance(accounts[2]).toNumber();
                                assert.isAbove(user2Balance_afterWithdraw, user2Balance_Initial , "Withdrawn wasn't made.") ;
                              })
                            })
                          })
                        })
                      })
                    })
                  }) 
                })    
              })
            })     
      });
  });

  it("...should add a trusted user and trusted user answer the question.", function() {
      return contract.createPredictionMarket( 1,1,1,9999, {from: accounts[0], gas:3000000})
        .then(function(tx) {            
            var address = tx.logs[0].args.newPredictionMarket;
            var abi = PredictionMarket.abi;       
            return  web3.eth.contract(abi).at(address, function (err, pm_contract) {
              return pm_contract.addQuestion(60,{from: accounts[0], gas:3000000} , (error, success) => {
                var questionId = 1; //it is incremental
                return pm_contract.setUserIsTrusted(accounts[1], true, {from: accounts[0], gas:3000000}, (error, userTrustedOk) => { 
                  assert.isOk(userTrustedOk);
                  return pm_contract.isUserTrusted.call(accounts[1], {from: accounts[1], gas:3000000}, (error, isUserTrusted) => { 
                    assert.isTrue(isUserTrusted, "Account[1] is not trusted.");
                    return pm_contract.closeQuestionForBets(questionId, {from: accounts[1], gas:3000000}, (error, questionIsClosed) => { 
                      return pm_contract.setQuestionAnswer(questionId, {from: accounts[1], gas:3000000}, (error, answerOk) => { 
                        assert.isOk(answerOk, "Answer wasn't set.");
                        return pm_contract.QuestionsMapping.call(questionId, {from: accounts[1], gas:3000000}, (error, question) => { 
                          var resultRoll = question[1].toString(10);
                          assert.isAbove(resultRoll,0, "Question answer is still zero");
                        })
                      })
                    })
                  })
                })   
              })
            })     
      });
  });

  it("...should fail if user tries to bet in a stopped Prediction Market", function() {
    return contract.createPredictionMarket( 1,1,10000,9999, {from: accounts[0], gas:3000000})
      .then(function(tx) {            
          var address = tx.logs[0].args.newPredictionMarket;
          var abi = PredictionMarket.abi;       
          return  web3.eth.contract(abi).at(address, function (err, pm_contract) {
            return pm_contract.addQuestion(60,{from: accounts[0], gas:3000000} , (error, success) => {
              var questionId = 1; //it is incremental
              return contract.stopPredictionMarket(address, {from: accounts[0], gas:3000000})            
              .then(function(txs){
                var switchOff = txs.logs[1].args.switchSetting;
                assert.isFalse(switchOff, "Prediction Market didn't stop");                 
                 return expectedExceptionPromise(function () {
                    return pm_contract.bet(questionId, true, {from: accounts[2], value:1 ,gas:3000000});     
                      },
                  3000000);
              })   
            })
          })     
    });
  });

})
