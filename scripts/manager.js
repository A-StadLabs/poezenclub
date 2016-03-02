var lightwallet = require('eth-lightwallet');
var Web3 = require('web3');
var fs = require('fs');
var keystoreFile = "../../poezenclub/scripts/adamswallet.json";

var myArgs = require('optimist').argv;
var HookedWeb3Provider = require("hooked-web3-provider");
var contract = require('../app/contracts/LocalsMembership.json');

var host = "http://kingflurkel.dtdns.net:8545";

var poezencontract = "0x83883514f7fcb0cf627829d067f0e8488201f6b9";

var global_keystore;
var account;
var web3;
var web3_monitor;


if (!fs.existsSync(keystoreFile)) {
	console.log('file',keystoreFile,'not found..');
	process.exit();
} else {

	console.log('Keystore file found.');
	var contents = fs.readFileSync(keystoreFile, 'utf8');
	var global_keystore = lightwallet.keystore.deserialize(contents);

	global_keystore.passwordProvider = function(callback) {
		callback(null, 'testing')
	};

	//console.log(global_keystore);
	console.log

	account = global_keystore.getAddresses()[0];
	console.log('Your account is ', account);

	web3 = new Web3();
	var provider = new HookedWeb3Provider({
		host: host,
		transaction_signer: global_keystore
	});
	web3.setProvider(provider);

	web3_monitor = new Web3();
	web3_monitor.setProvider(new web3.providers.HttpProvider(host));

	var gasPrice;

	web3.eth.getGasPrice(function(err, result) {

		var gasPrice = result.toNumber(10);
		console.log('gasprice is ', gasPrice);

		console.log(myArgs._[0]);
		var command = myArgs._[0];
		switch (command) {
			default: monitorBalances(myArgs._[0], true);
			break;
			case "setvalue":
				var price = parseInt(myArgs._[1]);
				console.log('setting contract value to:',price);
			
				// creation of contract object
				var MyContract = web3.eth.contract(contract.abi);
				var myContractInstance = MyContract.at(poezencontract);

				var options = {
					from: account,
					value: 6 * 1e18,
					gas: 3141590,
					gasPrice: gasPrice,
					nonce: Math.floor(Math.random(999999)) + new Date().getTime(),
				};

				var result = myContractInstance.setPrice.sendTransaction(price, options,
					function(err, result) {
						if (err != null) {
							console.log(err);
							console.log("ERROR: Transaction didn't go through. See console.");
						} else {
							console.log("Transaction Successful!");
							console.log(result);
							//monitorBalances(newMember);
						}
					}
				);
				break;
		

		}
	});

}
