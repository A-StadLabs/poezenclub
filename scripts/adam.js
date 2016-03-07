require('./logging');
var mqtt = require('mqtt');
var Web3 = require('web3');
var lightwallet = require('eth-lightwallet');
var HookedWeb3Provider = require("hooked-web3-provider");
var fs = require('fs');

var membershipcontract = require('../app/contracts/LocalsMembership.json');
var membershipcontractaddress = "0x83883514f7fcb0cf627829d067f0e8488201f6b9";
var host = "http://109.123.70.141:8545";
/*
var channel = "adam";
var keystoreFile = "adamswallet.json";
var poesimage = "adampoes";
var poesname = "Adam";
*/
var keystoreFile = process.env.WALLETFILE; //"evaswallet.json";
var keystorePass = process.env.WALLETPWD;

var channel = "eva";
var poesimage = "evapoes";
var poesname = "Eva";

if (!process.env.WALLETFILE || !process.env.WALLETPWD) {
  console.log('please provide the environment vars WALLETFILE and WALLETPWD and come again.');
  process.exit();
}


var validationcontract = require('../app/contracts/LocalsValidation.json');

web3 = new Web3();
web3.setProvider(new web3.providers.HttpProvider(host));

console.log('Starting up');
console.log('opening wallet file', process.env.WALLETFILE);

var contents = fs.readFileSync(process.env.WALLETFILE, 'utf8');
var global_keystore = lightwallet.keystore.deserialize(contents);

global_keystore.passwordProvider = function(callback) {
  callback(null, process.env.WALLETPWD);
};

console.log("Your wallet accounts:", global_keystore.getAddresses());
//console.log("it s a", typeof global_keystore.getAddresses()[0]);

//var account = fixaddress(global_keystore.getAddresses()[0].toString());
//console.log('Your first account is ', account);

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
  printBalance(global_keystore.getAddresses()[0]);
  printBalance(global_keystore.getAddresses()[1]);

});

var client;

function connectMQTT() {

  console.log('connecting MQTT now');

  client = mqtt.connect('ws://opantwerpen.be:15674');

  client.on('connect', function() {
    console.log(poesname, ' is connected to MQTT');
    var channels = [channel, '0001', '0002'];
    client.subscribe(channels);
    console.log('Listening to channels ', channels);
  });

  client.on('message', function(topic, message) {
    // message is Buffer
    console.log('topic', topic, 'received a message');
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
          requestMembership(memberaddress, 0);
        }
        break;
      case "validate":
        var walletindex = 0;
        if (topic == "0001") {
          walletindex = 0;
        } else if (topic == "0002") {
          walletindex = 1;
        } else {
          walletindex = 0;
        }

        var contractaddress = fixaddress(commandarray[3]);
        console.log('validate for contractaddress ', contractaddress);
        validate(contractaddress, walletindex, function(err, res) {
          console.log('validated');
        });

        // Send message back...
        var seedaccount = global_keystore.getAddresses()[walletindex];
        var incomingpussyname = commandarray[1];
        var incomingpussypic = "../../images/poezen/poes" + commandarray[2] + ".png";
        var contractaddresstowrite = commandarray[3];
        var incomingpin = commandarray[4];
        var incomingref = commandarray[5];

        client.publish(incomingpin, "validationstarted" + "|" + poesimage + "|" + poesname + "|" + seedaccount + "|" + incomingref);

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
  printBalance(global_keystore.getAddresses()[0]);
  printBalance(global_keystore.getAddresses()[1]);

});


function validate(contractaddress, walletindex, cb) {

  var seedaccount = global_keystore.getAddresses()[walletindex];

  console.log('Request validation from', seedaccount, 'to contractaddress', contractaddress);

  web3.eth.getGasPrice(function(err, result) {

    var gasPrice = result.toNumber(10);

    // creation of contract object
    var Myvalidationcontract = web3.eth.contract(validationcontract.abi);
    var myContractInstance = Myvalidationcontract.at(contractaddress);

    var options = {
      from: seedaccount,
      value: 1 * 1e18,
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
  console.log("Fix address", address);
  if (!strStartsWith(address, '0x')) {
    return ('0x' + address);
  }
  return address;
}

function strStartsWith(str, prefix) {
  return str.indexOf(prefix) === 0;
}

function requestMembership(address, walletindex) {

  address = fixaddress(address);

  // var MyContract = web3.eth.contract(membershipcontract.abi);
  //console.log("Mycontract: ", MyContract);
  //  var myContractInstance = MyContract.at(membershipcontractaddress);

  var seedaccount = global_keystore.getAddresses()[walletindex];

  console.log('Request membership from', seedaccount, 'to', address);

  var options = {
    from: seedaccount,
    value: 2.2 * 1e18,
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
        printBalance(global_keystore.getAddresses()[0]);
        printBalance(global_keystore.getAddresses()[1]);
      }
    }
  );
}

function printBalance(account) {
  account = fixaddress(account);
   var     etherbalance = parseFloat(web3.fromWei(web3.eth.getBalance(account).toNumber(), 'ether'));

//  var etherbalance = web3.fromWei(web3.eth.getBalance(account), 'ether').toNumber(10);
  console.log('Account', account, 'has Ξ', etherbalance);
  if (etherbalance < 5){
    console.log('Send alert - balance low');
    client.publish('poezenclubservice', "balancealert" + "|accountbalance too low|" + account + "|" + etherbalance);
  }


}