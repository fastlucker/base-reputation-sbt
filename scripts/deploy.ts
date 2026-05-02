import hre from "hardhat";
import { getAddress } from "viem";
import { privateKeyToAccount } from "viem/accounts";

async function main() {
  const treasury = process.env.TREASURY_ADDRESS;
  const attesterPrivateKey = process.env.ATTESTER_PRIVATE_KEY;

  if (!treasury) throw new Error("Missing TREASURY_ADDRESS in env");
  if (!attesterPrivateKey) throw new Error("Missing ATTESTER_PRIVATE_KEY in env");

  const attester = privateKeyToAccount(attesterPrivateKey as `0x${string}`).address;

  const contract = await hre.viem.deployContract("BaseReputationSBT", [
    getAddress(treasury),
    getAddress(attester)
  ]);

  console.log("BaseReputationSBT deployed to:", contract.address);
  console.log("Treasury:", getAddress(treasury));
  console.log("Attester:", attester);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
