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

  const largest10Txs = allTxs
    .sort(
      (a, b) =>
        b.vout.reduce((sum, v) => sum + v.value, 0) -
        a.vout.reduce((sum, v) => sum + v.value, 0)
    )
    .slice(0, 10);

  const largest10TxOutput = [];

  for (const tx of largest10Txs) {
    const value = tx.vout.reduce((sum, v) => sum + v.value, 0);

    const vin = tx.vin;
    const vinTxids = vin.map((v) => v.txid);
    const vinDetails = await Promise.all(vinTxids.map((id) => getTx(id)));

    const vinVouts = vin.map((v) => v.vout);
    const vinVoutAddresses = vinDetails.map((t, index) => {
      const voutIndex = vinVouts[index];
      if (!t || !t.vout[voutIndex]) return "unknown";
      return t.vout[voutIndex].scriptPubKey.address;
    });
    const senderAddresses = vinVoutAddresses;

    const receiverAddresses = tx.vout.map((v) => v.scriptPubKey.address);

    largest10TxOutput.push({ value, senderAddresses, receiverAddresses });
  }

  console.log(largest10TxOutput);
}

main();
