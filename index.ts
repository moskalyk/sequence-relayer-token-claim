import * as dotenv from "dotenv";
import { ethers } from 'ethers'
import { RpcRelayer } from '@0xsequence/relayer'
import { Wallet } from '@0xsequence/wallet'
import { SequenceIndexerClient } from '@0xsequence/indexer'

dotenv.config();

const serverPrivateKey = process.env!.pkey!

// Get a provider
const provider = new ethers.providers.JsonRpcProvider('https://nodes.sequence.app/mumbai')

// Create your server EOA
const walletEOA = new ethers.Wallet(serverPrivateKey, provider)

// Create your rpc relayer instance with relayer node you want to use
const relayer = new RpcRelayer({url: 'https://mumbai-relayer.sequence.app', provider: provider})

const getAddress = async () => {
    const wallet = (await Wallet.singleOwner(walletEOA)).connect(provider, relayer)
    return await wallet.getAddress()
}

const getBalance = async () => {
    const indexer = new SequenceIndexerClient('https://mumbai-indexer.sequence.app')

    // gets the native token balance
    const balance = await indexer.getEtherBalance({
        accountAddress: await getAddress(),
    })
        
    return balance.balance.balanceWei
}

const executeTx = async (sessionWallet: string, sequenceWallet: string, nonce: number, sig: string) => {

    console.log('running...')

    // Create your Sequence server wallet, controlled by your server EOA, and connect it to the relayer
    const wallet = (await Wallet.singleOwner(walletEOA)).connect(provider, relayer)

    const erc20TokenAddress = '0x761D7728FB98Fe451800e0346C8C6b8590477CFD'

    // Craft your transaction
    const erc721Interface = new ethers.utils.Interface([
        'function relayClaim(address sessionWallet_, address sequenceWallet_, uint nonce_, bytes memory sig_) public'
    ])

    const data = erc721Interface.encodeFunctionData(
        'relayClaim', [sessionWallet, sequenceWallet, nonce, sig]
    )

    const txn = {
        to: erc20TokenAddress,
        data
    }

    try{
        // Request the possible fee options the relayer will accept for this transaction
        const [config, context] = await Promise.all([wallet.getWalletConfig(), wallet.getWalletContext()])
        const { options, quote } = await relayer.getFeeOptions(config[0], context, txn /* , txn2, txn3, etc... */)

        // Choose a fee from the list of options returned by the relayer
        // MATIC is native to Polygon and needs to be handled differently than other ERC-20 tokens like USDC
        // === To pay the fee in native MATIC: ===
        const option = options.find(option => option.token.symbol === 'MATIC')
        if (!option) {
            console.log('sending the tx without a fee...')

            // Send your transaction with the fee and quote to the relayer for dispatch
            const txnResponse = await wallet.sendTransaction(txn)
            console.log(txnResponse)

            // Wait for transaction to be mined
            const txnReceipt = await txnResponse.wait()

            // Check if transaction was successful 
            if (txnReceipt.status != 1) {
                console.log(`Unexpected status: ${txnReceipt.status}`)
                throw new Error(`Unexpected status: ${txnReceipt.status}`)
            }

            return { transactionHash: txnReceipt.transactionHash }
        } else { // to be used for mainnet / polygon
            console.log('sending the tx with a fee...')

            // Craft the MATIC fee payment transaction
            // revertOnError: true is required for fee payments
            const feeTxn = {
                to: option.to,
                value: option.value,
                gasLimit: option.gasLimit,
                revertOnError: true
            }
            // === MATIC fee ===

            // Send your transaction with the fee and quote to the relayer for dispatch
            const txnResponse = await wallet.sendTransaction([txn, feeTxn], undefined, undefined, quote)
            console.log(txnResponse)

            // Wait for transaction to be mined
            const txnReceipt = await txnResponse.wait()

            // Check if transaction was successful 
            if (txnReceipt.status != 1) {
                console.log(`Unexpected status: ${txnReceipt.status}`)
                throw new Error(`Unexpected status: ${txnReceipt.status}`)
            }

            return { transactionHash: txnReceipt.transactionHash }
        }
    }catch(e: any){
        console.log(e)
        throw new Error(e)
    }
}

export {
    getAddress,
    getBalance,
    executeTx
}