const MBaseFarm = artifacts.require('MBaseFarm')
const EarningToken = artifacts.require('EarningToken')
const StakingToken = artifacts.require('StakingToken')
const rate = require('../stakingConfig/schedule.js')

module.exports = async (deployer) => {
  await deployer.deploy(EarningToken)
  await deployer.deploy(StakingToken)
  const earningTokenInstance = await EarningToken.deployed()
  const stakingTokenInstance = await StakingToken.deployed()
console.log(1)
  await deployer.deploy(
    MBaseFarm,
    stakingTokenInstance.address,
    earningTokenInstance.address,
    rate.holderBonus,
    rate.schedule,
  )
  console.log(1)
  const mBaseFarmInstance = await MBaseFarm.deployed()
  const totalDistribution = await mBaseFarmInstance.totalDistribution()

  
  await earningTokenInstance.approve(mBaseFarmInstance.address, totalDistribution)
  await mBaseFarmInstance.launchStaking()

  console.log((await mBaseFarmInstance.startedStaking()).toString(),(await mBaseFarmInstance.blockNumber()).toString(), totalDistribution.toString())
}
