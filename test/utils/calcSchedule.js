const rate = require('../../stakingConfig/schedule.js')

const getScheduleRateItem = (epoch) => {
  if (epoch >= 0n && epoch < BigInt(rate.schedule.length)) {
    return BigInt(rate.schedule[epoch])
  }

  return 0n
}

const getScheduleRate = (duration) => {
  const scheduleEpochDuration = BigInt(rate.epochDuration)

  const epoch = BigInt(duration) / scheduleEpochDuration
  const value = getScheduleRateItem(epoch) + (
    getScheduleRateItem(epoch + 1n)
    * (duration - (epoch * scheduleEpochDuration))
    / scheduleEpochDuration
  )

  return value
}


const getHolderBonusRateItem = (epoch) => {
  if (epoch >= 0n && epoch < BigInt(rate.hbRate.length)) {
    return rate.hbRate[epoch]
  }

  return 0n
}

const calcSupplyByBlock = (duration, _totalSupply = 0n) => {
  const scheduleEpochDuration = BigInt(rate.epochDuration)
  const epochIndex = duration / scheduleEpochDuration;
  let remainder = 0n;

  if (epochIndex >= BigInt(rate.schedule.length - 1)) {
    epochIndex = BigInt(rate.schedule.length - 1);
  } else {
    remainder = duration % scheduleEpochDuration; 
  }

  let currentSupply = getScheduleRateItem(epochIndex)

  if (remainder > 0 && getScheduleRateItem(epochIndex + 1n) > 0) {
    currentSupply += remainder * (getScheduleRateItem(epochIndex + 1n) - currentSupply) / scheduleEpochDuration;
  }

  currentSupply -= _totalSupply;

  return currentSupply
}






const getHolderBonusRate = (duration) => {
  const holderBonusEpochDuration = BigInt(rate.epochDuration)

  const epoch = BigInt(duration) / holderBonusEpochDuration
  const value = getHolderBonusRateItem(epoch) + (
    getHolderBonusRateItem(epoch + 1n)
    * (duration - (epoch * holderBonusEpochDuration))
    / holderBonusEpochDuration
  )

  return value
}

exports.getScheduleRate = getScheduleRate
exports.getHolderBonusRate = getHolderBonusRate
exports.calcSupplyByBlock = calcSupplyByBlock
