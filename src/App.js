import React, { Component } from 'react'
import PredictionMarketHubContract from '../build/contracts/PredictionMarketHub.json'
import PredictionMarketContract from '../build/contracts/PredictionMarket.json'
import getWeb3 from './utils/getWeb3'

import './css/oswald.css'
import './css/open-sans.css'
import './App.css'

class App extends Component {

  constructor(props) {
    super(props)

    this.state = {
      isHubOwner: false,
      isAdmin: false,
      isUserTrusted: false,
      newPredictionMarketWinOdds:"",
      newPredictionMarketMultiplier:"",
      newPredictionMarketMinimunValue:"",
      newPredictionMarketMaximunValue:"",
      instance:{},
      instancePredictionMarket:{},
      accounts:[],
      predictionMarkets:[],
      questionToSubmit:"",
      trustedUserAddress:"",
      questions:[],
      minimunBet:0,
      maximunBet:0,
      multiplier:0,
      betAmount:0,
      betAnswer:false,
      userBalance:0,
      hubContractBalance:0,
      contractBalance:0,
      predictionMarketSelected:"",
      timePassed:false,
      web3: null
    }

    this.addAQuestion = this.addAQuestion.bind(this);
    this.setTrustedUser = this.setTrustedUser.bind(this);
    this.addBet = this.addBet.bind(this);
    this.setQuestionAnswer = this.setQuestionAnswer.bind(this);
    this.withdrawBet = this.withdrawBet.bind(this);
    this.closeQuestionForBets = this.closeQuestionForBets(this);

    //hub action
    this.createPredictionMarket = this.createPredictionMarket.bind(this);
    this.upsertPredictionMarket = this.upsertPredictionMarket.bind(this);
  }


  componentWillMount() {
    // Get network provider and web3 instance.
    // See utils/getWeb3 for more info.

    getWeb3
    .then(results => {
      this.setState({
        web3: results.web3
      })

      // Instantiate contract once web3 provided.
      this.instantiateContract()
    })
    .catch(() => {
      console.log('Error finding web3.')
    })

  }

  //instantiate hub contract
  instantiateContract() {
    /*
     * SMART CONTRACT EXAMPLE
     *
     * Normally these functions would be called in the context of a
     * state management library, but for convenience I've placed them here.
     */

    const contract = require('truffle-contract')
    const predictionMarketHub = contract(PredictionMarketHubContract)
    predictionMarketHub.setProvider(this.state.web3.currentProvider)
  
    console.log(PredictionMarketContract);

    this.state.web3.eth.getAccounts((error, accounts) => {
      return predictionMarketHub.deployed()
            .then((instance) => {

              this.state.web3.eth.getBalance(accounts[0],(e,_userBalance) => {  
                this.setState({userBalance:_userBalance.toNumber()});
              });

              this.state.web3.eth.getBalance(instance.address,(e,_contractBalance) => {  
                this.setState({hubContractBalance:_contractBalance.toNumber()});
              });

              instance.owner()
                .then(owner_address => {
                  if(owner_address == this.state.accounts[0] ) {
                    this.setState({isHubOwner:true});
                  }
              })

              instance.getPredictionMarketCount()
                .then(predictionMarketCount => {
                  var numberOfPredictionMarkets = predictionMarketCount.toNumber();
                  var predictionMarkets_temp = [];
                  if(numberOfPredictionMarkets>0){
                    for(let i=0;i<numberOfPredictionMarkets;i++){                      
                        instance.predictionMarkets(i)
                          .then(_address => {
                              predictionMarkets_temp.push({address:_address});
                          })
                    }//end of for
                  }//end of if
                  
                  this.setState({predictionMarkets: predictionMarkets_temp});
              })

              this.setState({instance:instance, accounts:accounts})
              
            })


    })
    setTimeout(() => {this.setState({timePassed: true})}, 5000)
  }

  createPredictionMarket(event){
    event.preventDefault();
    return this.state.instance.createPredictionMarket(this.state.newPredictionMarketWinOdds, 
                                                      this.state.newPredictionMarketMultiplier,
                                                      this.state.newPredictionMarketMinimunValue,
                                                      this.state.newPredictionMarketMaximunValue,
                                                      {from:this.state.accounts[0] , gas: 3000000 })
            .then(tx => {
              console.log(tx.receipt);;
              console.log(tx.logs[0].args);

              var newPredictionMarketsArray = this.state.predictionMarkets.slice();
              newPredictionMarketsArray.push({ address:tx.logs[0].args.newPredictionMarket});
              this.setState({predictionMarkets: newPredictionMarketsArray});

              this.setState({newPredictionMarketWinOdds:""}); 
              this.setState({newPredictionMarketMultiplier:""});
              this.setState({newPredictionMarketMinimunValue:""});
              this.setState({newPredictionMarketMaximunValue:""});                               
            })
  }

  upsertPredictionMarket(event){
    var address = this.state.predictionMarketSelected;
    var predictionMarketContractInstance;

    const contract = require('truffle-contract')
    const predictionMarket = contract(PredictionMarketContract)

    predictionMarket.setProvider(this.state.web3.currentProvider)

    this.state.web3.eth.getAccounts((error, accounts) => {
      return predictionMarket.at(address)
        .then((instance) => {
            predictionMarketContractInstance = instance;
            this.setState({instancePredictionMarket:predictionMarketContractInstance});

            //clean previous questions lists
            this.setState({questions:[]});
            this.setState({isAdmin:false});
            this.setState({isUserTrusted:false});

            this.state.web3.eth.getBalance(instance.address,(e,_contractBalance) => {  
                this.setState({contractBalance:_contractBalance.toNumber()});
            });

            instance.isAdmin(accounts[0])
            .then(_isAdmin =>{
                console.log(_isAdmin);
                 this.setState({isAdmin:_isAdmin});
            });
            instance.isUserTrusted(accounts[0])
            .then(_isUserTrusted =>{
                 this.setState({isUserTrusted:_isUserTrusted});
            });

            instance.getQuestionsCount()
                .then(num => {
                     var numberOfQuestions = num.toNumber();
                     var questions_temp = [];
                     if(numberOfQuestions>0){
                       for(let i=0;i<numberOfQuestions;i++){
                         instance.questionIdAt(i)
                        .then(questionId => {
                          instance.QuestionsMapping(questionId)
                            .then(_question => {
                                var question = _question;
                                console.log(question);
                                //get user answer and bet amount
                                instance.getUserBet(questionId)
                                  .then(_userBet =>{
                                     questions_temp.push({                                     
                                          id:questionId.toString(10), 
                                          firstRoll:question[0].toNumber(),
                                          resultRoll:question[1].toNumber(),
                                          isWaitingForAnswer:question[2],
                                          isOpenForBets:question[3],
                                          amount:_userBet[0].toString(10),
                                          userAnswer:_userBet[1],
                                          profit: _userBet[3].toString(10)
                                    })                                     
                                });
                            });
                        })
                          .catch(err => console.log("Error getting questions..."))
                        }//end of for

                        this.setState({questions: questions_temp});
                      }//end of if
                });
      })
    });
    setTimeout(() => {this.setState({timePassed: true})}, 5000)
  }
     

  addAQuestion(event){
    event.preventDefault();
    return this.state.instancePredictionMarket.addQuestion(this.state.questionToSubmit, {from:this.state.accounts[0] , gas: 3000000 })
            .then(tx => {
              console.log(tx.receipt);
              console.log(tx.logs[0].args);
              this.setState({questionToSubmit:""});
              var newQuestionArray = this.state.questions.slice();

              newQuestionArray.push({ id:tx.logs[0].args.id.toString(10), 
                                  firstRoll:tx.logs[0].args.firstRoll.toNumber(),
                                  resultRoll:0,
                                  isWaitingForAnswer:false,
                                  isOpenForBets:true,
                                  amount:0,
                                  userAnswer:false,
                                  profit:0
                                });
              this.setState({questions: newQuestionArray});
            })   
  }

  setTrustedUser(event){
    event.preventDefault();
    return this.state.instancePredictionMarket.setUserIsTrusted(this.state.trustedUserAddress, true, {from:this.state.accounts[0] })
            .then(tx => {
              console.log(tx.receipt);
              this.setState({trustedUserAddress:""})
            })
  }

  addBet(questionId , questionInternalIndex){
    var betAnswerBoolean = this.state.betAnswer==="true" ? true : false;
    return this.state.instancePredictionMarket.bet(questionId, betAnswerBoolean, {from:this.state.accounts[0], value:this.state.betAmount, gas: 3000000})
            .then(tx => {
              console.log(tx);
              console.log(tx.logs[0].args);              
              this.state.questions[questionInternalIndex].amount = this.state.betAmount;
              this.state.questions[questionInternalIndex].userAnswer = betAnswerBoolean;
              this.setState({betAnswer:false});
              this.setState({betAmount:0});

              //refresh balance user
              this.state.web3.eth.getBalance(this.state.accounts[0],(e,_userBalance) => {  
                this.setState({userBalance:_userBalance.toNumber()});
              });

              //refresh contract balance
              this.state.web3.eth.getBalance(this.state.instancePredictionMarket.address,(e,_pmBalance) => {  
                this.setState({contractBalance:_pmBalance.toNumber()});
              });
            })
  }

  closeQuestionForBets(questionId, questionInternalIndex){
      return this.state.instancePredictionMarket.closeQuestionForBets(questionId, {from:this.state.accounts[0] , gas: 3000000})
            .then(tx => {
              console.log(tx);
              console.log(tx.logs[0].args);
              
              var newQuestionArray = this.state.questions.slice();
              newQuestionArray[questionInternalIndex].isOpenForBets = tx.logs[0].args.isOpenForBets;
              this.setState({questions:newQuestionArray});
            })
  }

  setQuestionAnswer(questionId, questionInternalIndex){
     return this.state.instancePredictionMarket.setQuestionAnswer(questionId, 
                             {from:this.state.accounts[0] , gas: 3000000})
            .then(tx => {
              console.log(tx);
              console.log(tx.logs[0].args);
              
              var newQuestionArray = this.state.questions.slice();
              newQuestionArray[questionInternalIndex].resultRoll = tx.logs[1].args.answer.toNumber();
              this.setState({questions:newQuestionArray});
            })
  }



  withdrawBet(questionId,questionInternalIndex){    
    return this.state.instancePredictionMarket.withdrawBet(questionId, {from:this.state.accounts[0], gas: 3000000})
            .then(tx => {
              console.log(tx.logs[0].args);

              var newQuestionArray = this.state.questions.slice();
              newQuestionArray[questionInternalIndex].profit = tx.logs[0].args.profit.toNumber();
              this.setState({questions:newQuestionArray});
            })
  }

  render() {

    let hubAdminScene = (this.state.isHubOwner || this.state.isAdmin )? (

               <div>
                  <h3>Prediction Market Hub - Here you can add Predictions Markets</h3>
                  <table>
                    <tr>
                      <td>
                        <form onSubmit={this.createPredictionMarket} >
                          <input value={this.state.newPredictionMarketWinOdds} placeholder="Win odds" onChange={e => this.setState({ newPredictionMarketWinOdds: e.target.value })}/>
                          <input value={this.state.newPredictionMarketMultiplier} placeholder="Multiplier" onChange={e => this.setState({ newPredictionMarketMultiplier: e.target.value })}/>
                          <input value={this.state.newPredictionMarketMinimunValue} placeholder="Minimun bet in Wei" onChange={e => this.setState({ newPredictionMarketMinimunValue: e.target.value })}/>
                          <input value={this.state.newPredictionMarketMaximunValue} placeholder="Maximun bet in Wei" onChange={e => this.setState({ newPredictionMarketMaximunValue: e.target.value })}/>
                          <button type="submit"> New Prediction Market </button>
                        </form>
                      </td>                      
                    </tr>
                  </table>                
              </div> ) : (<div></div>)

      

    let adminScene =  (this.state.isAdmin  )? (  
               <div>
                  <h3>Prediction Market Selected {this.state.instancePredictionMarket.address}. Balance (Wei): {this.state.contractBalance}</h3>
                  
                  <h2>Please add a random number between 1 and 100:</h2>
                  <form onSubmit={this.addAQuestion}>            
                    <input value={this.state.questionToSubmit} onChange={e => this.setState({ questionToSubmit: e.target.value })}/>
                    <button type="submit"> Add </button>
                  </form>
                  <br/>
                  
                  <h2>Set Trusted user:</h2>
                    <form onSubmit={this.setTrustedUser}>
                     <input value={this.state.trustedUserAddress} onChange={e => this.setState({ trustedUserAddress: e.target.value })}/>
                     <button  type="submit"> Save </button>
                    </form>                 
              </div>) 
                 : 
              (<div> Welcome user. Please place a Bet Below </div>) 


 const arrOfPredictionMarket = this.state.predictionMarkets.map( 
                  (predictionMarket , index )=> {
                    return (
                        <option value={predictionMarket.address}>{predictionMarket.address}</option>
                    )}
              )


 const arrOfQuestions = this.state.questions.map( (question , index )=> {
            return(
                <tr key={question.id}>
                      <td>{question.id}</td>
                      <td><b> {question.firstRoll} </b></td>                        
                      <td>
                          {question.resultRoll || question.amount>0 ? 
                            "No More Bets allowed. Your bet: "+(question.userAnswer ? 'Yes':'No') + ". Bet amount: "+ question.amount
                            : <form onSubmit={(e) => {
                                      e.preventDefault()
                                      this.addBet(question.id, index )
                                      }}>
                                <input placeholder="Amount" onChange={e => this.setState({ betAmount: e.target.value })}/>
                                <select onChange={e => this.setState({ betAnswer: e.target.value })} >
                                  <option value="">Select Yes or No</option>
                                  <option value="true">Yes</option>
                                  <option value="false">No</option>
                                </select>
                                <button type="submit">Bet</button>
                              </form> 
                          }
                      </td>
                      <td>
                          {question.resultRoll>0 ? question.resultRoll
                                             : (this.state.isUserTrusted ? 
                                        ( question.isOpenForBets ? 
                                            <div><form onSubmit={(e) => {e.preventDefault()
                                                                 this.closeQuestionForBets(question.id, index)
                                                                }}>                                                  
                                                    <button  >Close question</button>
                                                 </form>
                                            </div>
                                             : <div><form onSubmit={(e) => {e.preventDefault()
                                                               this.setQuestionAnswer(question.id, index)
                                                              }}>                                                  
                                                  <button  >Get 2nd Number</button>
                                               </form>
                                          </div>  ) 
                                           : (<div> - </div> ))
                                }
                      </td> 
                      <td>
                         {
                            question.resultRoll>0  
                              ? ( (question.resultRoll > question.firstRoll) == question.userAnswer 
                                            ? 
                                         ( question.profit == 0 ? 
                                          <form onSubmit={(e) => { e.preventDefault()
                                                   this.withdrawBet(question.id , index)}}>
                                          <button >Withdraw</button>
                                         </form>                 
                                            : 
                                            <div>Withdrawn already done</div> )                        
                                         : 
                                    <div >No profit</div>
                                  ) 
                              : <div>Wait for the correct answer</div>
                          }
                      </td>
                      <td  >{question.resultRoll>0 ?
                                 ( (question.resultRoll > question.firstRoll) == question.userAnswer 
                                            ? 
                                          ( question.profit >0 ? question.profit : <div>You have to withdraw first</div>)  
                                            : '0'
                                  ) 
                                 : '-'}
                      </td>
                </tr>
            )
          })

    return (

      <div className="App">
        <nav className="navbar pure-menu pure-menu-horizontal">
            <a href="#" className="pure-menu-heading pure-menu-link">Prediction Market</a>
        </nav>

        <main className="container">
          <div className="pure-g">
            <div className="pure-u-1-1">
              <h1>Prediction Market Hub</h1>
              <h5>Hub Address: {this.state.instance.address} - Balance (Wei): {this.state.hubContractBalance}</h5>
              <h5>Your Balance (Wei): {this.state.userBalance} ({this.state.accounts[0]})</h5>

              <br/> 

              <br/> 
                {hubAdminScene}
              <br/>

              <div>Number of Prediction Markets available: {this.state.predictionMarkets.length}</div>
              <div>Choose one Prediction Market to bet</div>
              <div>
                  <form onSubmit={(e) => {
                                  e.preventDefault()
                                  this.upsertPredictionMarket()
                                  }}>
                    <select onChange={e => this.setState({ predictionMarketSelected: e.target.value })} >
                        {arrOfPredictionMarket}
                    </select>
                    <button type="submit">Bet</button>
                  </form> 
              </div>
              <br/>



              <br/> 
                {adminScene}
              <br/>

              <br/> 
               <div>
                <div>Number of questions available: {this.state.questions.length}</div>
                <table width="90%" className="pure-table pure-table-bordered">
                        <thead>
                          <tr>
                              <th data-field="id">Question ID</th>
                              <th data-field="text">First roll</th>
                              <th data-field="bet">2nd roll > 1st? (bets in Wei)</th>
                              <th data-field="result">2nd Roll</th>
                              <th data-field="withdraw">Withdraw</th>
                              <th data-field="profit">Profit (Wei)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {arrOfQuestions}
                        </tbody>
                </table>  
              </div>             
            </div>           
          </div>
        </main>
      </div>

    );
  }
}

export default App
