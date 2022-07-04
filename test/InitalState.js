const MBaseFarm = artifacts.require('MBaseFarm')
const MockedStakingToken = artifacts.require('StakingToken')
const MockedEarningToken = artifacts.require('EarningToken')
const { time } = require('@openzeppelin/test-helpers')
const { variableShouldBeEqual, toWei, toBN } = require('./utils/helpers')
const rate = require('../stakingConfig/schedule.js')

MBaseFarm.defaults({
  gasPrice: 0,
})

contract('[MBaseFarm] inital state', () => {
  let stakingTokenInstance
  let earningTokenInstance
  let mBaseFarmInstance
  let denominator
  let tokenDecimals = 18
  let launchStakingBlockNumber

  before(async () => {
    earningTokenInstance = await MockedEarningToken.new()
    stakingTokenInstance = await MockedStakingToken.new()
    mBaseFarmInstance = await MBaseFarm.new(stakingTokenInstance.address, earningTokenInstance.address, 10, 10)

    denominator = BigInt((await mBaseFarmInstance.denominator()).toString())

    // await mBaseFarmInstance.setSchedule(rate.hbRate, rate.schedule)
    await earningTokenInstance.approve(mBaseFarmInstance.address, rate.totalDistributionWithHb)
    await mBaseFarmInstance.launchStaking()
    launchStakingBlockNumber = await time.latestBlock()
  })

  describe('[MBaseFarm] variables', () => {
    variableShouldBeEqual(() => mBaseFarmInstance, 'startedStaking', () => launchStakingBlockNumber)
    variableShouldBeEqual(() => mBaseFarmInstance, 'totalDistribution', rate.totalDistributionWithHb)
    variableShouldBeEqual(() => mBaseFarmInstance, 'lastScheduleEpoch', 0)
    variableShouldBeEqual(() => mBaseFarmInstance, 'totalSupply', 0)
    variableShouldBeEqual(() => mBaseFarmInstance, 'maxEpochIndex', 106)
    variableShouldBeEqual(() => mBaseFarmInstance, 'historicalRewardRate', 0)
  })

  describe('[MBaseFarm] calcUnrewarded', () => {  
    const checkCalcUnrewarded = (val, params) => {
      variableShouldBeEqual(
        () => mBaseFarmInstance,
        'calcUnrewarded',
        val,
        params,
      )
    }

    checkCalcUnrewarded(0, [ 0,0,0 ])
    checkCalcUnrewarded(0, () => [ denominator * 10n, 0, 0])
    checkCalcUnrewarded(
      10n**18n * 10n**18n,
      () => [ 10n**18n << 40n, 0, 10n**18n],
    )
    checkCalcUnrewarded(
      0,
      () => [ denominator * 10n, denominator * 10n, toWei(1, tokenDecimals)],
    )
    checkCalcUnrewarded(
      10n**18n / 2n,
      () => [
        1n << 40n,
        0,
        10n**18n / 2n,
      ],
    )
    checkCalcUnrewarded(
      10n**18n,
      () => [
        // _historicalRewardRate
        10n**18n << 40n,
        // _initialRewardRate
        (10n**18n - 1n) << 40n,
        // _amount
        10n**18n
      ],
    )
  })

  describe('[MBaseFarm] calcHistoricalRewardRate', () => { 
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
      () => 2n << 40n,
      () => [
        // _currentSupply
        100n,
        // _totalStaked
        100n,
        // _historicalRewardRate
        1n << 40n,
      ],
    )
    checkCalcHistoricalRewardRate(
      () => (100n * 10n**18n + 1n) << 40n,
      () => [
        // _currentSupply
        100n * 10n**18n,
        // _totalStaked
        100n * 10n**18n,
        // _historicalRewardRate
        100n * 10n**18n << 40n
      ],
    )
  })


  describe('[MBaseFarm] calcSupplyByBlock', () => { 
    let startedStaking
    let scheduleEpochDuration
    let maxEpochIndex

    before(async () => {      
      startedStaking = BigInt((await mBaseFarmInstance.startedStaking()).toString())
      scheduleEpochDuration = BigInt((await mBaseFarmInstance.scheduleEpochDuration()).toString())
      maxEpochIndex = BigInt((await mBaseFarmInstance.maxEpochIndex()).toString())
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
        startedStaking + scheduleEpochDuration,
        // totalSupply
        0,
      ],
    )
    checkCalcSupplyByBlock(
      () => ({ supply: rate.schedule[2], epoch: 2 }),
      () => [
        // blockNumber
        startedStaking + (scheduleEpochDuration * 2n),
        // totalSupply
        0,
      ],
    )
    checkCalcSupplyByBlock(
      () => ({ supply: rate.schedule[1] / 2n, epoch: 0 }),
      () => [
        // blockNumber
        startedStaking + (scheduleEpochDuration / 2n),
        // totalSupply
        0,
      ],
    )
    checkCalcSupplyByBlock(
      () => ({ 
        supply: (rate.schedule[2] - rate.schedule[1]) / 2n + rate.schedule[1],
        epoch: 1n,
      }),
      () => [
        // blockNumber
        startedStaking + (scheduleEpochDuration / 2n) + scheduleEpochDuration,
        // totalSupply
        0n,
      ],
    )
    checkCalcSupplyByBlock(
      () => ({ supply: rate.schedule[Number(maxEpochIndex)], epoch: maxEpochIndex }),
      () => [
        // blockNumber
        startedStaking + (scheduleEpochDuration * maxEpochIndex),
        // totalSupply
        0n,
      ],
    )
    // НЕДОПРОВЕРЕНО
    checkCalcSupplyByBlock(
      () => ({ supply: rate.schedule[Number(maxEpochIndex)], epoch: maxEpochIndex }),
      () => [
        // blockNumber
        startedStaking + (scheduleEpochDuration * maxEpochIndex) + (scheduleEpochDuration / 2n),
        // totalSupply
        0n,
      ],
    )
    // НЕДОПРОВЕРЕНО
    checkCalcSupplyByBlock(
      () => ({ supply: rate.schedule[Number(maxEpochIndex)], epoch: maxEpochIndex }),
      () => [
        // blockNumber
        startedStaking + scheduleEpochDuration * maxEpochIndex + scheduleEpochDuration + scheduleEpochDuration,
        // totalSupply
        0n,
      ],
    )
    // НЕДОПРОВЕРЕНО
    checkCalcSupplyByBlock(
      () => ({ supply: 0, epoch: maxEpochIndex }),
      () => [
        // blockNumber
        startedStaking + scheduleEpochDuration * maxEpochIndex + scheduleEpochDuration + scheduleEpochDuration,
        // totalSupply
        rate.schedule[Number(maxEpochIndex)],
      ],
    )
    checkCalcSupplyByBlock(
      () => ({ 
        supply: (rate.schedule[2] - rate.schedule[1]) / 2n,
        epoch: 1,
      }),
      () => [
        // blockNumber
        startedStaking + (scheduleEpochDuration / 2n) + scheduleEpochDuration,
        // totalSupply
        rate.schedule[1],
      ],
    )
  })

  describe('[MBaseFarm] calcCurrentHolderBonusRate', () => {
    let holderBonusEpochDuration

    before(async () => {      
      holderBonusEpochDuration = BigInt((await mBaseFarmInstance.holderBonusEpochDuration()).toString())
      maxEpochIndex = BigInt((await mBaseFarmInstance.maxEpochIndex()).toString())
    })

    const checkСalcCurrentHolderBonusRate = (value, params) => {
      it(`The calcCurrentHolderBonusRate should be equal ${value}`, async () => {
        const { rate, epochIndex } = await mBaseFarmInstance.calcCurrentHolderBonusRate(params())
    
        assert.equal(rate.valueOf(), value().rate.toString())
        assert.equal(epochIndex.valueOf(), value().epoch.toString())
      })
    }

    checkСalcCurrentHolderBonusRate(() => ({ rate: 0, epoch: 0 }), () => 0)
    checkСalcCurrentHolderBonusRate(
      () => ({ 
        rate: rate.hbRate[1] * (holderBonusEpochDuration / 3n) / holderBonusEpochDuration,
        epoch: 0
      }),
      () => holderBonusEpochDuration / 3n
    )
    checkСalcCurrentHolderBonusRate(
      () => ({ 
        rate: rate.hbRate[1] / 2n,
        epoch: 0,
      }),
      () => holderBonusEpochDuration / 2n,
    )
    checkСalcCurrentHolderBonusRate(() => ({ rate: rate.hbRate[1], epoch: 1 }), () => holderBonusEpochDuration)
    checkСalcCurrentHolderBonusRate(() => (
      { rate: rate.hbRate[2], epoch: 2 }),
      () => holderBonusEpochDuration * 2n,
    )
    checkСalcCurrentHolderBonusRate(() => (
      { 
        rate: (rate.hbRate[2] - rate.hbRate[1]) / 2n + rate.hbRate[1],
        epoch: 1,
      }),
      () => holderBonusEpochDuration * 3n / 2n
    )
  })

  describe('[MBaseFarm] calcHolderBonus', accounts => {
    let holderBonusEpochDuration
    let maxEpochIndex

    before(async () => {      
      holderBonusEpochDuration = BigInt((await mBaseFarmInstance.holderBonusEpochDuration()).toString())
      maxEpochIndex = BigInt((await mBaseFarmInstance.maxEpochIndex()).toString())
    })

    const checkСalcHolderBonus = (value, params) => {
      it(`The calcHolderBonus should be equal ${value}`, async () => {
        const hbRewards = await mBaseFarmInstance.calcHolderBonus(...params())
        assert.equal(hbRewards.valueOf(), value().amount.toString())
      })
    }

    checkСalcHolderBonus(() => ({ amount: 0 }), () => [0, 0])
    checkСalcHolderBonus(() => ({ amount: 0 }), () => [
      holderBonusEpochDuration,
      0,
    ])
    checkСalcHolderBonus(() => ({ amount: 0 }), () => [
      holderBonusEpochDuration * 2n,
      0,
    ])
    checkСalcHolderBonus(() => ({ amount: rate.hbRate[1] * 100000n / denominator }), () => [
      holderBonusEpochDuration,
      100000,
    ])
    checkСalcHolderBonus(() => ({ amount: rate.hbRate[2] * 100000n / denominator }), () => [
      holderBonusEpochDuration * 2n,
      100000,
    ])
    checkСalcHolderBonus(() => ({
      amount: ((rate.hbRate[2] - rate.hbRate[1]) / 2n + rate.hbRate[1]) * 100000n / denominator,
    }), () => [
      holderBonusEpochDuration * 3n / 2n,
      100000n
    ])
  })

  describe('[MBaseFarm] recalcStartHolderBonus', () => {
    let currentBlockNumber

    before(async () => {      
      holderBonusEpochDuration = BigInt((await mBaseFarmInstance.holderBonusEpochDuration()).toString())
      maxEpochIndex = BigInt((await mBaseFarmInstance.maxEpochIndex()).toString())
      currentBlockNumber = await time.latestBlock()
    })

    const checkRecalcStartHolderBonus = (value, params) => {
      it(`The recalcStartHolderBonus should be equal ${value}`, async () => {
        const startHolderBonus = await mBaseFarmInstance.recalcStartHolderBonus(...params())
    
        assert.equal(startHolderBonus.valueOf(), value().toString())
      })
    }

    checkRecalcStartHolderBonus(() => currentBlockNumber, () => [0, 0, 0])
    checkRecalcStartHolderBonus(
      () => currentBlockNumber.sub(web3.utils.toBN(100)),
      () => [
        // _stakedAmount
        1,
        // _addedAmount
        0,
        // _holderBonusDuration
        100,
      ],
    )
    checkRecalcStartHolderBonus(
      () => currentBlockNumber.sub(web3.utils.toBN(100)),
      () => [
        // _stakedAmount
        1000000000,
        // _addedAmount
        0,
        // _holderBonusDuration
        100,
      ],
    )
    checkRecalcStartHolderBonus(
      () => currentBlockNumber,
      () => [
        // _stakedAmount
        1000000000,
        // _addedAmount
        0,
        // _holderBonusDuration
        0,
      ],
    )
    checkRecalcStartHolderBonus(
      () => currentBlockNumber.sub(web3.utils.toBN(5)),
      () => [
        // _stakedAmount
        1000,
        // _addedAmount
        1000,
        // _holderBonusDuration
        10,
      ],
    )
    checkRecalcStartHolderBonus(
      () => currentBlockNumber,
      () => [
        // _stakedAmount
        0,
        // _addedAmount
        1000,
        // _holderBonusDuration
        0,
      ],
    )
  })
})
