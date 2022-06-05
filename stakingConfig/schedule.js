const BigNumber = require('bignumber.js');

const totalMbase = new BigNumber(200000000)
const farmDurationWeeks = 106
const divider = 112
const rewardsInitRate = new BigNumber(0.598541785)
const rewardIncrease = new BigNumber(1.01)
//const epochDuration = 201600
const epochDuration = 10

const holderBonusInit = new BigNumber(0.01)
const holderBonusIncrease = new BigNumber(0.11)
const holderBonusIncreaseRate = new BigNumber(0.97)
const denominator = 10**6
const decimals = 10**18

const { schedule, totalDistribution } = new Array(farmDurationWeeks).fill(0).map((_, epochIndex) => {
  return totalMbase
    .div(divider)
    .times(rewardsInitRate)
    .times(rewardIncrease.pow(epochIndex))
    // .times(denominator)
    .times(decimals)
}).reduce(
  (acc, epochValue) => {
    acc.totalDistribution = acc.totalDistribution.plus(epochValue)
    acc.schedule.push(acc.totalDistribution.toFixed(0, BigNumber.ROUND_DOWN))

    return acc
  },
  { schedule: [], totalDistribution: new BigNumber(0) }
)

const {holderBonus: holderBonusBn} = new Array(farmDurationWeeks)
  .fill(0)
  .reduce((data, _, index) => {
    if (index === 0) {
      data.holderBonus.push(holderBonusInit)
    } else {
      data.holderBonus.push(
        data.holderBonus[index - 1]
          .times(
            holderBonusIncrease
              .times(holderBonusIncreaseRate.pow(index))
              .plus(1)
          )          
      )
    }

    return data
  }, {holderBonus:[]})

const {holderBonus: holderBonusBnA} = holderBonusBn.reduce((data, hbBn, index) => {
  data.sum = hbBn.plus(data.sum)

  data.holderBonus.push(data.sum.div(index + 1))

  return data
}, {holderBonus:[], sum: new BigNumber(0)})
const {holderBonus: holderBonusAverageRate} = holderBonusBnA.reduce((data, hb, index) => {
  data.sum = data.sum.plus(hb)
  data.holderBonus.push(data.sum)

  return data
}, {holderBonus:[], sum: new BigNumber(0)})
const holderBonus = holderBonusAverageRate.map(hbBn => hbBn.times(denominator).toFixed(0, BigNumber.ROUND_DOWN))



// The first item of `holderBonusAverageRate` should be equal zero
holderBonus.unshift('0')
schedule.unshift('0')

console.log(`Epoch\t| Rate\t| Amount`)
schedule.forEach((rate, index) => {
  console.log(`${index}\t| ${rate}\t| ${index*epochDuration}\t| ${new BigNumber(rate).div(decimals).toFixed(2, BigNumber.ROUND_DOWN)} mBase`)
})


console.log(`Epoch\t| Rate\t| Normalized`)
holderBonus.forEach((rate, index) => {
  console.log(`${index}\t| ${rate}\t| ${index*epochDuration}\t| ${new BigNumber(rate).div(denominator).toFixed(2, BigNumber.ROUND_DOWN)}`)
})

module.exports = {
  holderBonus,
  schedule,
  totalDistribution,
  epochDuration,
  denominator,
}