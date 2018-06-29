pragma solidity ^0.4.23;

/*
A project contract for B9Lab's Ethereum Developer course
*/
contract Remittance {

    struct RemitStruct {
        address sentBy;
        uint balance;
    }

    mapping (bytes32 => RemitStruct) public remittances;

    event Deposit(
        address indexed from,
        bytes32 indexed target,
        uint value
    );

    event Withdraw(
        address indexed to,
        bytes32 indexed target,
        uint value
    );

    event Revoke(
        address indexed from,
        bytes32 indexed target,
        uint value
    );

    function genMagicHash(address approved, string password) public pure returns (bytes32) {
        bytes32 magicHash = keccak256(abi.encodePacked(approved, password));
        return magicHash;
    }

    function withdraw(string password) public {
        bytes32 magicHash = genMagicHash(msg.sender, password);
        RemitStruct memory remittance = remittances[magicHash];
        require(remittance.balance != 0, "Balance is 0");
        emit Withdraw(msg.sender, magicHash, remittance.balance);
        uint available = remittances[magicHash].balance;
        remittances[magicHash].balance = 0;
        msg.sender.transfer(available);
    }

    function remit(bytes32 magicHash) public payable {
        RemitStruct storage remittance = remittances[magicHash];
        require(remittance.sentBy == 0, "This remittance has been set");
        require(remittance.balance == 0, "This remittance has been set");
        emit Deposit(msg.sender, magicHash, msg.value);
        remittance.sentBy = msg.sender;
        remittance.balance = msg.value;
    }

    function revoke(bytes32 magicHash) public {
        RemitStruct storage remittance = remittances[magicHash];
        require(msg.sender == remittance.sentBy, "Only remitter can call back funds");
        require(remittance.balance > 0, "There are no funds to revoke");
        emit Revoke(msg.sender, magicHash, remittance.balance);
        uint available = remittance.balance;
        remittance.balance = 0;
        msg.sender.transfer(available);
    }

    function () public {
        revert();
    }
}
