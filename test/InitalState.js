const MBaseFarm = artifacts.require('MBaseFarm')
const StakingToken = artifacts.require('StakingToken')
const EarningToken = artifacts.require('EarningToken')
const { variableShouldBeEqual, toWei } = require('./utils/helpers')
const rate = require('../stakingConfig/schedule.js')

contract('[MBaseFarm] inital state', accounts => {
  let stakingTokenInstance
  let earningTokenInstance
  let mBaseFarmInstance
  let denominator
  let stakingTokenDecimals
  let earningTokenDecimals

  beforeEach(async () => {
    earningTokenInstance = await EarningToken.deployed()
    stakingTokenInstance = await StakingToken.deployed()
    mBaseFarmInstance = await MBaseFarm.deployed()

    denominator = await mBaseFarmInstance.denominator()
    stakingTokenDecimals = await stakingTokenInstance.decimals()
    earningTokenDecimals = await earningTokenInstance.decimals()
  })

  describe('[MBaseFarm] variables', accounts => {
    variableShouldBeEqual(() => mBaseFarmInstance, 'totalDistribution', '199999999509072783458135461')
    variableShouldBeEqual(() => mBaseFarmInstance, 'lastScheduleEpoch', 0)
    variableShouldBeEqual(() => mBaseFarmInstance, 'totalSupply', 0)
    variableShouldBeEqual(() => mBaseFarmInstance, 'maxEpochIndex', 106)
    variableShouldBeEqual(() => mBaseFarmInstance, 'historicalRewardRate', 0)
  })

  describe('[MBaseFarm] calcReward', accounts => {  
    const checkCalcReward = (val, params) => {
      variableShouldBeEqual(
        () => mBaseFarmInstance,
        'calcReward',
        val,
        params,
      )
    }

    checkCalcReward(0, [ 0,0,0,0 ])
    checkCalcReward(0, () => [ denominator.mul(web3.utils.toBN(10)), 0, 0, 0 ])
    checkCalcReward(
      toWei(1, earningTokenDecimals),
      () => [ denominator.mul(toWei(1, earningTokenDecimals)), 0, toWei(1, stakingTokenDecimals), 0 ],
    )
    checkCalcReward(
      0,
      () => [ denominator.mul(web3.utils.toBN(10)), denominator.mul(web3.utils.toBN(10)), toWei(1, stakingTokenDecimals), 0 ],
    )
    checkCalcReward(
      toWei(1, earningTokenDecimals).div(web3.utils.toBN(2)),
      () => [
        denominator.mul(toWei(1, earningTokenDecimals)),
        0,
        toWei(1, stakingTokenDecimals).div(web3.utils.toBN(2)),
        0,
      ],
    )
    checkCalcReward(
      toWei(1, earningTokenDecimals),
      () => [
        denominator.mul(toWei(1, earningTokenDecimals)),
        denominator.mul(toWei(1, earningTokenDecimals)).div(web3.utils.toBN(2)),
        toWei(1, stakingTokenDecimals),
        toWei(1, earningTokenDecimals).div(web3.utils.toBN(2)),
      ],
    )
  })

  describe('[MBaseFarm] calcHistoricalRewardRate', accounts => { 
    const checkCalcHistoricalRewardRate = (val, params) => {
      variableShouldBeEqual(
        () => mBaseFarmInstance,
        'calcHistoricalRewardRate',
        val,
        params,
      )
    }

    checkCalcHistoricalRewardRate(0, [0, 0, 0])
    checkCalcHistoricalRewardRate(100, [0, 100, 100])
    checkCalcHistoricalRewardRate(100, [100, 0, 100])
    checkCalcHistoricalRewardRate(
      () => denominator.mul(web3.utils.toBN(2)),
      () => [
        denominator.mul(web3.utils.toBN(100)),
        web3.utils.toBN(100),
        denominator.mul(web3.utils.toBN(1)),
      ],
    )
    checkCalcHistoricalRewardRate(
      () => denominator.mul(toWei(100, earningTokenDecimals).add(web3.utils.toBN(1))),
      () => [
        denominator.mul(toWei(100, earningTokenDecimals)),
        toWei(100, stakingTokenDecimals),
        denominator.mul(toWei(100, earningTokenDecimals))
      ],
    )
  })


  describe('[MBaseFarm] calcSupplyByBlock', accounts => { 
    let startedStaking
    let scheduleEpochDuration
    let maxEpochIndex

    beforeEach(async () => {
      mBaseFarmInstance = await MBaseFarm.deployed()
      
      startedStaking = await mBaseFarmInstance.startedStaking()
      scheduleEpochDuration = await mBaseFarmInstance.scheduleEpochDuration()
      maxEpochIndex = await mBaseFarmInstance.maxEpochIndex()
    })

    const checkCalcSupplyByBlock = (value, params) => {
      it(`The calcSupplyByBlock should be equal ${value}`, async () => {
        const { amount, epochIndex } = await mBaseFarmInstance.calcSupplyByBlock(...params())
    
        assert.equal(amount.valueOf(), value().supply.toString())
        assert.equal(epochIndex.valueOf(), value().epoch.toString())
      })
    }

    checkCalcSupplyByBlock(
      () => ({ supply: 0, epoch: 0 }),
      () => [
        // blockNumber
        startedStaking,
        // totalSupply
        0,
      ],
    )
    checkCalcSupplyByBlock(
      () => ({ supply: rate.schedule[1], epoch: 1 }),
      () => [
        // blockNumber
        startedStaking.add(scheduleEpochDuration),
        // totalSupply
        0,
      ],
    )
    checkCalcSupplyByBlock(
      () => ({ supply: rate.schedule[2], epoch: 2 }),
      () => [
        // blockNumber
        startedStaking.add(scheduleEpochDuration.mul(web3.utils.toBN(2))),
        // totalSupply
        0,
      ],
    )
    checkCalcSupplyByBlock(
      () => ({ supply: web3.utils.toBN(rate.schedule[1]).div(web3.utils.toBN(2)), epoch: 0 }),
      () => [
        // blockNumber
        startedStaking.add(scheduleEpochDuration.div(web3.utils.toBN(2))),
        // totalSupply
        0,
      ],
    )
    checkCalcSupplyByBlock(
      () => ({ 
        supply: web3.utils.toBN(rate.schedule[2])
          .sub(web3.utils.toBN(rate.schedule[1]))
          .div(web3.utils.toBN(2))
          .add(web3.utils.toBN(rate.schedule[1])),
        epoch: 1,
      }),
      () => [
        // blockNumber
        startedStaking
          .add(scheduleEpochDuration.div(web3.utils.toBN(2)))
          .add(scheduleEpochDuration),
        // totalSupply
        0,
      ],
    )
    checkCalcSupplyByBlock(
      () => ({ supply: web3.utils.toBN(rate.schedule[maxEpochIndex.toNumber()]), epoch: maxEpochIndex }),
      () => [
        // blockNumber
        startedStaking.add(scheduleEpochDuration.mul(maxEpochIndex)),
        // totalSupply
        0,
      ],
    )
    // НЕДОПРОВЕРЕНО
    checkCalcSupplyByBlock(
      () => ({ supply: web3.utils.toBN(rate.schedule[maxEpochIndex.toNumber()]), epoch: maxEpochIndex }),
      () => [
        // blockNumber
        startedStaking
          .add(scheduleEpochDuration.mul(maxEpochIndex))
          .add(scheduleEpochDuration.div(web3.utils.toBN(2))),
        // totalSupply
        0,
      ],
    )
    // НЕДОПРОВЕРЕНО
    checkCalcSupplyByBlock(
      () => ({ supply: web3.utils.toBN(rate.schedule[maxEpochIndex.toNumber()]), epoch: maxEpochIndex }),
      () => [
        // blockNumber
        startedStaking
          .add(scheduleEpochDuration.mul(maxEpochIndex))
          .add(scheduleEpochDuration)
          .add(scheduleEpochDuration),
        // totalSupply
        0,
      ],
    )
    // НЕДОПРОВЕРЕНО
    checkCalcSupplyByBlock(
      () => ({ supply: 0, epoch: maxEpochIndex }),
      () => [
        // blockNumber
        startedStaking
          .add(scheduleEpochDuration.mul(maxEpochIndex))
          .add(scheduleEpochDuration)
          .add(scheduleEpochDuration),
        // totalSupply
        rate.schedule[maxEpochIndex.toNumber()],
      ],
    )
    checkCalcSupplyByBlock(
      () => ({ 
        supply: web3.utils.toBN(rate.schedule[2])
          .sub(web3.utils.toBN(rate.schedule[1]))
          .div(web3.utils.toBN(2)),
        epoch: 1,
      }),
      () => [
        // blockNumber
        startedStaking
          .add(scheduleEpochDuration.div(web3.utils.toBN(2)))
          .add(scheduleEpochDuration),
        // totalSupply
        rate.schedule[1],
      ],
    )
  })

  describe('[MBaseFarm] calcCurrentHolderBonusRate', accounts => {
    let holderBonusEpochDuration
    let maxEpochIndex

    beforeEach(async () => {
      mBaseFarmInstance = await MBaseFarm.deployed()
      
      holderBonusEpochDuration = await mBaseFarmInstance.holderBonusEpochDuration()
      maxEpochIndex = await mBaseFarmInstance.maxEpochIndex()
    })

    const checkСalcCurrentHolderBonusRate = (value, params) => {
      it(`The calcCurrentHolderBonusRate should be equal ${value}`, async () => {
        const { rate, epochIndex } = await mBaseFarmInstance.calcCurrentHolderBonusRate(params())
    
        assert.equal(rate.valueOf(), value().rate.toString())
        assert.equal(epochIndex.valueOf(), value().epoch.toString())
      })
    }

    checkСalcCurrentHolderBonusRate(() => ({ rate: 0, epoch: 0 }), () => 0)
    checkСalcCurrentHolderBonusRate(() => ({ rate: 3333, epoch: 0 }), () => holderBonusEpochDuration.div(web3.utils.toBN(3)))
    checkСalcCurrentHolderBonusRate(() => ({ rate: 5000, epoch: 0 }), () => holderBonusEpochDuration.div(web3.utils.toBN(2)))
    checkСalcCurrentHolderBonusRate(() => ({ rate: 10000, epoch: 1 }), () => holderBonusEpochDuration)
    checkСalcCurrentHolderBonusRate(() => (
      { rate: rate.holderBonus[2], epoch: 2 }),
      () => holderBonusEpochDuration.mul(web3.utils.toBN(2)),
    )
    checkСalcCurrentHolderBonusRate(() => (
      { 
        rate: web3.utils.toBN(rate.holderBonus[2])
          .sub(web3.utils.toBN(rate.holderBonus[1]))
          .div(web3.utils.toBN(2))
          .add(web3.utils.toBN(rate.holderBonus[1])),
        epoch: 1
      }),
      () => holderBonusEpochDuration.mul(web3.utils.toBN(3)).div(web3.utils.toBN(2)),
    )
  })



  describe('[MBaseFarm] calcHolderBonus', accounts => {
    let holderBonusEpochDuration
    let maxEpochIndex

    beforeEach(async () => {
      mBaseFarmInstance = await MBaseFarm.deployed()
      
      holderBonusEpochDuration = await mBaseFarmInstance.holderBonusEpochDuration()
      maxEpochIndex = await mBaseFarmInstance.maxEpochIndex()
    })

    const checkСalcHolderBonus = (value, params) => {
      it(`The calcHolderBonus should be equal ${value}`, async () => {
        const { currentHolderBonusRate: rate, amount } = await mBaseFarmInstance.calcHolderBonus(...params())
    
        assert.equal(rate.valueOf(), value().rate.toString())
        assert.equal(amount.valueOf(), value().amount.toString())
      })
    }

    checkСalcHolderBonus(() => ({ rate: 0, amount: 0 }), () => [0, 0, 0])
    checkСalcHolderBonus(() => ({ rate: rate.holderBonus[1], amount: 1000 }), () => [
      holderBonusEpochDuration,
      0,
      100000,
    ])
    checkСalcHolderBonus(() => ({ rate: rate.holderBonus[2], amount: 2053 }), () => [
      holderBonusEpochDuration.mul(web3.utils.toBN(2)),
      0,
      100000,
    ])
    checkСalcHolderBonus(() => ({ rate: rate.holderBonus[2], amount: 1053 }), () => [
      holderBonusEpochDuration.mul(web3.utils.toBN(2)),
      rate.holderBonus[1],
      100000,
    ])
    checkСalcHolderBonus(() => ({
      rate: web3.utils.toBN(rate.holderBonus[2])
        .sub(web3.utils.toBN(rate.holderBonus[1]))
        .div(web3.utils.toBN(2))
        .add(web3.utils.toBN(rate.holderBonus[1])),
      amount: 526 // ПРОВЕРИТЬ!!!!!!!
    }), () => [
      holderBonusEpochDuration.mul(web3.utils.toBN(3)).div(web3.utils.toBN(2)),
      rate.holderBonus[1],
      100000,
    ])
  })
})
