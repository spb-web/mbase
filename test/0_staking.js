const MBaseFarm = artifacts.require('MBaseFarm')
const MockedStakingToken = artifacts.require('StakingToken')
const MockedEarningToken = artifacts.require('EarningToken')
const { time, expectEvent } = require('@openzeppelin/test-helpers')
const { variableShouldBeEqual, toWei, toBN } = require('./utils/helpers')
const rate = require('../stakingConfig/schedule.js')

contract('[MBaseFarm] using', (accounts) => {
  let stakingTokenInstance
  let earningTokenInstance
  let mBaseFarmInstance
  let denominator
  let stakingTokenDecimals
  let earningTokenDecimals
  let launchStakingBlockNumber
  let scheduleEpochDuration

  const checkStakerState = (values, account) => {
    describe(`[MBaseFarm] check staker state ${account}`, () => {
      let state
      let stakerRawState

      before(async () => {
        state = await mBaseFarmInstance.getState()
        stakerRawState = await mBaseFarmInstance.stakerState(account)
      })

      it('Check staker amount', () => assert.equal(state.amount.valueOf(), values().amount.toString()))
      it('Check staker reward', () => assert.equal(state.reward.valueOf(), values().reward.toString()))
      it('Check staker claimedReward', () => assert.equal(state.claimedReward.valueOf(), values().claimedReward.toString()))
      it('Check staker holderBonusStart', () => assert.equal(state.holderBonusStart.valueOf(), values().holderBonusStart.toString()))
      it('Check staker holderBonusDuration', () => assert.equal(state.holderBonusDuration.valueOf(), values().holderBonusDuration.toString()))
  
      it('Check staker amount', () => assert.equal(stakerRawState.amount.valueOf(), values().amount.toString()))
      it('Check staker initialRewardRate', () => assert.equal(stakerRawState.initialRewardRate.valueOf(), values().initialRewardRate.toString()))
      it('Check staker reward', () => assert.equal(stakerRawState.reward.valueOf(), values().rawReward.toString()))
      it('Check staker claimedReward', () => assert.equal(stakerRawState.claimedReward.valueOf(), values().claimedReward.toString()))
      it('Check staker holderBonusReward', () => assert.equal(stakerRawState.holderBonusReward.valueOf(), values().holderBonusReward.toString()))
      it('Check staker holderBonusClaimedReward', () => assert.equal(stakerRawState.holderBonusClaimedReward.valueOf(), values().holderBonusClaimedReward.toString()))
      it('Check staker holderBonusInitalRate', () => assert.equal(stakerRawState.holderBonusInitalRate.valueOf(), values().holderBonusInitalRate.toString()))  
    })
  }

  const checkStakingState = (values) => {
    describe('предварительный стейт', () => {
      variableShouldBeEqual(() => mBaseFarmInstance, 'totalSupply', () => values().totalSupply)
      variableShouldBeEqual(() => mBaseFarmInstance, 'totalStaked', () => values().totalStaked)
      variableShouldBeEqual(() => mBaseFarmInstance, 'historicalRewardRate', () => values().historicalRewardRate)
      variableShouldBeEqual(() => mBaseFarmInstance, 'lastScheduleEpoch', () => values().lastScheduleEpoch)
    })
  }

  const checkStake = (account, stakeAmount) => {
    describe(`[MBaseFarm] stake by account ${account}`, () => {
      let initalAccountStakingTokenBalance
      let initalContractStakingTokenBalance
      let initalStakedAmount
      let initalTotalStaked

      before(async () => {
        initalAccountStakingTokenBalance = BigInt((await stakingTokenInstance.balanceOf(account)).toString())
        initalContractStakingTokenBalance = BigInt((await stakingTokenInstance.balanceOf(mBaseFarmInstance.address)).toString())

        const stakerRawState = await mBaseFarmInstance.stakerState(account)

        initalStakedAmount = BigInt(stakerRawState.amount.toString())
        initalTotalStaked = BigInt((await mBaseFarmInstance.totalStaked()).toString())
      })

      it('Checking staking transaction', async () => {
        await stakingTokenInstance.approve(mBaseFarmInstance.address, stakeAmount)
        const receipt = await mBaseFarmInstance.stake(stakeAmount)

        expectEvent(receipt, 'Staked', {
          owner: account,
          from: account,
          amount: toBN(stakeAmount.toString()),
        })
      })

      it('Checking balance after staking', async () => {
        const accountStakingTokenBalance = BigInt((await stakingTokenInstance.balanceOf(account)).toString())
        const contractStakingTokenBalance = BigInt((await stakingTokenInstance.balanceOf(mBaseFarmInstance.address)).toString())

        assert.equal(accountStakingTokenBalance, initalAccountStakingTokenBalance - stakeAmount)
        assert.equal(contractStakingTokenBalance, initalContractStakingTokenBalance + stakeAmount)
      })

      it('Checking staker amount after staking', async () => {
        const stakerRawState = await mBaseFarmInstance.stakerState(account)

        assert.equal(BigInt(stakerRawState.amount.toString()), initalStakedAmount + stakeAmount)
      })

      it('Checking total staked after staking', async () => {
        const totalStaked = BigInt((await mBaseFarmInstance.totalStaked()).toString())

        assert.equal(totalStaked, initalTotalStaked + stakeAmount)
      })
    })
  }

  const checkClaim = (account) => {
    describe(`[MBaseFarm] claim rewards by account ${account}`, () => {
      let initalBalance
      let initalClaimedReward
      let pendingReward

      before(async () => {
        initalBalance = BigInt((await earningTokenInstance.balanceOf(account)).toString())
        pendingReward = BigInt((await mBaseFarmInstance.getRewards(account)).toString())
        const stakerRawState = await mBaseFarmInstance.stakerState(account)

        initalClaimedReward = BigInt(stakerRawState.claimedReward)

        // console.log(initalBalance, pendingReward, initalClaimedReward)
      })
  
      it('Claim reward', async () => {
        const receipt = await mBaseFarmInstance.claim()

        expectEvent(receipt, 'Rewarded', {
          owner: account,
          to: account,
          amount: toBN(pendingReward.toString()),
        })
      })

      it('Check state', async () => {
        const newPendingReward = BigInt((await mBaseFarmInstance.getRewards(account)).toString())
        const stakerRawState = await mBaseFarmInstance.stakerState(account)

        assert.equal(stakerRawState.claimedReward.valueOf(), (initalClaimedReward + pendingReward).toString())
        assert.equal(newPendingReward, 0n)
      })

      it('Check balance', async () => {
        const currentBalance = BigInt((await earningTokenInstance.balanceOf(account)).toString())

        assert.equal(currentBalance, initalBalance + pendingReward)
      })
    })
  } 


  const checkCalcSupplyByBlock = (value) => {
    it(`The calcSupplyByBlock should be equal ${value}`, async () => {
      const currentBlock = await time.latestBlock()
      const totalSupply = await mBaseFarmInstance.totalSupply()
      const { amount, epochIndex } = await mBaseFarmInstance.calcSupplyByBlock(currentBlock, totalSupply)
  
      assert.equal(amount.valueOf(), value().supply.toString())
      assert.equal(epochIndex.valueOf(), value().epoch.toString())
    })
  }

  const checkCalcHistoricalRewardRate = (value) => {
    it(`The calcHistoricalRewardRate should be equal ${value}`, async () => {
      const currentBlock = await time.latestBlock()
      const totalSupply = await mBaseFarmInstance.totalSupply()
      const { amount: currentSupply } = await mBaseFarmInstance.calcSupplyByBlock(currentBlock, totalSupply)
      const totalStaked = await mBaseFarmInstance.totalStaked()
      const historicalRewardRate = await mBaseFarmInstance.historicalRewardRate()
      const rate = await mBaseFarmInstance.calcHistoricalRewardRate(currentSupply, totalStaked, historicalRewardRate)
  
      assert.equal(rate.valueOf(), value().toString())
    })
  }

  before(async () => {
    earningTokenInstance = await MockedEarningToken.new()
    stakingTokenInstance = await MockedStakingToken.new()
    mBaseFarmInstance = await MBaseFarm.new(stakingTokenInstance.address, earningTokenInstance.address)

    denominator = await mBaseFarmInstance.denominator()
    scheduleEpochDuration = BigInt((await mBaseFarmInstance.scheduleEpochDuration()).toString())
    stakingTokenDecimals = BigInt((await stakingTokenInstance.decimals()).toString())
    earningTokenDecimals = await earningTokenInstance.decimals()

    await mBaseFarmInstance.setSchedule(rate.holderBonus, rate.schedule)
    await earningTokenInstance.approve(mBaseFarmInstance.address, toBN(rate.schedule[rate.schedule.length - 1]).add(toBN(1)))
    await mBaseFarmInstance.launchStaking()
    launchStakingBlockNumber = BigInt((await time.latestBlock()).toString())
  })
  
  describe('[MBaseFarm] stake', () => {
    variableShouldBeEqual(() => mBaseFarmInstance, 'totalSupply', 0)
    let stakeAmount = 100000n * (10n**18n)
    let stakedBlockNumber
    
    checkStake(accounts[0], stakeAmount)

    describe('[MBaseFarm] blocks', () => {
      it('get blockNumber', async () => {
        stakedBlockNumber = BigInt((await time.latestBlock()).toString())
        console.log('Прошло блоков до стейка', (stakedBlockNumber - launchStakingBlockNumber).toString())
      })
    })

    checkStakerState(() => ({
      amount: stakeAmount,
      reward: 0,
      rawReward: 0,
      claimedReward: 0,
      holderBonusStart: stakedBlockNumber,
      initialRewardRate: 0,
      holderBonusDuration: 0,
      holderBonusReward: 0,
      holderBonusClaimedReward: 0,
      holderBonusInitalRate: 0,
    }), accounts[0])

    checkStakingState(() => ({
      totalSupply: BigInt(rate.schedule[1]) * (stakedBlockNumber - launchStakingBlockNumber) / scheduleEpochDuration,
      totalStaked: stakeAmount,
      historicalRewardRate: 0,
      lastScheduleEpoch: 0,
    }))

    describe('Мотаем блоки', () => {
      it('Мотаем блоки', async () => {
        await time.advanceBlockTo(launchStakingBlockNumber + scheduleEpochDuration)
        const currentBlock = await time.latestBlock()
  
        assert.equal(currentBlock.valueOf(), (launchStakingBlockNumber + scheduleEpochDuration).toString())
        console.log('Прошло блоков', (stakedBlockNumber - launchStakingBlockNumber + scheduleEpochDuration).toString())
      })
    })

    describe('предварительный стейт', () => {
      checkCalcSupplyByBlock(() => ({
        supply: BigInt(rate.schedule[1]) - (BigInt(rate.schedule[1]) * (stakedBlockNumber - launchStakingBlockNumber) / scheduleEpochDuration),
        epoch: 1,
      }))
      checkCalcHistoricalRewardRate(() => {
        return ((BigInt(rate.schedule[1]) * (scheduleEpochDuration - (stakedBlockNumber - launchStakingBlockNumber)) / scheduleEpochDuration) << 40n)/ BigInt(stakeAmount.toString())
      })
    })

    checkStakerState(() => ({
      amount: stakeAmount,
      reward: (
        (
          ((BigInt(rate.schedule[1]) * (scheduleEpochDuration - (stakedBlockNumber - launchStakingBlockNumber)) / scheduleEpochDuration) << 40n)/ BigInt(stakeAmount.toString())
        ) * BigInt(stakeAmount.toString())
      ) >> 40n,
      rawReward: 0,
      claimedReward: 0,
      holderBonusDuration: (launchStakingBlockNumber + scheduleEpochDuration) - stakedBlockNumber,
      holderBonusStart: stakedBlockNumber,
      initialRewardRate: 0,
      holderBonusReward: 0,
      holderBonusClaimedReward: 0,
      holderBonusInitalRate: 0,
    }), accounts[0])


    checkClaim(accounts[0])
  })
})
