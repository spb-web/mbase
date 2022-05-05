const MBaseFarm = artifacts.require('MBaseFarm')
const EarningToken = artifacts.require('EarningToken')
const StakingToken = artifacts.require('StakingToken')
const rate = require('../stakingConfig/schedule.js')

module.exports = async (deployer) => {
  await deployer.deploy(EarningToken)
  await deployer.deploy(StakingToken)
  const earningTokenInstance = await EarningToken.deployed()
  const stakingTokenInstance = await StakingToken.deployed()

  await deployer.deploy(
    MBaseFarm,
    stakingTokenInstance.address,
    earningTokenInstance.address,
  )
  const mBaseFarmInstance = await MBaseFarm.deployed()
  const totalDistribution = await mBaseFarmInstance.totalDistribution()

  
  await earningTokenInstance.approve(mBaseFarmInstance.address, totalDistribution)
  await mBaseFarmInstance.launchStaking()

  // console.log((await mBaseFarmInstance.startedStaking()).toString(),(await mBaseFarmInstance._blockNumber()).toString(), totalDistribution.toString())
}
