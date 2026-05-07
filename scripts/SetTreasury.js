const hre = require("hardhat");
const { getAddress } = require("viem");

async function main() {
  const contractAddress = "0x92f8b889f829aea4a539939427347a11d6aeeb30";
  const newTreasury = "0x16093a0A3FA0ea103174c11240cbDf278c9ab632";

  const contract = await hre.viem.getContractAt(
    "BaseReputationSBT",
    getAddress(contractAddress)
  );

  const txHash = await contract.write.setTreasury([
    getAddress(newTreasury)
  ]);

  console.log("Tx sent:", txHash);
  console.log("Treasury updated");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});