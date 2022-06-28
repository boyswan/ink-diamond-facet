import * as util from "./util.mjs";

let filters = ["PSP", "Ownable"];

let run = async () => {
  let signer = await util.setup_signer();

  let diamond = await util.deploy_contract("diamond", signer.address);
  let psp22 = await util.deploy_contract("psp22");
  let flip = await util.deploy_contract("flip");

  let facet_psp = await util.diamond_cut(psp22, "initPsp22");
  let facet_flip = await util.diamond_cut(flip, "initFlip", filters);

  await util.tx_diamond_cut(diamond, facet_psp);
  await util.tx_diamond_cut(diamond, facet_flip);

  let proxy = await util.proxy(diamond, flip);
  let balance = await util.query(proxy, "getBalanceOfPspFacet", signer.address);

  console.log(balance);

  process.exit(0);
};

run();
