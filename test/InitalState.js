const MBaseFarm = artifacts.require('MBaseFarm')
const MockedStakingToken = artifacts.require('StakingToken')
const MockedEarningToken = artifacts.require('EarningToken')
const { time } = require('@openzeppelin/test-helpers')
const { variableShouldBeEqual, toWei, toBN } = require('./utils/helpers')
const rate = require('../stakingConfig/schedule.js')

contract('[MBaseFarm] inital state', accounts => {
  let stakingTokenInstance
  let earningTokenInstance
  let mBaseFarmInstance
  let denominator
  let tokenDecimals = 18
  let launchStakingBlockNumber

  before(async () => {
    earningTokenInstance = await MockedEarningToken.new()
    stakingTokenInstance = await MockedStakingToken.new()
    mBaseFarmInstance = await MBaseFarm.new(stakingTokenInstance.address, earningTokenInstance.address)

    denominator = await mBaseFarmInstance.denominator()

    await mBaseFarmInstance.setSchedule(rate.holderBonus, rate.schedule)
    await earningTokenInstance.approve(mBaseFarmInstance.address, toBN(rate.schedule[rate.schedule.length - 1]).div(toBN(rate.denominator)).add(toBN(1)))
    await mBaseFarmInstance.launchStaking()
    launchStakingBlockNumber = await time.latestBlock()
  })

  describe('[MBaseFarm] variables', accounts => {
    variableShouldBeEqual(() => mBaseFarmInstance, 'startedStaking', () => launchStakingBlockNumber)
    variableShouldBeEqual(() => mBaseFarmInstance, 'totalDistribution', toBN(rate.schedule[rate.schedule.length - 1]).div(toBN(rate.denominator)).add(toBN(1)))
    variableShouldBeEqual(() => mBaseFarmInstance, 'lastScheduleEpoch', 0)
    variableShouldBeEqual(() => mBaseFarmInstance, 'totalSupply', 0)
    variableShouldBeEqual(() => mBaseFarmInstance, 'maxEpochIndex', 106)
    variableShouldBeEqual(() => mBaseFarmInstance, 'historicalRewardRate', 0)
  })

  describe('[MBaseFarm] calcUnrewarded', accounts => {  
    const checkCalcUnrewarded = (val, params) => {
      variableShouldBeEqual(
        () => mBaseFarmInstance,
        'calcUnrewarded',
        val,
        params,
      )
    }

    checkCalcUnrewarded(0, [ 0,0,0 ])
    checkCalcUnrewarded(0, () => [ denominator.mul(web3.utils.toBN(10)), 0, 0])
    checkCalcUnrewarded(
      10n**18n * 10n**18n,
      () => [ 10n**18n << 40n, 0, 10n**18n],
    )
    checkCalcUnrewarded(
      0,
      () => [ denominator.mul(web3.utils.toBN(10)), denominator.mul(web3.utils.toBN(10)), toWei(1, tokenDecimals)],
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


  describe('[MBaseFarm] calcSupplyByBlock', accounts => { 
    let startedStaking
    let scheduleEpochDuration
    let maxEpochIndex

    before(async () => {      
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

    before(async () => {      
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
    checkСalcCurrentHolderBonusRate(
      () => ({ 
        rate: web3.utils.toBN(rate.holderBonus[1]).mul(holderBonusEpochDuration.div(web3.utils.toBN(3))).div(holderBonusEpochDuration),
        epoch: 0
      }),
      () => holderBonusEpochDuration.div(web3.utils.toBN(3))
    )
    checkСalcCurrentHolderBonusRate(
      () => ({ 
        rate: web3.utils.toBN(rate.holderBonus[1]).div(web3.utils.toBN(2)),
        epoch: 0,
      }),
      () => holderBonusEpochDuration.div(web3.utils.toBN(2)),
    )
    checkСalcCurrentHolderBonusRate(() => ({ rate: web3.utils.toBN(rate.holderBonus[1]), epoch: 1 }), () => holderBonusEpochDuration)
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

    before(async () => {      
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

  describe('[MBaseFarm] recalcStartHolderBonus', () => {
    let holderBonusEpochDuration
    let maxEpochIndex
    let currentBlockNumber

    before(async () => {      
      holderBonusEpochDuration = await mBaseFarmInstance.holderBonusEpochDuration()
      maxEpochIndex = await mBaseFarmInstance.maxEpochIndex()
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
