import hre from "hardhat";

async function main() {
  console.log("Deploying MeshTabAgoraLedger to Monad Testnet for Official Agora AUSD (0xa9012a055bd4e0eDfF8Ce09f960291C09D5322dC)...");
  const MeshTabAgoraLedger = await hre.ethers.getContractFactory("MeshTabAgoraLedger");
  const ledger = await MeshTabAgoraLedger.deploy();
  await ledger.waitForDeployment();
  const ledgerAddress = await ledger.getAddress();
  
  console.log(`✅ MeshTabAgoraLedger deployed to: ${ledgerAddress}`);
  console.log("Explorer: https://testnet.monadscan.com/address/" + ledgerAddress);
  console.log("\nDeployment Complete!");
}

main().catch((error) => {
  console.error("Deployment failed:", error);
  process.exitCode = 1;
});
