var lightwallet = require('eth-lightwallet');
var Web3 = require('web3');
var fs = require('fs');
var debounce = require('debounce');
//var keystoreFile = "../../poezenclub/scripts/adamswallet.json";

var myArgs = require('optimist').argv;
var HookedWeb3Provider = require("hooked-web3-provider");
var contract = require('../app/contracts/PoezenVoting.json');

var host = "http://109.123.70.141:8545";

var votingcontract = "0xdb88ed8d29b8bceb0cdd891c906989839cf49a8d"; //  = "0x30f1dc0a055129154e798d7f6f8dd94b7c4075b7";

var global_keystore;
var account;
var web3;
var web3_monitor;


web3 = new Web3();

var provider = new HookedWeb3Provider({
	host: host,
	transaction_signer: global_keystore
});
web3.setProvider(provider);

/*
	web3_monitor = new Web3();
	web3_monitor.setProvider(new web3.providers.HttpProvider(host));
*/

//	var gasPrice;

//	web3.eth.getGasPrice(function(err, result) {

//var gasPrice = result.toNumber(10);
//console.log('gasprice is ', gasPrice);

var MyContract = web3.eth.contract(contract.abi);
var myContractInstance = votingcontract ? MyContract.at(votingcontract) : null;

if (votingcontract) {
	console.log('follow this contract at http://testnet.etherscan.io/address/' + votingcontract);
}

/*
var filter = web3.eth.filter('pending');

filter.watch(function (error, log) {
  console.log(log); //  {"address":"0x0000000000000000000000000000000000000000", "data":"0x0000000000000000000000000000000000000000000000000000000000000000", ...}
});
*/

// get all past logs again.
//var myResults = filter.get(function(error, logs){ ... });

/*
var filter = web3.eth.filter({
	fromBlock: 421461,
	toBlock: 'latest',
	address: '0xfe08619250bce6550ac079868c3ba7a162510d3a'
});
filter.get(function(error, result) {
	console.log(result);
});
*/

/*
var command = myArgs._[0];
switch (command) {
	default: 

*/


var count = 0;
var froms = {};

var showfroms = debounce(_showfroms, 2000);

function _showfroms() {
	console.log('Froms:', froms);
}


var filter = web3.eth.filter({
	fromBlock: 606422,
	toBlock: "latest",
	address: votingcontract
		//topics: ["0x" + web3.sha3("Resolved(uint256,address,address,uint8)")]
}, function(error, result) {
	if (!error) {
		console.log('++++++++');
		console.log('found activity on contract ', result);
		console.log('++++++++');
	}
	count++;
	console.log('count=', count);
	web3.eth.getTransaction(result.transactionHash, function(err, res) {
		console.log('--------');
		console.log('transaction hash result', res);
		console.log('--------');
		froms[res.from] = "1";
		showfroms();
	});

});


/*
setTimeout(function() {
	filter.stopWatching();
},10*1000);
*/

/*
// get all past logs again.
var myResults = filter.watch(function(error, logs){
console.log('filter...',logs);
 });
*/

/*

	console.log('Start monitoring contract ', votingcontract);
	var filter = web3.eth.filter({
		address: votingcontract
	});

	// watch for changes
	filter.watch(function(error, result) {
		if (!error) {
			console.log(result);
		} else {
			console.log('error', error);
		}

	});
	*/
/*
	break;


}
*/
//	});

//}