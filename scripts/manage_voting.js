var lightwallet = require('eth-lightwallet');
var Web3 = require('web3');
var fs = require('fs');
var keystoreFile = "../../poezenclub/scripts/adamswallet.json";

var myArgs = require('optimist').argv;
var HookedWeb3Provider = require("hooked-web3-provider");
var contract = require('../app/contracts/PoezenVoting.json');

var host = "http://109.123.70.141:8545";

var votingcontract = "0xdb88ed8d29b8bceb0cdd891c906989839cf49a8d"; //  = "0x30f1dc0a055129154e798d7f6f8dd94b7c4075b7";

var global_keystore;
var account;
var web3;
var web3_monitor;


if (!fs.existsSync(keystoreFile)) {
	console.log('file', keystoreFile, 'not found..');
	process.exit();
} else {

	console.log('Keystore file found.');
	var contents = fs.readFileSync(keystoreFile, 'utf8');
	var global_keystore = lightwallet.keystore.deserialize(contents);

	global_keystore.passwordProvider = function(callback) {
		callback(null, 'testing')
	};


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

		var MyContract = web3.eth.contract(contract.abi);
		var myContractInstance = votingcontract ? MyContract.at(votingcontract) : null;

		if (votingcontract) {
			console.log('follow this contract at http://testnet.etherscan.io/address/0x' + votingcontract);
		}


		console.log(myArgs._[0]);
		var command = myArgs._[0];
		switch (command) {
			default:
				case "show":
				var votingStart = myContractInstance.votingStart().toNumber();
			var votingEnd = myContractInstance.votingEnd().toNumber();
			console.log('votingstart/end', votingStart, votingEnd);
			console.log('votingstart=', new Date(votingStart * 1000));
			console.log('votingend=', new Date(votingEnd * 1000));

			for (var i=1;i<4;i++){
				var result =  myContractInstance.voteresults(i).toNumber();
				console.log('votes for',i,'=',result);
			}


			showBalances(global_keystore);

			break;
			case "lenin":
					redistribute_wealth(gasPrice);
				break;
			case "deploy":
					var contractInstance = MyContract.new({
					from: account,
					gasPrice: gasPrice,
					gasLimit: 3000000,
					gas: 2000000,
					nonce: 4,
					data: contract.bytecode
				}, function(err, myContract) {
					if (!err) {
						// NOTE: The callback will fire twice!
						// Once the contract has the transactionHash property set and once its deployed on an address.

						// e.g. check tx hash on the first call (transaction send)
						if (!myContract.address) {
							console.log("Your contract has been deployed to the Ethereum network. Transaction hash is", myContract.transactionHash);
							console.log("Wait a new moments while we mine it. You will receive your address when it is mined.");
							// check address on the second call (contract deployed)
						} else {
							console.log("Your contract has been deployed. Your contract address is", myContract.address);
							//							console.log(myContract.address) // the contract address
						}
					} else {
						console.log('error:', err);
					}
				});
				break;
				// do 10 votes to random results
			case "randomvote":

				var nonceStart = new Date().getTime();

				for (var i = 1; i < global_keystore.getAddresses().length; i++) {
					var vote = Math.floor(1 + Math.random() * 2.5);

					console.log('account', global_keystore.getAddresses()[i], 'votes', vote);

					var options = {
						from: global_keystore.getAddresses()[i],
						gas: 3141590,
						gasPrice: gasPrice,
						nonce: nonceStart+i,
					};

					var result = myContractInstance.vote.sendTransaction(vote, options,
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

				}

					break;

				// Set interval for voting : setinterval <start UNIX_TIMESTAMP> <end UNIX_TIMESTAMP>
			case "setinterval":
					var start = parseInt(myArgs._[1]);
				var stop = parseInt(myArgs._[2]);
				console.log('setting start/stop value to:', start, stop);


				var options = {
					from: account,
					//value: 6 * 1e18,
					gas: 3141590,
					gasPrice: gasPrice,
					nonce: Math.floor(Math.random(999999)) + new Date().getTime(),
				};

				var result = myContractInstance.setinterval.sendTransaction(start, stop, options,
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

// sends 1 ether from the first wallet account to all the other wallet accounts
function redistribute_wealth(gasPrice) {

	for (var i = 1; i < global_keystore.getAddresses().length; i++) {

		console.log('send 1 eth from', global_keystore.getAddresses()[0], 'to', global_keystore.getAddresses()[i]);


		var options = {
			from: global_keystore.getAddresses()[0],
			to: global_keystore.getAddresses()[i],
			value: 1 * 1e18,
			gas: 3141590,
			gasPrice: gasPrice,
			nonce: Math.floor(Math.random(999999)) + new Date().getTime(),
		};

		//console.log('transaction',options);
		var result = web3.eth.sendTransaction(options,
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
	}

}

function showBalances(global_keystore) {

	var accountsToShow = global_keystore.getAddresses();
	console.log('----Balances of wallet----');
	accountsToShow.forEach(function(adress) {

		var wei = web3.eth.getBalance(adress).toNumber(10);
		console.log('Account', adress, 'has', wei / 1e18, 'ether');
	});
}