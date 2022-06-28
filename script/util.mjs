import { Abi, ContractPromise, CodePromise } from "@polkadot/api-contract";
import { compactStripLength } from "@polkadot/util";
import { ApiPromise } from "@polkadot/api";
import { Keyring } from "@polkadot/keyring";
import { cryptoWaitReady } from "@polkadot/util-crypto";
import { createRequire } from "module";
import fs from "fs";

let require = createRequire(import.meta.url);
let gasLimit = 100000n * 1000000n;

export let setup_signer = async () => {
  await cryptoWaitReady();
  let keyring = new Keyring({ type: "sr25519" });
  return keyring.addFromUri("//Alice");
};

export let setup_api = async () => {
  let signer = await setup_signer();
  let api = await ApiPromise.create({ signer: signer });
  await api.isReady;
  return [api, signer];
};

export let proxy = async (proxy, contract) => {
  let [api, _] = await setup_api();
  return new ContractPromise(api, contract.abi, proxy.address);
};

export let deploy_contract = async (name, ...args) => {
  let [api, signer] = await setup_api();
  let path = `../contracts/${name}/target/ink`;
  let metadata = require(`${path}/metadata.json`);
  let wasm = fs.readFileSync(`${path}/${name}.wasm`);
  let abi = new Abi(metadata, api.registry.getChainProperties());
  let code = new CodePromise(api, abi, wasm);
  return await new Promise(async (res, _) => {
    let fn = args
      ? code.tx.new(0, gasLimit, ...args)
      : code.tx.new(0, gasLimit);
    await fn.signAndSend(signer, (result) => {
      if (result.contract) res(result.contract);
    });
  });
};

export let tx = async (contract, method, value = 0, ...args) => {
  let [_, signer] = await setup_api();
  return await new Promise(async (res, rej) => {
    await contract.tx[method]({ gasLimit, value }, ...args).signAndSend(
      signer,
      (result) => {
        if (result.isInBlock) res();
      }
    );
  });
};

export let diamond_cut = (contract, init_method, ignore_selectors = []) => {
  let hash = contract.abi.json.source.hash;
  let init = contract.abi.messages.find((x) => x.method == init_method);
  let messages = contract.abi.messages.filter(
    (message) => !ignore_selectors.some((s) => message.identifier.includes(s))
  );
  let selectors = messages.map((x) => x.selector);
  let cut = [[hash, selectors]];
  return { cut, hash, selectors, init };
};

export let encode = (contract, method, value) => {
  let fn = contract.abi.messages.find((x) => x.method == method);
  let dataWithSelector = fn.toU8a([value]);
  let data = new Uint8Array(dataWithSelector.length - 4);
  let dataLength = dataWithSelector[0];
  dataLength -= 4 * 4;
  data.set([dataLength]);
  data.set(dataWithSelector.slice(5), 1);
  // Why do I need to do this?
  data[1] = data[1] - 4;
  return data;
};

export let decode = async (type, res) => {
  let [api, _] = await setup_api();
  return api.createType(type, compactStripLength(res.output.toU8a())[1]);
};

export let tx_diamond_cut = async (contract, facet, input = []) => {
  let args = [facet.hash, facet.init.selector, input];
  await tx(contract, "diamond::diamondCut", undefined, facet.cut, args);
};

export let query = async (contract, method, ...args) => {
  let [_, signer] = await setup_api();
  return await contract.query[method](signer.address, { gasLimit }, ...args);
};
