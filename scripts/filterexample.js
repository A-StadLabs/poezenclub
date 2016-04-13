var Web3 = require('web3');
var host = "http://localhost:8545";

var web3 = new Web3();
web3.setProvider(new web3.providers.HttpProvider(host));

// create a filter monitoring a contract address
var filter = web3.eth.filter({
	fromBlock: 447520,
	toBlock: 'latest',
	from: '0x3903a55e0802f011077bb33382822937d94efb7f'
});

// query this filter 
filter.get(function(error, result) {
	if (error) {
		console.log('error', error);
	}

	// result received
	console.log('received answer', result);

	// now show transaction details of this result
	web3.eth.getTransaction(result[0].transactionHash, function(err, txresult) {
		console.log('transaction details of', result[0].transactionHash, txresult);
	});


});


