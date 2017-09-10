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
      return contract.createPredictionMarket(1,1,1,9999, {from: accounts[0]})
        .then(function(tx) {            
            var address = tx.logs[0].args.newPredictionMarket;
            return contract.getPredictionMarketCount.call({from: accounts[0]})            
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
      return contract.createPredictionMarket(1,1,1,9999, {from: accounts[0]})
        .then(function(tx) {
            var address = tx.logs[0].args.newPredictionMarket;
            return contract.stopPredictionMarket.call(address, {from: accounts[0]})            
            .then(function(stopOk){
              assert.isTrue(stopOk, "Prediction Market didn't stop");  
              return contract.startPredictionMarket.call(address, {from: accounts[0]})  
              .then(function(startOk){
                assert.isTrue(startOk, "Prediction Market didn't start");
              })            
            })           
      });
  });


  it("...should check isAdmin.", function() {
      return contract.createPredictionMarket(1,1,1,9999, {from: accounts[0]})
        .then(function(tx) {            
            var address = tx.logs[0].args.newPredictionMarket;
            var abi = PredictionMarket.abi;          
            return  web3.eth.contract(abi).at(address, function (err, pm_contract) {
              return contract.owner.call()
               .then(function(hub_owner ){
                console.log('Hub owner: ' + hub_owner);  
                return pm_contract.owner((error, pm_owner) => {
                    console.log("PM  owner: "+pm_owner);
                 })              
              })
            })     
      });
  });


})
