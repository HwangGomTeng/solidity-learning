import hre from "hardhat";
import { expect } from "chai";
import { MyToken } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

/*

  1. approve : signer1에게 signer0의 자산 이동권한 부여
  2. transferFrom: signer1이 signer0의 MT토큰을 자신의 주소(signer1)에게 전송
  3. balance확인

*/

const mintingAmount = 100n;
const decimals = 18n;
const fmt = (v: bigint) => hre.ethers.formatUnits(v, decimals) + " MT";

describe("My Token", () => {
  let myTokenC: MyToken;
  let signers: HardhatEthersSigner[];
  beforeEach("should deploy", async () => {
    signers = await hre.ethers.getSigners();
    myTokenC = await hre.ethers.deployContract("MyToken", [
      "MyToken",
      "MT",
      18,
      100,
    ]);
  });
  describe("Basic state value check", () => {
    it("should return name", async () => {
      expect(await myTokenC.name()).equal("MyToken");
    });
    it("should return symbol", async () => {
      expect(await myTokenC.symbol()).equal("MT");
    });
    it("should return decimals", async () => {
      expect(await myTokenC.decimals()).equal(decimals);
    });
    it("should return 100 totalSupply", async () => {
      expect(await myTokenC.totalSupply()).equal(
        mintingAmount * 10n ** decimals,
      );
    });
  });

  // 1MT = 1 * 10^18
  describe("Mint", () => {
    it("should return 1MT balance for signer 0", async () => {
      const signer0 = signers[0];
      expect(await myTokenC.balanceOf(signer0)).equal(
        mintingAmount * 10n ** decimals,
      );
    });
  });
  describe("Transfer", () => {
    it("should have 0.5MT", async () => {
      const signer0 = signers[0];
      const signer1 = signers[1];
      await expect(
        await myTokenC.transfer(
          hre.ethers.parseUnits("0.5", decimals),
          signer1.address,
        ),
      )
        .to.emit(myTokenC, "Transfer")
        .withArgs(
          signer0.address,
          signer1.address,
          hre.ethers.parseUnits("0.5", decimals),
        );
      expect(await myTokenC.balanceOf(signer1.address)).equal(
        hre.ethers.parseUnits("0.5", decimals),
      );
      const filter = myTokenC.filters.Transfer(signer0.address);
      const logs = await myTokenC.queryFilter(filter, 0, "latest");
    });
    it("should be reverted with insufficient balance error", async () => {
      const signers = await hre.ethers.getSigners();
      const signer1 = signers[1];
      await expect(
        myTokenC.transfer(
          hre.ethers.parseUnits((mintingAmount + 1n).toString(), decimals),
          signer1.address,
        ),
      ).to.be.revertedWith("insufficient balance");
    });
  });
  describe("TransferFrom", () => {
    it("should emit Approval event", async () => {
      const signer1 = signers[1];
      await expect(
        myTokenC.approve(
          signer1.address,
          hre.ethers.parseUnits("10", decimals),
        ),
      )
        .to.emit(myTokenC, "Approval")
        .withArgs(signer1.address, hre.ethers.parseUnits("10", decimals));
    });
    //--------------------------------------------------------------------------------------------------------------------
    //권한이 없으면 막히는가?(무시) => o
    it("should be reverted with insufficient allowance error", async () => {
      const signer0 = signers[0];
      const signer1 = signers[1];
      await expect(
        myTokenC.connect(signer1).transferFrom(
          signer0.address,
          signer1.address,
          hre.ethers.parseUnits("7", decimals), //3MT 보내려는 시도******************************
        ),
      ).to.be.revertedWith("insufficient allowance");
    });
    //--------------------------------------------------------------------------------------------------------------------
    //권한을 주고 보내면 잘 보내지는가? => o
    it("should transfer 1MT to signer1 after approve", async () => {
      const signer0 = signers[0];
      const signer1 = signers[1];
      const amount = hre.ethers.parseUnits("5", decimals); //1MT 보내려는 시도 *******************************

      //0. 초기 signer0, signer1의 balance 확인
      console.log(
        "signer0 balance:",
        fmt(await myTokenC.balanceOf(signer0.address)),
      );
      console.log(
        "signer1 balance:",
        fmt(await myTokenC.balanceOf(signer1.address)),
      );

      //1. approve : signer1에게 signer0의 자산 이동권한 부여
      await myTokenC.approve(signer1.address, amount);
      console.log("===== 1) approve 완료 =====");
      console.log(
        "allowance(signer0 -> signer1):",
        fmt(await myTokenC.allowance(signer0.address, signer1.address)),
      );
      //-------------------------------------------------------------------------------------------------------------------
      //2. transferFrom: signer1이 signer0의 MT토큰을 자신의 주소(signer1)에게 전송
      const tx = await myTokenC
        .connect(signer1)
        .transferFrom(signer0.address, signer1.address, amount);
      const receipt = await tx.wait();
      console.log("===== 2) transferFrom 완료 =====");
      console.log("tx hash:", tx.hash);
      console.log("gas used:", receipt?.gasUsed.toString());

      console.log("===== 3) balance 확인 =====");
      console.log(
        "signer0 balance:",
        fmt(await myTokenC.balanceOf(signer0.address)),
      );
      console.log(
        "signer1 balance:",
        fmt(await myTokenC.balanceOf(signer1.address)),
      );
      console.log(
        "남은 allowance:",
        fmt(await myTokenC.allowance(signer0.address, signer1.address)),
      );

      //3. balance확인
      expect(await myTokenC.balanceOf(signer1.address)).equal(amount);
      expect(await myTokenC.allowance(signer0.address, signer1.address)).equal(
        0n,
      );
    });
    //--------------------------------------------------------------------------------------------------------------------
    //민팅한 양보다 더 많은 양을 보내려 하면 에러가 나는가 => o
    it("should be reverted when sending more than minted amount", async () => {
      const signer0 = signers[0];
      const signer1 = signers[1];
      const tooMuch = hre.ethers.parseUnits(
        (mintingAmount + 1n).toString(),
        decimals,
      );

      await myTokenC.approve(signer1.address, tooMuch);

      await expect(
        myTokenC
          .connect(signer1)
          .transferFrom(signer0.address, signer1.address, tooMuch),
      ).to.be.revertedWith("insufficient balance");

      // 3) balance 확인
      console.log("===== 3) balance 확인 =====");
      console.log(
        "signer0 balance:",
        fmt(await myTokenC.balanceOf(signer0.address)),
      );
      console.log(
        "signer1 balance:",
        fmt(await myTokenC.balanceOf(signer1.address)),
      );
      console.log(
        "남은 allowance:",
        fmt(await myTokenC.allowance(signer0.address, signer1.address)),
      );
    });
  });
});
