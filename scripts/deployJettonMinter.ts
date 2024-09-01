import { Address, toNano } from '@ton/core';
import { JettonMinter, JettonMinterContent, jettonContentToCell, jettonMinterConfigToCell } from '../wrappers/JettonMinter';
import { compile, NetworkProvider, UIProvider} from '@ton/blueprint';
import { promptAddress, promptBool, promptUrl } from '../wrappers/ui-utils';

const formatUrl = "https://pink-ultimate-dove-351.mypinata.cloud/ipfs/QmX1UrB4h5QEi9fkcfpymmmSbnmEcxBawbpE2Zipy4LSQn?pinataGatewayToken=aImZD31wQDsYSjU0XFPjdm2hEF7pTd9pP2WI8uy-lcWMbtiOAc6dck-_CBQmhho8";
const exampleContent = {
                          "name": "Sample Jetton",
                          "description": "Sample of Jetton",
                          "symbol": "JTN",
                          "decimals": 0,
                          "image": "https://www.svgrepo.com/download/483336/coin-vector.svg"
                       };
const urlPrompt = 'Please specify url pointing to jetton metadata(json):';

export async function run(provider: NetworkProvider) {
    const ui       = provider.ui();
    const sender   = provider.sender();
    const adminPrompt = `Please specify admin address`;
    ui.write(`Jetton deployer\nCurrent deployer onli supports off-chain format:${formatUrl}`);

    let admin      =  sender.address;
    console.log(admin);
    // ui.write(`Admin address:${admin}\n`);
    // let contentUrl = await promptUrl(urlPrompt, ui);
    // ui.write(`Jetton content url:${contentUrl}`);

    // let dataCorrect = false;
    // do {
    //     ui.write("Please verify data:\n")
    //     ui.write(`Admin:${admin}\n\n`);
    //     ui.write('Metadata url:' + contentUrl);
    //     dataCorrect = await promptBool('Is everything ok?(y/n)', ['y','n'], ui);
    //     if(!dataCorrect) {
    //         const upd = await ui.choose('What do you want to update?', ['Admin', 'Url'], (c) => c);

    //         if(upd == 'Admin') {
    //             admin = await promptAddress(adminPrompt, ui, sender.address);
    //         }
    //         else {
    //             contentUrl = await promptUrl(urlPrompt, ui);
    //         }
    //     }

    // } while(!dataCorrect);


    const content = jettonContentToCell({type:1,uri: formatUrl});

    const wallet_code = await compile('JettonWallet');

    const minter  = JettonMinter.createFromConfig({admin: admin!,
                                                  content,
                                                  wallet_code,
                                                  }, 
                                                  await compile('JettonMinter'));

                                                  const jettonMinter = provider.open(
                                                    minter
                                                );

    await jettonMinter.sendDeploy(provider.sender(), toNano('0.05'));
    await provider.waitForDeploy(jettonMinter.address);


}
