contract PoezenVoting {
    uint public votingStart;
    uint public votingEnd;

 function PoezenVoting(uint _votingStart,
                            uint _votingEnd
                           )
    {
        votingStart = _votingStart;
        votingEnd = _votingEnd;
    }

    event VoteAdded();

    mapping(uint => uint) public voteresults;

    // It will represent a single voter.
    struct Voter
    {
        uint vote;   // index of the voted proposal
        uint voteTime;   // timestamp of vote
    }
    mapping(address => Voter) public voters;

    function vote(uint vote) {

        if (now < votingStart || now > votingEnd){
            return;
        }
        voteresults[vote]++;
        voters[msg.sender] = Voter(vote,now);
        VoteAdded();
        
    }

}           