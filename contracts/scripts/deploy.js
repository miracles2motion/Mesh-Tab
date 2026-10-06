import hre from "hardhat";

async function main() {
  console.log("Deploying MockAUSD to Monad Testnet...");
  const MockAUSD = await hre.ethers.getContractFactory("MockAUSD");
  const ausd = await MockAUSD.deploy();
  await ausd.waitForDeployment();
  const ausdAddress = await ausd.getAddress();
  console.log(`✅ MockAUSD deployed to: ${ausdAddress}`);

  console.log("\nDeploying MeshTabLedger...");
  const MeshTabLedger = await hre.ethers.getContractFactory("MeshTabLedger");
  const ledger = await MeshTabLedger.deploy(ausdAddress);
  await ledger.waitForDeployment();
  const ledgerAddress = await ledger.getAddress();
  
  console.log(`✅ MeshTabLedger deployed to: ${ledgerAddress}`);
  console.log("\nDeployment Complete!");
}

main().catch((error) => {
  console.error("Deployment failed:", error);
  process.exitCode = 1;
});
