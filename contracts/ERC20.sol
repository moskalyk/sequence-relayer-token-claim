// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

library ECRecovery {
  /**
   * @dev Recover signer address from a message by using his signature
   * @param hash bytes32 message, the hash is the signed message. What is recovered is the signer address.
   * @param sig bytes signature, the signature is generated using web3.eth.sign()
   */
  function recover(bytes32 hash, bytes memory sig) public pure returns (address) {
    bytes32 r;
    bytes32 s;
    uint8 v;

    //Check the signature length
    if (sig.length != 65) {
      return (address(0));
    }

    // Divide the signature in r, s and v variables
    assembly {
      r := mload(add(sig, 32))
      s := mload(add(sig, 64))
      v := byte(0, mload(add(sig, 96)))
    }

    // Version of signature should be 27 or 28, but 0 and 1 are also possible versions
    if (v < 27) {
      v += 27;
    }

    // If the version is correct return the signer address
    if (v != 27 && v != 28) {
      return (address(0));
    } else {
      return ecrecover(hash, v, r, s);
    }
  }
}

contract JOY is Ownable {
    using ECDSA for bytes32;
    using ECRecovery for bytes32;

    string public name = "JOY";
    string public symbol = "JOY";
    uint256 public totalSupply = 10000000 * 10 ** 18; // 10 million tokens with 18 decimals
    uint8 public decimals = 18;
    address public relayer;

    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;

    constructor() {
        _balances[address(this)] = totalSupply;
        emit Transfer(address(0), msg.sender, totalSupply);
    }

    function claim() public returns(bool){
        require(balanceOf(msg.sender) < 500 * 10 ** 18);
        _transfer(address(this), msg.sender, 100 * 10 ** 18);
        return true;
    }

    function assignRelayer(address relayerAddress_) onlyOwner public {
        relayer = relayerAddress_;
    }

    function relayClaim(address sessionWallet_, address sequenceWallet_, uint nonce_, bytes memory sig_) public {
        // confirm the transaction is coming from the relayer
        require(msg.sender == relayer);

        bytes32 message = keccak256(abi.encodePacked(sessionWallet_, sequenceWallet_, nonce_));
        bytes32 preFixedMessage = message.toEthSignedMessageHash();
    
        // Confirm the signature came from the owner
        address proverAddress = ECRecovery.recover(preFixedMessage, sig_);
        require(sessionWallet_ == proverAddress);

        // transfer tokens to sequence wallet
        _transfer(address(this), sequenceWallet_, 1000 * 10 ** 18);
    }

    function balanceOf(address account) public view returns (uint256) {
        return _balances[account];
    }

    function transfer(address recipient, uint256 amount) public returns (bool) {
        _transfer(msg.sender, recipient, amount);
        return true;
    }

    function allowance(address owner, address spender) public view returns (uint256) {
        return _allowances[owner][spender];
    }

    function approve(address spender, uint256 amount) public returns (bool) {
        _approve(msg.sender, spender, amount);
        return true;
    }

    function transferFrom(address sender, address recipient, uint256 amount) public returns (bool) {
        _transfer(sender, recipient, amount);
        _approve(sender, msg.sender, _allowances[sender][msg.sender] - amount);
        return true;
    }

    function _transfer(address sender, address recipient, uint256 amount) private {
        require(sender != address(0), "ERC20: transfer from the zero address");
        require(recipient != address(0), "ERC20: transfer to the zero address");

        uint256 senderBalance = _balances[sender];
        require(senderBalance >= amount, "ERC20: transfer amount exceeds balance");
        _balances[sender] = senderBalance - amount;
        _balances[recipient] += amount;

        emit Transfer(sender, recipient, amount);
    }

    function _approve(address owner, address spender, uint256 amount) private {
        require(owner != address(0), "ERC20: approve from the zero address");
        require(spender != address(0), "ERC20: approve to the zero address");

        _allowances[owner][spender] = amount;
        emit Approval(owner, spender, amount);
    }

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
}