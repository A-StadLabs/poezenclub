var exec = require('child_process').exec;
var SerialPort = require("serialport").SerialPort
var serialPort = new SerialPort("/dev/ttyAMA0", {
  baudrate: 19200
}, false); // this is the openImmediately flag [default is true]
var host = "http://kingflurkel.dtdns.net:8545";


function schrijflcd(tekst, cb) {
  serialPort.write(String.fromCharCode(17) + String.fromCharCode(12) + text, function(err, results) {
    //serialPort.close();
    if (cb) cb();
  });

  //      serialPort.on('data', function(data) {
  //        console.log('data received: ' + data);
  //      });
  /*
        serialPort.write(String.fromCharCode(17), function(err, results) {
          serialPort.write(String.fromCharCode(12), function(err, results) {
            serialPort.write(tekst, function(err, results) {
              //serialPort.close();
              if (cb) cb();
            });
          });
        });
        */
  //  });
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
  child = exec("./motor 730 0 " + command, function(error, stdout, stderr) {
    if (error !== null) {
      console.log('exec error: ' + error);
    }
    console.log('command finished', command);
    cb();
  });
}

serialPort.open(function(error) {
  if (error) {
    console.log('failed to open: ' + error);
  } else {
    console.log('open');
    schrijflcd("Welkom bij de poezendoos");

    var mqtt = require('mqtt');
    var client = mqtt.connect('ws://opantwerpen.be:15674');
    var Web3 = require('web3');


    var contractabi = {
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

    web3 = new Web3();
    web3.setProvider(new web3.providers.HttpProvider(host));

    client.on('connect', function() {
      client.subscribe('poezendoos');
      client.publish('poezendoos', 'Poezendoos online!');
    });

    generateCode(function(code) {
      client.subscribe('poezendoos/' + code);
      client.publish('poezendoos/' + code, 'command|listening');
      schrijflcd("   poezendoos" + String.fromCharCode(13) + "     " + code);
    });

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
      if (commandarray[0] === 'sluitDoos') {
        console.log('doos gaat dicht.');
        closeDoor();
      }

      //client.end();

    });
  }
});

// HELPER functions //
function openDoor() {

  beweeglid('open', function() {
    schrijflcd('de doos is open');
  });



};

function closeDoor() {
  beweeglid('close', function() {
    schrijflcd('de doos is terug toe');
    console.log('closed');
    generateCode(function(code) {
      client.subscribe('poezendoos/' + code);
      client.publish('poezendoos/' + code, 'command|listening');
      schrijflcd("   poezendoos" + String.fromCharCode(13) + "     " + code);
    });
  });
};

function generateCode(fn) {
  var code = Math.floor(Math.random() * 90000) + 10000;
  console.log(code);
  fn(code);
};

function checkContract(contractaddress, fn) {
  console.log("Checking contract: ", contractaddress);
  console.log("Checking balance: ", web3.eth.getBalance(contractaddress).toNumber(10));
  var MyContract = web3.eth.contract(contractabi.abi);
  console.log("Mycontract: ", MyContract);
  var myContractInstance = MyContract.at(contractaddress);
  var result = myContractInstance.countValidations().toNumber(10);
  console.log("Result: ", result);
  fn(result);
};