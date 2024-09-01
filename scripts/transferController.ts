import { Address, beginCell, Cell, ContractProvider, fromNano, OpenedContract, toNano } from '@ton/core';
import { compile, sleep, NetworkProvider, UIProvider} from '@ton/blueprint';
import { JettonMinter } from '../wrappers/JettonMinter';
import { getHttpEndpoint, Network } from "@orbs-network/ton-access";
import { WalletContractV4, TonClient } from "@ton/ton";
import { promptBool, promptAmount, promptAddress, displayContentCell, waitForTransaction } from '../wrappers/ui-utils';
import { JettonWallet } from '../wrappers/JettonWallet';
let minterContract:OpenedContract<JettonMinter>;
let  jettonWallet:OpenedContract<JettonWallet>;
const adminActions  = ['Mint', 'Change admin'];
const userActions   = ['Info', 'Quit'];


export const getClient = async function (){
    const endpoint = await getHttpEndpoint({network: "mainnet"}); // get the decentralized RPC endpoint
    return new TonClient({ endpoint }); // initialize ton library
  
  }
const failedTransMessage = (ui:UIProvider) => {
    ui.write("Failed to get indication of transaction completion from API!\nCheck result manually, or try again\n");

};

const infoAction = async (provider:NetworkProvider, ui:UIProvider) => {
    const jettonData = await minterContract.getJettonData();
    ui.write("Jetton info:\n\n");
    ui.write(`Admin:${jettonData.adminAddress}\n`);
    ui.write(`Total supply:${fromNano(jettonData.totalSupply)}\n`);
    ui.write(`Mintable:${jettonData.mintable}\n`);
    const displayContent = await ui.choose('Display content?', ['Yes', 'No'], (c) => c);
    if(displayContent == 'Yes') {
        displayContentCell(jettonData.content, ui);
    }
};
const changeAdminAction = async(provider:NetworkProvider, ui:UIProvider) => {
    let retry:boolean;
    let newAdmin:Address;

   let curAdmin = await minterContract.getAdminAddress();
    const client =  await getClient();
    const mintContractAddress = Address.parse('EQD_GZls9HhMJGp26xDmSHBNTk7BXBQ5dUAe7Us20hr_-zuo'); 
    const contractProvider = client.provider(mintContractAddress);
    do {
        retry = false;
        newAdmin = await promptAddress('Please specify new admin address:', ui);
        if(newAdmin.equals(curAdmin)) {
            retry = true;
            ui.write("Address specified matched current admin address!\nPlease pick another one.\n");
        }
        else {
            ui.write(`New admin address is going to be:${newAdmin}\nKindly double check it!\n`);
            retry = !(await promptBool('Is it ok?(yes/no)', ['yes', 'no'], ui));
        }
    } while(retry);

    const curState = await contractProvider.getState();
    if(curState.last === null)
        throw("Last transaction can't be null on deployed contract");

    await minterContract.sendChangeAdmin(provider.sender(), newAdmin);
    const transDone = await waitForTransaction(contractProvider,
                                               minterContract.address,
                                               curState.last.lt,
                                               10);
    if(transDone) {
        const adminAfter = await minterContract.getAdminAddress();
        if(adminAfter.equals(newAdmin)){
            ui.write("Admin changed successfully");
        }
        else {
            ui.write("Admin address hasn't changed!\nSomething went wrong!\n");
        }
    }
    else {
            }
};

const mintAction = async (provider:NetworkProvider, ui:UIProvider) => {
    const sender = provider.sender();
    console.log("admin address", sender.address);
    let retry:boolean;
    let mintAddress:Address;
    let mintAmount:string;
    let forwardAmount:string;
    const client =  await getClient();
    const mintContractAddress = Address.parse('EQD_GZls9HhMJGp26xDmSHBNTk7BXBQ5dUAe7Us20hr_-zuo'); 
    const contractProvider:  ContractProvider = client.provider(mintContractAddress);
    do {
        retry = false;
        const fallbackAddr = sender.address ?? await minterContract.getAdminAddress();
        mintAddress = await promptAddress(`Please specify address to mint to`, ui, fallbackAddr);
        mintAmount  = await promptAmount('Please provide mint amount in decimal form:', ui);
        ui.write(`Mint ${mintAmount} tokens to ${mintAddress}\n`);
        retry = !(await promptBool('Is it ok?(yes/no)', ['yes', 'no'], ui));
    } while(retry);

    ui.write(`Minting ${mintAmount} to ${mintAddress}\n`);
    const supplyBefore = await minterContract.getTotalSupply();
    const nanoMint     = toNano(mintAmount);
    const curState     = await contractProvider.getState();

    if(curState.last === null)
        throw("Last transaction can't be null on deployed contract");

       await minterContract.sendMint(sender,
                                              mintAddress,
                                              nanoMint,
                                              toNano('0.05'),
                                              toNano('0.1'));
    const gotTrans = await waitForTransaction(contractProvider,
                                              minterContract.address,
                                              curState.last.lt,
                                              10);
    if(gotTrans) {
        const supplyAfter = await minterContract.getTotalSupply();

        if(supplyAfter == supplyBefore + nanoMint) {
            ui.write("Mint successfull!\nCurrent supply:" + fromNano(supplyAfter));
        }
        else {
            ui.write("Mint failed!");
        }
    }
    else {
        failedTransMessage(ui);
    }
}

const  loop = async (provider:NetworkProvider)=>{

 const sender = provider.sender();
 const client =  await getClient();
 const  out = provider.sender().address;
 const walletAddress = await minterContract.getWalletAddress(sender.address!)
 const walletProvider:  ContractProvider = client.provider(walletAddress);
 jettonWallet = walletProvider.open(JettonWallet.createFromAddress(walletAddress));
  


}
export async function run(provider: NetworkProvider) {
    const ui = provider.ui();
    const sender = provider.sender();
    const hasSender = sender.address !== undefined;
    const api    = provider.api()
    const minterCode = await compile('JettonMinter');
    let   done   = false;
    let   retry:boolean;
    let   minterAddress:Address;
    const client =  await getClient();
    const mintContractAddress = Address.parse('EQD_GZls9HhMJGp26xDmSHBNTk7BXBQ5dUAe7Us20hr_-zuo'); 
    const contractProvider:  ContractProvider = client.provider(mintContractAddress);
    // do {
    //     retry = false;
    //     minterAddress = await promptAddress('Please enter minter address:', ui);
    //     const contractState = await contractProvider.getState();
    //     if(contractState.last ==null) {
    //         retry = true;
    //         ui.write("This contract is not active!\nPlease use another address, or deploy it firs");
    //     }
    //     else {
    //         const stateCode = Cell.fromBoc(contractState.code)[0];
    //         if(!stateCode.equals(minterCode)) {
    //             ui.write("Contract code differs from the current contract version!\n");
    //             const resp = await ui.choose("Use address anyway", ["Yes", "No"], (c) => c);
    //             retry = resp == "No";
    //         }
    //     }
    // } while(retry);

    minterContract = provider.open(JettonMinter.createFromAddress(mintContractAddress));
    const isAdmin  = hasSender ? (await minterContract.getAdminAddress()).equals(sender.address) : true;
    
}
