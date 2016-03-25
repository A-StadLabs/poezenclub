var exec = require('child_process').exec;
var SerialPort = require("serialport").SerialPort
var serialPort = new SerialPort("/dev/ttyAMA0", {
  baudrate: 19200
}, false); // this is the openImmediately flag [default is true]
var host = process.env.ethnodehost || "http://109.123.70.141:8545";
var mqtthost = 'ws://opantwerpen.be:15674';
var mqtt = require('mqtt');
var client = mqtt.connect(mqtthost);
var code;
var debounce = require('debounce');

var Web3 = require('web3');
var LocalsMembership = require('../app/contracts/LocalsMembership.json');
var LocalsMembership_address = "0x83883514f7fcb0cf627829d067f0e8488201f6b9";
var LocalsMembership_startBlock = 369378;
var LocalsValidation = require('../app/contracts/LocalsValidation.json');

var PoezenVoting = require('../app/contracts/PoezenVoting.json');

console.log('Welkom bij de Poezendoos');
console.log('web3 host = ', host);
console.log('mqtt host = ', mqtthost);
console.log('simulate  = ', process.env.simulate);

web3 = new Web3();

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


function afterSerialPortOpen() {

  console.log('Connected to the serial port.');
  //schrijflcd("Welkom bij de poezendoos");

  console.log('Setting up web3 provider');
  web3.setProvider(new web3.providers.HttpProvider(host));

  console.log('connecting to MQTT...');
  client.on('connect', function() {
    console.log('connected to MQTT!');
    client.subscribe('poezendoos');
    client.publish('poezendoos', 'Poezendoos online!');
  });

  generateCode();
  var channels = ['poezendoos/service', 'poezendoos/99999', 'poezendoos/' + code];
  console.log("Poezendoos channels:", channels);
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
    };

    if (commandarray[0] === 'checkVotingContract') {
      // het voting contract
      var contractaddress = commandarray[1];
      // het account van de voter
      var voteraddress = commandarray[2];
      //        var pincode = commandarray[2];

      schrijflcd(" de poezendoos " + String.fromCharCode(13) + " telt de stemmen");

      checkVotingWinner(contractaddress, voteraddress, function(err,iamawinner) {
        if (iamawinner) {
          console.log('gij zijt gewonnen');
          openDoor();
          //client.publish(pincode, 'doosisopen');
        } else {
          // normaal komen we hier niet - de frontend houdt dat tegen...
          console.log('u bent niet bij de winnaars...!');
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

  // var froms = [];
  // var datas = [];
  // var showfroms = debounce(_showfroms, 2000);

  // function _showfroms() {
  //   console.log('Froms:', froms);
  //   console.log('Datas:', datas);
  // }

//  var topic = '0x' + web3.sha3('MemberAdded(address,address)');

//  console.log('Start listening to topic=', topic);

  // var filter = web3.eth.filter({
  //   fromBlock: LocalsMembership_startBlock,
  //   toBlock: "latest",
  //   address: LocalsMembership_address,
  //   topics: [topic]
  // }, function(error, result) {
  //   if (!error) {
  //     console.log('++++++++');
  //     console.log('found activity on contract ', result);
  //     console.log('++++++++');

  //     console.log('from=', result.data.substring(2, 64));
  //     console.log('to=', result.data.substring(64 + 2, 64));

  //     var address = getAddressFromDataLine(result.data);
  //     if (address){
  //       console.log('add address');
  //       datas.push(address);
  //       showfroms();
  //     }
  //   }

  //   /*
  //       if (result && result.transactionHash) {
  //         web3.eth.getTransaction(result.transactionHash, function(err, res) {
  //           console.log('--------');
  //           console.log('transaction hash result', res);
  //           console.log('--------');
  //           froms[res.from] = "1";

  //           showfroms();
  //         });
  //       }
  //       */
  // });

}


// var adrs = ['0x51579d1ad9cea78a5020bec7f42e132b12b6205b',
//   '0x537b5a48bd491c9813637908a49d3857d14c11dc',
//   '0xcc5c5b9315c3dd882b3e3eabefd8e99b9fb7a003',
//   '0xab2525dcc956d489e7b7f21f8bed1c2326283dcf',
//   '0x2338a5c57150f1071c386637fa379dee3d3969c7',
//   '0x518e272fc1f1cefa8d572a5e80f1bdb2cc3b7e7f',
//   '0xb69ae11fa5e355d66f97d9fba29f5cf5805575e9',
//   '0x47f831d925ec535532993b0c17af1fbcbed075df',
//   '0xb8f19bd897a48b09148c2a738e5a0eeea77b4565',
//   '0x92c886d58c4af09b364232f46ecfd932f57e152f'
// ];

// var topic1 = '0x' + web3.sha3('addValidation()');
// console.log('topic addvalidation',topic1);

// var filter2 = web3.eth.filter({
//   fromBlock: LocalsMembership_startBlock,
//   toBlock: "latest",
//   from: '0x47f831d925ec535532993b0c17af1fbcbed075df',
// }, function(error, result) {
//   if (!error) {
//     //console.log('++++++++');
//     //console.log('found activity for address ', result);
//     //console.log('++++++++');

//     if (result && result.transactionHash) {
//       web3.eth.getTransaction(result.transactionHash, function(err, res) {
//         console.log('topic addvalidation',topic1);

//         console.log('--------');
//         console.log('found activity: ', result);
//         console.log('transaction:', res);
//         console.log('--------');
//       });
//     }

//   }
// });


/*
var a = getAddressFromDataLine('0x00000000000000000000000040ccd68be5853dcc188fd47cdb9816ca8cb84bd000000000000000000000000047f831d925ec535532993b0c17af1fbcbed075df');
console.log(a, web3.isAddress(a));
*/

//console.log('Address = ',);

function getAddressFromDataLine(l) {
  console.log(l.length);
  if (l.length != 130) {
    return;
  }
  var l2 = '0x' + l.substring(130 - 40);
  if (!web3.isAddress(l2)) {
    console.log('No address found in ', l);
    return
  } else {
    return l2;
  }
}

// HELPER functions //
function openDoor() {

  beweeglid('open', function() {
    schrijflcd('de doos is open');
  });

  setTimeout(function() {
    console.log('15s timeout passed... Close the lid');
    closeDoor();
  }, 15 * 1000);

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

function checkVotingWinner(contractaddress, voteraddress, fn) {

  console.log('checkVotingWinner ',contractaddress,voteraddress);

  var MyContract = web3.eth.contract(PoezenVoting.abi);
  var myContractInstance = MyContract.at(contractaddress);

  // 1. check of contract al afgelopen is
  var endcontract = myContractInstance.votingEnd().toNumber(10);
  var now = Math.floor(new Date().getTime() / 1000);

/*
  if (endcontract > now) {
    console.log('Voting is nog bezig...', endcontract, '<', now);
    return fn(null,false);
  } else {
    console.log('Voting has ended', endcontract, '>', now);
  }
*/

  // 2. haal opties op
  // 3. bepaal winnende stem
  var result1 = myContractInstance.voteresults(1).toNumber(10);
  var result = result1;
  console.log('result1=',result1,'result=',result);
  var result2 = myContractInstance.voteresults(2).toNumber(10);
  if (result2>result){
    result = result2;
  }
  console.log('result2=',result2,'result=',result);
  var result3 = myContractInstance.voteresults(3).toNumber(10);
  if (result3>result){
    result = result2;
  }
  console.log('result3=',result3,'result=',result);

  console.log(result1,result2,result3,'--- best result=',result);

  // 4. haal jouw stem op
  var myVote = myContractInstance.voters(voteraddress)[0].toNumber(10);
  console.log('myVote is number (index) =',myVote);

  var myVoteResult = myContractInstance.voteresults(myVote).toNumber(10);

  console.log('my vote result=',myVoteResult);

  if (myVoteResult == result){
    console.log('i am a winner');
    return fn(null,true);
  }else{
    console.log('i am a loser');
    return fn(null,false);
  }



  // 5. check of jouw stem de winnende is
  // 6. fn(err,true/false)


/*
  console.log("Checking contract: ", contractaddress);
  var MyContract = web3.eth.contract(LocalsValidation.abi);
  console.log('get contract from blockchain');
  var myContractInstance = MyContract.at(contractaddress);
  console.log('run countValidations');
*/




}