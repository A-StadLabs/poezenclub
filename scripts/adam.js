var mqtt = require('mqtt');
var Web3 = require('web3');
var lightwallet = require('eth-lightwallet');
var HookedWeb3Provider = require("hooked-web3-provider");
var fs = require('fs');

var membershipcontract = require('../app/contracts/LocalsMembership.json');
var membershipcontractaddress = "0x83883514f7fcb0cf627829d067f0e8488201f6b9";
var host = "http://node1.ma.cx:8545";
var keystoreFile = "adamswallet.json";

web3 = new Web3();
web3.setProvider(new web3.providers.HttpProvider(host));


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

  connectMQTT();

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
        var memberaddress = commandarray[1];
        console.log('requestmembership for address ', memberaddress);

        if (isMember(memberaddress)){
          console.log('already a member');
        }else{
          console.log('not a member yet');
          // TODO : maak hem member...
        }

        break;
      default:
        console.log('unknown command:', commandarray[0]);
        break;
    }
  });
}

function isMember(address) {
  var MyContract = web3.eth.contract(membershipcontract.abi);
  var myContractInstance = MyContract.at(membershipcontractaddress);
  var r = myContractInstance.membershipStatus(address);
  console.log('membershipStatus voor', address, '=', r.toNumber(10));
  return (r.toNumber(10) != 0);
}



function requestMembership(address) {
  var MyContract = web3.eth.contract(membershipcontract.abi);
  console.log("Mycontract: ", MyContract);
  var myContractInstance = MyContract.at(contractaddress);


  var options = {
    from: account,
    value: 6 * 1e18,
    gas: 3141590,
    gasPrice: gasPrice,
    nonce: Math.floor(Math.random(999999)) + new Date().getTime(),
  };

  var newMember = '0x' + myArgs._[1] || global_keystore.getAddresses()[2];

  console.log('adding member ', newMember);
  console.log('contract options', options);


  var result = myContractInstance.addMember.sendTransaction(newMember, options,
    function(err, result) {
      if (err != null) {
        console.log(err);
        console.log("ERROR: Transaction didn't go through. See console.");
      } else {
        console.log("Transaction Successful!");
        console.log(result);
        monitorBalances(newMember);
      }
    }
  );


}