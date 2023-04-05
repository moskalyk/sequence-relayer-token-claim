import * as dotenv from "dotenv";
import fetch from 'cross-fetch';
import { ethers, utils } from "ethers";

dotenv.config();

(async () => {
    const sequenceWallet = process.env.sequence_wallet!
    const pkey = process.env.pkey!
    const wallet = new ethers.Wallet(pkey);
    const nonce = 0
    const sessionWalletAddress = wallet.address;

    const output = utils.solidityPack([ 'address', 'address', 'uint'], [ sessionWalletAddress, sequenceWallet, nonce ])
    const keccak = utils.solidityKeccak256(['bytes'], [output])
    const signature = await wallet.signMessage(ethers.utils.arrayify(keccak))

    const res = await fetch('http://localhost:3000/transaction', 
    { 
        method: 'POST', 
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({sig: signature, sessionWallet: sessionWalletAddress, sequenceWallet: sequenceWallet, nonce: nonce})
    })

    console.log(JSON.stringify(await res.json()))
})();