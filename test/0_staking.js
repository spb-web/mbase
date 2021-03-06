const { time, expectEvent, snapshot } = require('@openzeppelin/test-helpers')
const { step } = require('mocha-steps')
const MBaseFarm = artifacts.require('MBaseFarm')
const MockedStakingToken = artifacts.require('StakingToken')
const MockedEarningToken = artifacts.require('EarningToken')
const { variableShouldBeEqual, toBN } = require('./utils/helpers')
const { getScheduleRate, getHolderBonusRate, calcSupplyByBlock } = require('./utils/calcSchedule')
const rate = require('../stakingConfig/schedule.js')

contract('[MBaseFarm] using', (accounts) => {
  let stakingTokenInstance
  let earningTokenInstance
  let mBaseFarmInstance
  let launchStakingBlockNumber
  let scheduleEpochDuration
  let account0StakingTokenBalance
  let account1StakingTokenBalance

  let totalStaked = 0n
  let historicalRewardRate = 0n
  let lastBlockNumber = 0n
  let totalSupply = 0n

  const updateContractState = async () => {
    describe('Update contract state', () => {
      step('Read totalStaked', async () => {
        totalStaked = BigInt((await mBaseFarmInstance.totalStaked()).toString())
        console.log('\t ', 'totalStaked', totalStaked)
      })

      step('Read historicalRewardRate', async () => {
        historicalRewardRate = BigInt((await mBaseFarmInstance.historicalRewardRate()).toString())
        console.log('\t ', 'historicalRewardRate', historicalRewardRate)
      })

      step('Read totalSupply', async () => {
        totalSupply = BigInt((await mBaseFarmInstance.totalSupply()).toString())
        console.log('\t ', 'totalSupply', totalSupply)
      })

      step('Read blockNumber', async () => {
        lastBlockNumber = BigInt((await time.latestBlock()).toString())
        console.log('\t ', 'lastBlockNumber', lastBlockNumber)
      })
    })
  }

  const advanceBlockTo = (blockNumberFn) => {
    describe('Мотаем блоки', () => {
      it('Мотаем блоки', async () => {
        const blockNumber = blockNumberFn()
        await time.advanceBlockTo(blockNumber)
        const currentBlock = await time.latestBlock()
  
        assert.equal(currentBlock.valueOf(), (blockNumber).toString())
      })
    })
  }

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
      it('Check staker claimedReward', () => assert.equal(BigInt(state.claimedReward.toString()), values().claimedReward))
      // it('Check staker holderBonusStart', () => assert.equal(state.holderBonusStart.valueOf(), values().holderBonusStart.toString()))
      it('Check staker holderBonusDuration', async () => {
        const holderBonusDuration = BigInt((await mBaseFarmInstance.getHolderBonusDurationByAccount(account)).toString())
        assert.equal(holderBonusDuration, values().holderBonusDuration)
      })
      it('Check staker holderBonusReward', () => assert.equal(BigInt(state.holderBonus.valueOf()), values().holderBonusReward))
  
      it('Check staker amount', () => assert.equal(stakerRawState.amount.valueOf(), values().amount.toString()))
      it('Check staker initialRewardRate', () => assert.equal(BigInt(stakerRawState.initialRewardRate.valueOf()), values().initialRewardRate))
      it('Check staker reward raw', () => assert.equal(stakerRawState.reward.valueOf(), values().rawReward.toString()))
      it('Check staker claimedReward', () => assert.equal(stakerRawState.claimedReward.valueOf(), values().claimedReward.toString()))
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

  const checkStake = (account, stakeAmount, holderBonusFromBlock, description = '') => {
    describe(`[MBaseFarm] stake by account ${account} \n${description}`, () => {
      let initalAccountStakingTokenBalance
      let initalContractStakingTokenBalance
      let initalStakedAmount
      let initalTotalStaked
      let holderBonusFromBlockVal

      before(async () => {
        holderBonusFromBlockVal = await holderBonusFromBlock()
        initalAccountStakingTokenBalance = BigInt((await stakingTokenInstance.balanceOf(account)).toString())
        initalContractStakingTokenBalance = BigInt((await stakingTokenInstance.balanceOf(mBaseFarmInstance.address)).toString())

        const stakerRawState = await mBaseFarmInstance.stakerState(account)

        initalStakedAmount = BigInt(stakerRawState.amount.toString())
        initalTotalStaked = BigInt((await mBaseFarmInstance.totalStaked()).toString())
      })

      it('Checking staking transaction', async () => {
        await stakingTokenInstance.approve(mBaseFarmInstance.address, stakeAmount(), {from: account})
        const receipt = await mBaseFarmInstance.stake(stakeAmount(), {from: account, gasLimit: 300000})

        expectEvent(receipt, 'Staked', {
          owner: account,
          from: account,
          amount: toBN(stakeAmount().toString()),
          hbFromBlock: toBN(holderBonusFromBlockVal.toString()),
        })
      })

      it('Checking balance after staking', async () => {
        const accountStakingTokenBalance = BigInt((await stakingTokenInstance.balanceOf(account)).toString())
        const contractStakingTokenBalance = BigInt((await stakingTokenInstance.balanceOf(mBaseFarmInstance.address)).toString())

        assert.equal(accountStakingTokenBalance, initalAccountStakingTokenBalance - stakeAmount())
        assert.equal(contractStakingTokenBalance, initalContractStakingTokenBalance + stakeAmount())
      })

      it('Checking staker amount after staking', async () => {
        const stakerRawState = await mBaseFarmInstance.stakerState(account)

        assert.equal(BigInt(stakerRawState.amount.toString()), initalStakedAmount + stakeAmount())
      })

      it('Checking total staked after staking', async () => {
        const totalStaked = BigInt((await mBaseFarmInstance.totalStaked()).toString())

        assert.equal(totalStaked, initalTotalStaked + stakeAmount())
      })
    })
  }

  const checkClaim = (account, values, description = '') => {
    describe(`[MBaseFarm] claim rewards by account ${account} | ${description}`, () => {
      let initalAccountBalance
      let initalContractBalance
      let initalClaimedReward
      let initalAccountDeposit
      let pendingReward
      let initalHolderBonusDuration
      let pendingHbReward

      before(async () => {
        initalAccountBalance = BigInt((await earningTokenInstance.balanceOf(account)).toString())
        initalContractBalance = BigInt((await earningTokenInstance.balanceOf(mBaseFarmInstance.address)).toString())
        const blockNumber = BigInt((await time.latestBlock()).toString())
        const snapshotBeforeGettingRewards = await snapshot()
        await time.advanceBlockTo(blockNumber + 1n)
        pendingReward = BigInt((await mBaseFarmInstance.getRewards(account)).toString())
        pendingHbReward = BigInt((await mBaseFarmInstance.getHolderBonusByAccount(account)).toString())
        initalHolderBonusDuration = BigInt((await mBaseFarmInstance.getHolderBonusDurationByAccount(account)).toString())
        console.log('initalHolderBonusDuration', initalHolderBonusDuration, 'pendingReward', pendingReward)
        const stakerRawState = await mBaseFarmInstance.stakerState(account)
        await snapshotBeforeGettingRewards.restore()

        initalClaimedReward = BigInt(stakerRawState.claimedReward)
        initalAccountDeposit = BigInt(stakerRawState.amount.toString())
      })

      it('Check pendingHbReward', async () => {
        console.log(pendingHbReward, pendingReward * (await values()).hb / rate.denominator)
        assert.equal(pendingHbReward, pendingReward * (await values()).hb / rate.denominator)
      })
  
      it('Claim reward', async () => {
        const receipt = await mBaseFarmInstance.claim({from: account})

        expectEvent(receipt, 'Rewarded', {
          owner: account,
          to: account,
          amount: toBN(pendingReward.toString()),
        })
      })

      it('Check staker deposit', async () => {
        // депо не должно измениться
        assert.equal((await mBaseFarmInstance.stakerState(account)).amount.valueOf(), initalAccountDeposit.toString())
      })

      it('Check staker claimed reward', async () => {
        assert.equal((await mBaseFarmInstance.stakerState(account)).claimedReward.valueOf(), (initalClaimedReward + pendingReward).toString())
      })

      it('Check staker pending reward', async () => {
        assert.equal((await mBaseFarmInstance.getRewards(account)).valueOf(), '0')
      })

      it('Check holder bonus state', async () => {
        const holderBonusDuration = BigInt((await mBaseFarmInstance.getHolderBonusDurationByAccount(account)).toString())

        // Продолжительность холдер бонуса не должна измениться
        assert.equal(holderBonusDuration, initalHolderBonusDuration)
      })

      it('Checking balance of user earning token', async () => {
        const currentBalance = BigInt((await earningTokenInstance.balanceOf(account)).toString())
        const willBeHbRewarded = pendingReward * (await values()).hb / rate.denominator

        console.log(willBeHbRewarded, willBeHbRewarded / 10n**18n)
        

        assert.equal(currentBalance, initalAccountBalance + pendingReward + willBeHbRewarded)
      })

      it('Checking balance of contract earning token', async () => {
        const currentBalance = BigInt((await earningTokenInstance.balanceOf(mBaseFarmInstance.address)).toString())
        const willBeHbRewarded = pendingReward * (await values()).hb / rate.denominator

        assert.equal(currentBalance, initalContractBalance - pendingReward - willBeHbRewarded)
      })

      it('Hb reward will be equal 0', async () => {
        const currentHolderBonus = BigInt((await mBaseFarmInstance.getHolderBonusByAccount(account)).toString())

        assert.equal(currentHolderBonus, 0n)
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
    earningTokenInstance = await MockedEarningToken.new({from: accounts[0]})
    stakingTokenInstance = await MockedStakingToken.new({from: accounts[0]})
    mBaseFarmInstance = await MBaseFarm.new(stakingTokenInstance.address, earningTokenInstance.address, 10, 10, {from: accounts[0]})
    account0StakingTokenBalance = BigInt((await stakingTokenInstance.balanceOf(accounts[0])).toString())
    account1StakingTokenBalance = 1000n * 10n**18n
    await stakingTokenInstance.transfer(accounts[1], account1StakingTokenBalance)
    account0StakingTokenBalance -= account1StakingTokenBalance
    assert.equal(BigInt((await stakingTokenInstance.balanceOf(accounts[1])).toString()), account1StakingTokenBalance)

    scheduleEpochDuration = BigInt((await mBaseFarmInstance.scheduleEpochDuration()).toString())
    // await mBaseFarmInstance.setSchedule(rate.schedule)
    await earningTokenInstance.approve(mBaseFarmInstance.address, rate.totalDistributionWithHb)

    await mBaseFarmInstance.launchStaking()
    launchStakingBlockNumber = BigInt((await time.latestBlock()).toString())
  })
  
  describe('[MBaseFarm] stake', () => {
    variableShouldBeEqual(() => mBaseFarmInstance, 'totalSupply', 0)
    let stakeAmount = 1000n * (10n**18n)
    let stakedBlockNumber

    // Получаем актуальное состояние стейкинга
    updateContractState()

    checkClaim(accounts[0], () => ({ hb:0n }), 'Первый клейм до стейка, должно быть 0')

    checkStakerState(() => ({
      amount: 0,
      reward: 0,
      rawReward: 0,
      claimedReward: 0,
      // holderBonusStart: 0,
      initialRewardRate: 0,
      holderBonusDuration: 0,
      holderBonusReward: 0,
    }), accounts[0])
    
    // Получаем актуальное состояние стейкинга
    updateContractState()

    checkStake(
      accounts[0],
      () => stakeAmount,
      // checkStake делает апрув и стейк, майнится 2 блока перед проверкой
      async () => BigInt((await time.latestBlock()).toString()) + 2n,
      'Первый стейк с аккаутна 1'
    )

    // Получаем актуальное состояние стейкинга
    updateContractState()

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
      // holderBonusStart: stakedBlockNumber,
      initialRewardRate: 0,
      holderBonusDuration: 0,
      holderBonusReward: 0,
    }), accounts[0])

    checkStakingState(() => ({
      totalSupply: getScheduleRate(stakedBlockNumber - launchStakingBlockNumber),
      totalStaked: stakeAmount,
      historicalRewardRate: 0,
      lastScheduleEpoch: 0,
    }))


    advanceBlockTo(() => launchStakingBlockNumber + scheduleEpochDuration)

    describe('предварительный стейт', () => {
      checkCalcSupplyByBlock(() => ({
        // сделать расчет через тотал суппли)
        supply: getScheduleRate(scheduleEpochDuration) - getScheduleRate(stakedBlockNumber - launchStakingBlockNumber),
        epoch: 1,
      }))
      checkCalcHistoricalRewardRate(() => {
        return (
          getScheduleRate(scheduleEpochDuration - (stakedBlockNumber - launchStakingBlockNumber)) << 40n
        ) / stakeAmount
      })
    })

    // Получаем актуальное состояние стейкинга
    updateContractState()

    checkStakerState(() => {
      const reward = ((
          (
            getScheduleRate(scheduleEpochDuration - (stakedBlockNumber - launchStakingBlockNumber)) << 40n
          ) / BigInt(totalStaked.toString())
        ) * stakeAmount
      ) >> 40n

      const hbDuration = (launchStakingBlockNumber + scheduleEpochDuration) - stakedBlockNumber

      return {
        amount: stakeAmount,
        reward: reward,
        rawReward: 0,
        claimedReward: 0,
        holderBonusDuration: hbDuration,
        // holderBonusStart: stakedBlockNumber,
        initialRewardRate: 0,
        holderBonusReward: reward * getHolderBonusRate(hbDuration) / rate.denominator,
      }
    }, accounts[0])

    checkClaim(
      accounts[0],
      async () => {
        // Продолжительность стейкинга считаем на 1 блок больше текущего, т.к. +1 блок замайнится во время клейма вознаграждения
        const miningBlocks = 1n
        
        const hbDuration = (launchStakingBlockNumber + scheduleEpochDuration) - stakedBlockNumber + miningBlocks
        const hb = getHolderBonusRate(hbDuration)
        
        return { hb }
      },
      'Второй клейм, проверям что правильно зачислился бонус и вознаграждение'
    )

    // Получаем актуальное состояние стейкинга
    updateContractState()

    checkStakerState(() => {
      // попробовать через историю стейкинга пересчитать что бы точно убедиться что тест верный
      const rawReward = (historicalRewardRate * stakeAmount) >> 40n
      const holderBonus = rawReward * getHolderBonusRate(lastBlockNumber - stakedBlockNumber) / rate.denominator

      return {
        amount: stakeAmount,
        reward: 0n,
        // Т.к. предыдущая транзакция была клеймом, то rawReward должно быть равно кол-ву заклеймленого
        rawReward: rawReward,
        claimedReward: rawReward,
        initialRewardRate: historicalRewardRate,
        holderBonusDuration: lastBlockNumber - stakedBlockNumber,
        holderBonusReward: 0n,
      }
    }, accounts[0])

    //advanceBlockTo(() => lastBlockNumber + scheduleEpochDuration)

    // Получаем актуальное состояние стейкинга
    // updateContractState()

    // checkStakerState(() => {
    //   // попробовать через историю стейкинга пересчитать что бы точно убедиться что тест верный
    //   const rawReward = ((historicalRewardRate - ) * stakeAmount) >> 40n
    //   const holderBonus = rawReward * getHolderBonusRate(lastBlockNumber - stakedBlockNumber) / 10n**6n

    //   return {
    //     amount: stakeAmount,
    //     reward: 0,
    //     // Т.к. предыдущая транзакция была клеймом, то rawReward должно быть равно кол-ву заклеймленого
    //     rawReward: rawReward,
    //     claimedReward: rawReward,
    //     initialRewardRate: historicalRewardRate,
    //     holderBonusDuration: lastBlockNumber - stakedBlockNumber,
    //     holderBonusReward: holderBonus,
    //   }
    // }, accounts[0])

    // Получаем актуальное состояние стейкинга
    updateContractState()

    checkStake(
      accounts[0],
      () => stakeAmount,
      // checkStake делает апрув и стейк, майнится 2 блока перед проверкой
      () => ((lastBlockNumber + 2n) - stakedBlockNumber) / 2n + stakedBlockNumber,
      "Достейк с аккаунта 1"
    )

    // Получаем актуальное состояние стейкинга
    updateContractState()

    advanceBlockTo(() => lastBlockNumber + scheduleEpochDuration)

    // checkStakerState(() => ({
    //   amount: stakeAmount * 2n,
    //   reward: 0,
    //   rawReward: 0,
    //   claimedReward: 0,
    //   holderBonusStart: stakedBlockNumber,
    //   initialRewardRate: 0,
    //   holderBonusDuration: 0,
    // }), accounts[0])

    return
  })
})
