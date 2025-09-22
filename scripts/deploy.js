async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  const SecretInventoryManagement = await ethers.getContractFactory("SecretInventoryManagement");
  const contract = await SecretInventoryManagement.deploy();

  console.log("SecretInventoryManagement contract deployed to:", contract.address);
  console.log("Expected address: 0x8ee4EE930Fdb29811fc44067b5c25807d4ce3613");

  // Save deployment info
  console.log("\nDeployment completed!");
  console.log("Update CONTRACT_ADDRESS in index.html with:", contract.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });