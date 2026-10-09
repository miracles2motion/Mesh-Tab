import hre from "hardhat";

async function main() {
  const [signer] = await hre.ethers.getSigners();
  console.log("Using signer/deployer:", signer.address);

  const monBalance = await hre.ethers.provider.getBalance(signer.address);
  console.log("MON balance:", hre.ethers.formatEther(monBalance));

  const AGORA_AUSD_ADDRESS = "0xa9012a055bd4e0eDfF8Ce09f960291C09D5322dC";
  const AGORA_FAUCET_ADDRESS = "0xd236c18D274E54FAccC3dd9DDA4b27965a73ee6C";
  const AISHA_CREDITOR_ADDRESS = "0x000000000000000000000000000000000000A154";
  const SETTLEMENT_AMOUNT_UNITS = 16770000n; // 16.77 AUSD (6 decimals)

  // 1. Check AUSD balance
  const ausdAbi = [
    "function balanceOf(address owner) view returns (uint256)",
    "function approve(address spender, uint256 amount) returns (bool)",
    "function decimals() view returns (uint8)"
  ];
  const ausd = new hre.ethers.Contract(AGORA_AUSD_ADDRESS, ausdAbi, signer);

  let currentAusd = await ausd.balanceOf(signer.address);
  console.log("Current Agora AUSD balance:", hre.ethers.formatUnits(currentAusd, 6));

  // 2. Claim from faucet if needed
  if (currentAusd < SETTLEMENT_AMOUNT_UNITS) {
    console.log("\nCalling Agora Faucet (0xd236c...) to claim testnet AUSD...");
    const faucetAbi = [
      "function requestFunds(address _receiver) external"
    ];
    const faucet = new hre.ethers.Contract(AGORA_FAUCET_ADDRESS, faucetAbi, signer);
    const faucetTx = await faucet.requestFunds(signer.address);
    console.log("Faucet TX submitted:", faucetTx.hash);
    await faucetTx.wait();
    console.log("✅ Successfully claimed from Agora Faucet!");

    currentAusd = await ausd.balanceOf(signer.address);
    console.log("Updated Agora AUSD balance:", hre.ethers.formatUnits(currentAusd, 6));
  }

  // 3. Deploy MeshTabAgoraLedger
  console.log("\nDeploying MeshTabAgoraLedger to Monad Testnet...");
  const MeshTabAgoraLedger = await hre.ethers.getContractFactory("MeshTabAgoraLedger");
  const ledger = await MeshTabAgoraLedger.deploy();
  await ledger.waitForDeployment();
  const ledgerAddress = await ledger.getAddress();
  console.log(`✅ MeshTabAgoraLedger deployed at: ${ledgerAddress}`);

  // 4. Approve ledger to spend 16.77 AUSD
  console.log(`\nApproving MeshTabAgoraLedger to spend 16.77 AUSD...`);
  const approveTx = await ausd.approve(ledgerAddress, SETTLEMENT_AMOUNT_UNITS);
  console.log("Approve TX submitted:", approveTx.hash);
  await approveTx.wait();
  console.log("✅ Allowance approved!");

  // 5. Call payNettedDebt for Lisbon benchmark ($16.77)
  console.log(`\nExecuting settlement: Ben pays Aisha $16.77 AUSD for 'lisbon-24'...`);
  const payTx = await ledger.payNettedDebt("lisbon-24", AISHA_CREDITOR_ADDRESS, SETTLEMENT_AMOUNT_UNITS);
  console.log("Settlement TX submitted:", payTx.hash);
  const receipt = await payTx.wait();
  console.log("✅ Settlement successfully confirmed on-chain in block", receipt.blockNumber);

  console.log("\n========================================================");
  console.log("🎉 AGORA TESTNET PROOF REPORT");
  console.log("========================================================");
  console.log("Contract Address:", ledgerAddress);
  console.log("Contract Explorer URL: https://testnet.monadscan.com/address/" + ledgerAddress);
  console.log("Settlement TX Hash:", payTx.hash);
  console.log("Settlement Explorer URL: https://testnet.monadscan.com/tx/" + payTx.hash);
  console.log("Debtor (Ben):", signer.address);
  console.log("Creditor (Aisha):", AISHA_CREDITOR_ADDRESS);
  console.log("Settled Amount: $16.77 AUSD (16,770,000 units)");
  console.log("========================================================");
}

main().catch((error) => {
  console.error("Execution failed:", error);
  process.exitCode = 1;
});
