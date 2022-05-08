import { ethers, waffle } from "hardhat";
import { Contract } from "ethers";

const { expect } = require("chai");

describe("Founder Nft Contract", function () {
  let owner: any;
  let contract: Contract;
  let addr1: any;
  let addr2: any;
  const provider = waffle.provider;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();
    const FounderNft = await ethers.getContractFactory("FounderNft");
    contract = await FounderNft.deploy();
  });
  // Deployment//
  describe("Deployment", function () {
    it("Deploy should assign the role of 'owner' to the deployer", async function () {
      expect(await contract.owner()).to.equal(owner.address);
    });
    it("Total supply is 0 at deployment", async function () {
      const totalSupply = await contract.totalSupply();
      expect(totalSupply).to.equal(0);
    });
    it("Max supply is 70", async function () {
      const maxSupply = await contract.MAX_SUPPLY();
      expect(maxSupply).to.equal(70);
    });
    it("Minting cost is set to 0.069 ether", async function () {
      const cost = await contract.COST();
      expect(Number(ethers.utils.formatEther(cost))).to.equal(0.069);
    });
  });
  // Pause   //
  describe("Pause", function () {
    it("User can not pause the contract", async function () {
      await expect(contract.connect(addr1).pause()).to.be.revertedWith(
        "Ownable: caller is not the owner"
      );
      expect(await contract.paused()).to.equal(false);
    });
    it("Owner can pause the contract", async function () {
      await contract.connect(owner).pause();
      expect(await contract.paused()).to.equal(true);
    });
    it("User can not mint when contract is paused", async function () {
      await contract.connect(owner).pause();
      await expect(
        contract.connect(addr1)["mint()"]({
          value: ethers.utils.parseEther("0.069"),
        })
      ).to.be.revertedWith("Contract is paused");
      expect(await contract.paused()).to.equal(true);
    });
    it("Owner can not mint when the contract is paused", async function () {
      await contract.connect(owner).pause();
      await expect(contract["mint(uint256)"](1)).to.be.revertedWith(
        "Contract is paused"
      );
      expect(await contract.paused()).to.equal(true);
    });
    it("User can not resume the contract", async function () {
      await contract.connect(owner).pause();
      await expect(contract.connect(addr1).resume()).to.be.revertedWith(
        "Ownable: caller is not the owner"
      );
      expect(await contract.paused()).to.equal(true);
    });
    it("Owner can resume the contract", async function () {
      await contract.connect(owner).resume();
      expect(await contract.paused()).to.equal(false);
    });
  });
  // Mint//
  describe("Minting", function () {
    it("Mints 1 when no argument is passed", async function () {
      await contract.connect(addr1);
      await expect(
        contract["mint()"]({
          value: ethers.utils.parseEther("0.069"),
        })
      ).to.emit(contract, "Transfer");

      expect(await contract.totalSupply()).to.equal(1);
    });
    it("Bulk mints", async function () {
      await contract.connect(addr1);
      await expect(
        contract["mint(uint256)"](3, {
          value: ethers.utils.parseEther((0.069 * 3).toString()),
        })
      ).to.emit(contract, "Transfer");
    });
    it("User can not mint more than 5 token per session", async function () {
      await contract.connect(addr1);
      await expect(
        contract["mint(uint256)"](6, {
          value: ethers.utils.parseEther((0.069 * 6).toString()),
        })
      ).to.be.revertedWith("You can not mint more than 5 tokens per session");
    });
    it("User can not mint more than 5 tokens per wallet", async function () {
      await contract.connect(addr1);
      // mint 1 token first//
      await expect(
        contract["mint()"]({ value: ethers.utils.parseEther("0.069") })
      ).to.emit(contract, "Transfer");
      // now, we try to mint 5 more//
      await expect(
        contract["mint(uint256)"](5, {
          value: ethers.utils.parseEther((0.069 * 6).toString()),
        })
      ).to.be.revertedWith("A wallet can not mint more than 5 tokens");
    });
    it("Transaction is reverted if insufficient funds are provided", async function () {
      await contract.connect(addr1);
      await expect(
        contract["mint()"]({ value: ethers.utils.parseEther("0.068999") })
      ).to.be.reverted;
    });
    it("Total supply is updated after mint", async function () {
      const totalSupply = await contract.totalSupply();
      await contract.connect(addr1);
      await expect(
        contract["mint()"]({ value: ethers.utils.parseEther("0.069") })
      ).to.emit(contract, "Transfer");
      expect(await contract.totalSupply()).to.equal(totalSupply + 1);
    });
  });
  describe("Withdrawals", function () {
    it("User can not withdraw funds", async function () {
      await expect(contract.connect(addr1).withdrawFunds()).to.be.revertedWith(
        "Ownable: caller is not the owner"
      );
    });
    it("No withdrawal if no funds are available", async function () {
      await expect(contract.connect(owner).withdrawFunds()).to.be.revertedWith(
        "No ether left to withdraw"
      );
    });
    it("Owner can withdraw funds", async function () {
      await expect(
        contract.connect(addr1)["mint(uint256)"](5, {
          value: ethers.utils.parseEther((5 * 0.069).toString()),
        })
      ).to.emit(contract, "Transfer");

      const contractBalance = ethers.utils.formatEther(
        (await provider.getBalance(contract.address)).toString()
      );

      const ownerBalance = ethers.utils.formatEther(
        (await provider.getBalance(owner.address)).toString()
      );

      let tx: any;
      await expect(
        (tx = await contract.connect(owner).withdrawFunds())
      ).to.emit(contract, "Withdraw");

      const receipt = await tx.wait();
      const gasSpent = ethers.utils.formatEther(
        receipt.cumulativeGasUsed.mul(receipt.effectiveGasPrice)
      );
      // a little formatting to only take 10 numbers after decimal as their are some very tiny(negligible) difference that - due to transaction.
      // Example : AssertionError: expected 9999.839771619336 to equal 9999.839771619334
      expect(
        Number(
          ethers.utils.formatEther(await provider.getBalance(owner.address))
        ).toFixed(10)
      ).to.equal(
        Number(
          Number(ownerBalance) + Number(contractBalance) - Number(gasSpent)
        ).toFixed(10)
      );
    });
  });
  describe("Transfer Ownership", function () {
    it("User can not transfer ownership", async function () {
      await expect(
        contract.connect(addr1).transferOwnership(addr2.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
    it("Owner can transfer ownership", async function () {
      await contract.connect(owner).transferOwnership(addr2.address);

      // now that addr2 is owner, it should be able to pause the contract//
      await contract.connect(addr2).pause();
      expect(await contract.paused()).to.be.equal(true);
    });
  });
  describe("Batch mint", function () {
    it("User can not batch mint", async function () {
      await expect(contract.connect(addr1).mintBatch(100)).to.be.revertedWith(
        "Ownable: caller is not the owner"
      );
    });
    it("Owner can mint a batch", async function () {
      await expect(contract.connect(owner).mintBatch(100)).to.emit(
        contract,
        "Transfer"
      );
      expect(await contract.totalSupply()).to.equal(100);
    });
    it("Owner can not mint more than 100 tokens in a batch", async function () {
      await expect(contract.connect(owner).mintBatch(101)).to.revertedWith(
        "You can only mint 100 tokens in one batch"
      );
    });
  });
});
