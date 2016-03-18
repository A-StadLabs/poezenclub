var exec = require('child_process').exec;
var SerialPort = require("serialport").SerialPort
var serialPort = new SerialPort("/dev/ttyAMA0", {
  baudrate: 19200
}, false); // this is the openImmediately flag [default is true]
var host = "http://109.123.70.141:8545";
var mqtt = require('mqtt');
var client = mqtt.connect('ws://opantwerpen.be:15674');
var code;

var Web3 = require('web3');
var LocalsValidation = require('../app/contracts/LocalsValidation.json');
var PoezenVoting = require('../app/contracts/PoezenVoting.json');

/* {
  "bytecode": "60606040526000805560018054600160a060020a0319163317905560f6806100276000396000f3606060405260e060020a600035046333ac20098114602e57806384394e6f146037578063fa52c7d8146060575b005b60776000545b90565b6077600160a060020a033316600090815260026020526040812054600114156089575060016034565b607760043560026020526000908152604090205481565b60408051918252519081900360200190f35b6040812060019081905581548101825554600160a060020a03168134606082818181858883f1505060408051600160a060020a033316815290517fc950a438e6ad1cf066a2ec63cd7e6753ed8e6fe1d55949e889204d0f0230a23f94509081900360200192509050a1603456",
  "abi": [{
    "constant": true,
    "inputs": [],
    "name": "countValidations",
    "outputs": [{
      "name": "count",
      "type": "uint256"
    }],
    "type": "function"
  }, {
    "constant": false,
    "inputs": [],
    "name": "addValidation",
    "outputs": [{
      "name": "returnCode",
      "type": "uint256"
    }],
    "type": "function"
  }, {
    "constant": true,
    "inputs": [{
      "name": "",
      "type": "address"
    }],
    "name": "validators",
    "outputs": [{
      "name": "",
      "type": "uint256"
    }],
    "type": "function"
  }, {
    "inputs": [],
    "type": "constructor"
  }, {
    "anonymous": false,
    "inputs": [{
      "indexed": false,
      "name": "validator",
      "type": "address"
    }],
    "name": "ValidationAdded",
    "type": "event"
  }]
};
*/

web3 = new Web3();

if (process.env.simulate){
  console.log('SIMULATE');
}


var writingtothelcd = false;
function schrijflcd(text, cb) {

  if (process.env.simulate) {
    console.log('SIMULATE LED:[', text, ']');
  } else {
    if (writingtothelcd === true) {
      console.log('still writing to the LCD... queueing command');
      return setTimeout(function() {
        schrijflcd(text)
      }, 500);
    }
    console.log("Writing to LCD: [" + text + "]");
    writingtothelcd = true;
    serialPort.write(String.fromCharCode(17) + String.fromCharCode(12) + (text + "                                ").substring(0, 32), function(err, results) {
      //serialPort.close();
      console.log("Done writing to LCD");
      writingtothelcd = false;
      if (cb) cb();
    });
  }
}

var lidstatus = "closed";

function beweeglid(command, cb) {
  var richting = "";
  switch (command) {
    case 'open':
      if (lidstatus !== 'closed') {
        console.log('nope -lid is open');
        return;
      }
      doelid("1", function() {
        console.log('opened');
        lidstatus = 'opened';
        cb();
      });
      break;
    case 'close':
      if (lidstatus !== 'opened') {
        console.log('nope - lid is closed');
        return;
      }
      doelid("0", function() {
        cb();
        lidstatus = 'closed';
      });
      break;
  }
}

function doelid(command, cb) {
  if (process.env.simulate) {
    console.log('simulatie: de doos gaat ', command);
    cb();
  } else {
    child = exec(__dirname + "/motor 720 400000 1000 " + command, function(error, stdout, stderr) {
      if (error !== null) {
        console.log('exec error: ' + error);
      }
      console.log('command finished', command);
      cb();
    });
  }
}

// Start it...
if (process.env.simulate) {
  afterSerialPortOpen();
} else {
  serialPort.open(function(error) {
    if (error) {
      console.log('failed to open: ' + error);
    } else {
      afterSerialPortOpen();
    }
  });
}


function afterSerialPortOpen(){

    console.log('open');
    schrijflcd("Welkom bij de poezendoos");

    web3.setProvider(new web3.providers.HttpProvider(host));

    client.on('connect', function() {
      client.subscribe('poezendoos');
      client.publish('poezendoos', 'Poezendoos online!');
    });

    generateCode();
    var channels = ['poezendoos/service','poezendoos/' + code];
    console.log("Poezendoos channels:",channels);
    client.subscribe(channels);
    client.publish('poezendoos/' + code, 'command|listening');
    schrijflcd("   poezendoos" + String.fromCharCode(13) + "     " + code);

    client.on('message', function(topic, message) {
      // message is Buffer
      //console.log(message.toString());
      var msg = message.toString();

      var commandarray = msg.split("|");

      console.log(commandarray);
      // Check command and do something
      if (commandarray[0] === 'checkContract') {
        var contractaddress = commandarray[1];
        var pincode = commandarray[2];

        schrijflcd(" de poezendoos " + String.fromCharCode(13) + " kijkt het na...");

        checkContract(contractaddress, function(result) {
          console.log("ik heb een result: ", result);
          if (result > 1) {
            schrijflcd('u heeft ' + result + ' validaties');
            openDoor();
            client.publish(pincode, 'doosisopen');
          } else {
            schrijflcd('u heeft ' + result + ' validaties. Dat is niet genoeg');
          }
        });
        // check if the contract is valid.
        // checkContract(contractaddress, useraccount, function(result){
        //  if(result){
        //    openDoor();
        //  }
        // });
      };

      if (commandarray[0] === 'checkVotingContract') {
        // het voting contract
        var contractaddress = commandarray[1];
        // het account van de voter
        var voteraddress = commandarray[2];
        //        var pincode = commandarray[2];

        checkVotingWinner(contractaddress, voteraddress, function(iamawinner) {
          if (iamawinner){
            console.log('gij zijt gewonnen';
          }else{
            console.log('looooooooooser!';
          }
        });
      }

      if (commandarray[0] === 'sluitDoos') {
        console.log('doos gaat dicht.');
        client.unsubscribe('poezendoos/' + code);
        //closeDoor();
      }
      //client.end();

    });
  
}

// HELPER functions //
function openDoor() {

  beweeglid('open', function() {
    schrijflcd('de doos is open');
  });

  setTimeout(function(){
    console.log('15s timeout passed... Close the lid');
    closeDoor();
  },15*1000);

};

function closeDoor() {
  //client.publish(pincode, 'doosisdicht');
  client.unsubscribe('poezendoos/' + code);
  beweeglid('close', function() {
    schrijflcd('de doos is terug toe');
    console.log('closed');    
    generateCode();
    client.subscribe('poezendoos/' + code);
    client.publish('poezendoos/' + code, 'command|listening');
    schrijflcd("   poezendoos" + String.fromCharCode(13) + "     " + code);
  });
};

function generateCode() {
  code = Math.floor(Math.random() * 90000) + 10000;
  //console.log(code);
  //fn(code);
};

function checkContract(contractaddress, fn) {
  console.log("Checking contract: ", contractaddress);
//  console.log("Checking balance: ", web3.eth.getBalance(contractaddress).toNumber(10));
  var MyContract = web3.eth.contract(LocalsValidation.abi);
  console.log('get contract from blockchain');
  var myContractInstance = MyContract.at(contractaddress);
  console.log('run countValidations');
  var result = myContractInstance.countValidations().toNumber(10);
  console.log("got result: ", result);
  fn(result);
};

function checkVotingWinner(contractaddress,voteraddress, fn){
// 1. check of contract al afgelopen is
// 2. haal opties op
// 3. bepaal winnende stem
// 4. haal jouw stem op
// 5. check of jouw stem de winnende is
// 6. fn(err,true/false)

  console.log("Checking contract: ", contractaddress);
  var MyContract = web3.eth.contract(LocalsValidation.abi);
  console.log('get contract from blockchain');
  var myContractInstance = MyContract.at(contractaddress);
  console.log('run countValidations');




}



