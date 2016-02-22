require('./logging');
var mqtt = require('mqtt');
var Web3 = require('web3');
var lightwallet = require('eth-lightwallet');
var HookedWeb3Provider = require("hooked-web3-provider");
var fs = require('fs');

var membershipcontract = require('../app/contracts/LocalsMembership.json');
var membershipcontractaddress = "0x83883514f7fcb0cf627829d067f0e8488201f6b9";
var host = "http://kingflurkel.dtdns.net:8545";
var keystoreFile = "adamswallet.json";

var validationcontract = require('../app/contracts/LocalsValidation.json');

web3 = new Web3();
web3.setProvider(new web3.providers.HttpProvider(host));


var contents = fs.readFileSync(keystoreFile, 'utf8');
var global_keystore = lightwallet.keystore.deserialize(contents);

global_keystore.passwordProvider = function(callback) {
  callback(null, 'testing')
};

console.log("Your wallet accounts:",global_keystore.getAddresses());
console.log("it s a",typeof global_keystore.getAddresses()[0]);

var account = fixaddress(global_keystore.getAddresses()[0].toString());
console.log('Your first account is ', account);

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

  gasPrice = result.toNumber(10);
  console.log('gasprice is ', gasPrice);

  connectMQTT();
  printBalance(account);

});


function connectMQTT() {

  console.log('connecting MQTT now');

  var client = mqtt.connect('ws://opantwerpen.be:15674');

  client.on('connect', function() {
    console.log('Adam is connected');
    client.subscribe('adam');
  });

  client.on('message', function(topic, message) {
    // message is Buffer
    console.log('Adam received a message');
    console.log(message.toString());

    var msg = message.toString();

    var commandarray = msg.split("|");

    console.log(commandarray);
    switch (commandarray[0]) {
      case "requestmembership":
        var memberaddress = fixaddress(commandarray[1]);
        console.log('requestmembership for address ', memberaddress);

        if (isMember(memberaddress)) {
          console.log('already a member');
        } else {
          console.log('not a member yet');
          // TODO : maak hem member...
          requestMembership(memberaddress);
        }
        break;
      case "validate":
        var contractaddress = fixaddress(commandarray[3]);
        console.log('validate for contractaddress ', contractaddress);
        validate(contractaddress, function(err, res) {
          console.log('validated');
        });
        break;

      default:
        console.log('unknown command:', commandarray[0]);
        break;
    }
  });
}

var MyContract = web3.eth.contract(membershipcontract.abi);
var myContractInstance = MyContract.at(membershipcontractaddress);

myContractInstance.MemberAdded(function(err, res) {

  console.log('MEMBERADDED triggered SUSKE');
  console.log('err', err);
  console.log('res', res);
  printBalance(account);

});


function validate(contractaddress, cb) {

  web3.eth.getGasPrice(function(err, result) {

    var gasPrice = result.toNumber(10);

    // creation of contract object
    var Myvalidationcontract = web3.eth.contract(validationcontract.abi);
    var myContractInstance = Myvalidationcontract.at(contractaddress);

    var options = {
      from: account,
      value: 3.5 * 1e18,
      gas: 3141590,
      gasPrice: gasPrice,
      nonce: Math.floor(Math.random(999999)) + new Date().getTime(),
    };

    console.log('contract to validate ', contractaddress);
    console.log('contract options', options);


    var result = myContractInstance.addValidation.sendTransaction(options,
      function(err, result) {
        if (err != null) {
          console.log(err);
          console.log("ERROR: Transaction didn't go through. See console.");
        } else {
          console.log("Transaction Successful!");
          console.log(result);
        }
      }
    );

    myContractInstance.ValidationAdded(function(err, res) {

      console.log('ValidationAdded triggered SUSKE');
      console.log('err', err);
      console.log('res', res);

      cb(err, res);

    });
  });


}

function isMember(address) {
  //  var MyContract = web3.eth.contract(membershipcontract.abi);
  //  var myContractInstance = MyContract.at(membershipcontractaddress);
  var r = myContractInstance.membershipStatus(address);
  console.log('membershipStatus voor', address, '=', r.toNumber(10));
  return (r.toNumber(10) != 0);
}

// Add 0x to address 
function fixaddress(address) {
  console.log("Fix address",address);
  address = "" + address;
  if (!address.startsWith('0x')) {
    return ('0x' + address);
  }
  return address;
}

function requestMembership(address) {

  address = fixaddress(address);

  // var MyContract = web3.eth.contract(membershipcontract.abi);
  //console.log("Mycontract: ", MyContract);
  //  var myContractInstance = MyContract.at(membershipcontractaddress);

  var options = {
    from: account,
    value: 6 * 1e18,
    gas: 3141590,
    gasPrice: gasPrice,
    nonce: Math.floor(Math.random(999999)) + new Date().getTime(),
  };

  var newMember = fixaddress(address);

  console.log('adding member ', newMember);
  console.log('contract options', options);

  var result = myContractInstance.addMember.sendTransaction(newMember, options,
    function(err, result) {
      if (err != null) {
        console.log(err);
        console.log("ERROR: Transaction didn't go through. See console.");
      } else {
        console.log("Transaction Successful!");
        console.log("Transaction hash=", result);
        printBalance(account);
      }
    }
  );
}

function printBalance(account) {
  var wei = web3.eth.getBalance(account).toNumber(10);
  console.log('Account', account, 'has Ξ', web3.fromWei(wei, 'ether'));
}
