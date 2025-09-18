const myHeaders = new Headers();
myHeaders.append("Content-Type", "application/json");

const getBlockCount = async () => {
  const raw = JSON.stringify({
    id: 1,
    jsonrpc: "2.0",
    method: "getblockcount",
  });

  const requestOptions = {
    method: "POST",
    headers: myHeaders,
    body: raw,
    redirect: "follow",
  };

  return fetch("https://docs-demo.btc.quiknode.pro/", requestOptions)
    .then((response) => response.json())
    .then((result) => {
      return result.result;
    })
    .catch((error) => console.log("error", error));
};

const getBlockHash = async (height) => {
  const raw = JSON.stringify({
    id: 1,
    jsonrpc: "2.0",
    method: "getblockhash",
    params: [height],
  });

  const requestOptions = {
    method: "POST",
    headers: myHeaders,
    body: raw,
    redirect: "follow",
  };

  return fetch("https://docs-demo.btc.quiknode.pro/", requestOptions)
    .then((response) => response.json())
    .then((result) => result.result)
    .catch((error) => console.log("error", error));
};

const getBlock = async (hash) => {
  const raw = JSON.stringify({
    id: 1,
    jsonrpc: "2.0",
    method: "getblock",
    params: [hash, 3],
  });

  const requestOptions = {
    method: "POST",
    headers: myHeaders,
    body: raw,
    redirect: "follow",
  };

  return fetch("https://docs-demo.btc.quiknode.pro/", requestOptions)
    .then((response) => response.json())
    .then((result) => result.result)
    .catch((error) => console.log("error", error));
};

const getTx = async (txid) => {
  const raw = JSON.stringify({
    id: 1,
    jsonrpc: "2.0",
    method: "getrawtransaction",
    params: [txid, 2],
  });

  const requestOptions = {
    method: "POST",
    headers: myHeaders,
    body: raw,
    redirect: "follow",
  };

  return fetch("https://docs-demo.btc.quiknode.pro/", requestOptions)
    .then((response) => response.json())
    .then((result) => result.result)
    .catch((error) => console.log("error", error));
};

async function main() {
  const height = await getBlockCount();
  const hash = await getBlockHash(height);

  const lastHourBlocks = [];

  //  each block returns previous block hash and the median time in UNIX epoch time of the block
  // we will loop until we reach blocks older than 1 hour
  let currentHash = hash;
  let currentBlock = await getBlock(currentHash);
  let currentBlockTime = currentBlock.time;
  const oneHourAgo = Math.floor(Date.now() / 1000) - 3600;

  while (currentBlockTime > oneHourAgo) {
    lastHourBlocks.push(currentBlock);
    currentHash = currentBlock.previousblockhash;
    currentBlock = await getBlock(currentHash);
    currentBlockTime = currentBlock.time;
  }

  const allTxs = lastHourBlocks.flatMap((block) => block.tx);

  const largestTx = allTxs.sort(
    (a, b) =>
      b.vout.reduce((sum, v) => sum + v.value, 0) -
      a.vout.reduce((sum, v) => sum + v.value, 0)
  )[0];

  const value = largestTx.vout.reduce((sum, v) => sum + v.value, 0);
  const vin = largestTx.vin;
  const vinTxids = vin.map((v) => v.txid);
  const vinVouts = vin.map((v) => v.vout);
  const vinDetails = await Promise.all(vinTxids.map((id) => getTx(id)));
  const vinVoutAddresses = vinDetails.map((tx, index) => {
    const voutIndex = vinVouts[index];
    return tx.vout[voutIndex].scriptPubKey.address;
  });
  const senderAddresses = vinVoutAddresses;
  const receiverAddresses = largestTx.vout.map((v) => v.scriptPubKey.address);

  console.log(`The largest transaction in the last hour was ${value} BTC`);
  console.log("Sender addresses details:", senderAddresses);
  console.log("Receiver addresses details:", receiverAddresses);
}

main();
