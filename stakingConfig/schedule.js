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
const denominator = 10n**6n
const decimals = 10**18

const schedule = [
  0n,
  1068824616071430000000000n,
  2148337478303570000000000n,
  3238645469158040000000000n,
  4339856539921040000000000n,
  5452079721391680000000000n,
  6575425134677030000000000n,
  7710004002095230000000000n,
  8855928658187610000000000n,
  10013312560840900000000000n,
  11182270302520800000000000n,
  12362917621617400000000000n,
  13555371413905000000000000n,
  14759749744115500000000000n,
  15976171857628100000000000n,
  17204758192275800000000000n,
  18445630390269900000000000n,
  19698911310244100000000000n,
  20964725039417900000000000n,
  22243196905883600000000000n,
  23534453491013800000000000n,
  24838622641995400000000000n,
  26155833484486800000000000n,
  27486216435403100000000000n,
  28829903215828500000000000n,
  30187026864058200000000000n,
  31557721748770300000000000n,
  32942123582329400000000000n,
  34340369434224100000000000n,
  35752597744637800000000000n,
  37178948338155600000000000n,
  38619562437608600000000000n,
  40074582678056100000000000n,
  41544153120908100000000000n,
  43028419268188600000000000n,
  44527528076941900000000000n,
  46041627973782700000000000n,
  47570868869592000000000000n,
  49115402174359300000000000n,
  50675380812174400000000000n,
  52250959236367500000000000n,
  53842293444802600000000000n,
  55449540995322100000000000n,
  57072861021346800000000000n,
  58712414247631700000000000n,
  60368363006179400000000000n,
  62040871252312600000000000n,
  63730104580907200000000000n,
  65436230242787700000000000n,
  67159417161287000000000000n,
  68899835948971300000000000n,
  70657658924532400000000000n,
  72433060129849200000000000n,
  74226215347219100000000000n,
  76037302116762700000000000n,
  77866499754001800000000000n,
  79713989367613200000000000n,
  81579953877360800000000000n,
  83464578032205800000000000n,
  85368048428599300000000000n,
  87290553528956800000000000n,
  89232283680317800000000000n,
  91193431133192400000000000n,
  93174190060595700000000000n,
  95174756577273100000000000n,
  97195328759117200000000000n,
  99236106662779900000000000n,
  101297292345479000000000000n,
  103379089885005000000000000n,
  105481705399927000000000000n,
  107605347069997000000000000n,
  109750225156769000000000000n,
  111916552024408000000000000n,
  114104542160724000000000000n,
  116314412198402000000000000n,
  118546380936458000000000000n,
  120800669361894000000000000n,
  123077500671584000000000000n,
  125377100294371000000000000n,
  127699695913386000000000000n,
  130045517488592000000000000n,
  132414797279549000000000000n,
  134807769868416000000000000n,
  137224672183172000000000000n,
  139665743521075000000000000n,
  142131225572357000000000000n,
  144621362444152000000000000n,
  147136400684665000000000000n,
  149676589307583000000000000n,
  152242179816730000000000000n,
  154833426230969000000000000n,
  157450585109350000000000000n,
  160093915576515000000000000n,
  162763679348352000000000000n,
  165460140757906000000000000n,
  168183566781557000000000000n,
  170934227065444000000000000n,
  173712393952170000000000000n,
  176518342507763000000000000n,
  179352350548912000000000000n,
  182214698670473000000000000n,
  185105670273249000000000000n,
  188025551592053000000000000n,
  190974631724045000000000000n,
  193953202657357000000000000n,
  196961559300001000000000000n,
  199999999509073000000000000n,
]

const hbRate = [
  0n,
  5000n,
  5466n,
  6065n,
  6728n,
  7462n,
  8272n,
  9167n,
  10154n,
  11242n,
  12441n,
  13759n,
  15207n,
  16796n,
  18538n,
  20446n,
  22532n,
  24811n,
  27296n,
  30002n,
  32945n,
  36142n,
  39608n,
  43362n,
  47419n,
  51799n,
  56518n,
  61595n,
  67049n,
  72896n,
  79155n,
  85843n,
  92976n,
  100572n,
  108644n,
  117209n,
  126278n,
  135865n,
  145980n,
  156632n,
  167829n,
  179576n,
  191878n,
  204736n,
  218150n,
  232118n,
  246636n,
  261696n,
  277289n,
  293403n,
  310026n,
  327141n,
  344730n,
  362773n,
  381247n,
  400128n,
  419390n,
  439005n,
  458944n,
  479177n,
  499671n,
  520394n,
  541312n,
  562391n,
  583597n,
  604894n,
  626248n,
  647624n,
  668988n,
  699418n,
  711542n,
  732668n,
  753650n,
  774458n,
  795064n,
  815439n,
  835557n,
  855393n,
  874925n,
  894130n,
  912989n,
  931484n,
  949597n,
  967315n,
  984623n,
  1001512n,
  1017971n,
  1033991n,
  1049567n,
  1064694n,
  1079368n,
  1093586n,
  1107349n,
  1120656n,
  1133509n,
  1145912n,
  1157867n,
  1169379n,
  1180455n,
  1191101n,
  1201324n,
  1211131n,
  1220531n,
  1229534n,
  1238148n,
  1246383n,
  1248668n,
]

if (schedule.length !== hbRate.length) {
  throw new Error('Incorrect hbRate or schedule')
}

// const { schedule, totalDistribution } = new Array(farmDurationWeeks).fill(0).map((_, epochIndex) => {
//   return totalMbase
//     .div(divider)
//     .times(rewardsInitRate)
//     .times(rewardIncrease.pow(epochIndex))
//     // .times(denominator)
//     .times(decimals)
// }).reduce(
//   (acc, epochValue) => {
//     acc.totalDistribution = acc.totalDistribution + BigInt(epochValue.toFixed(0, BigNumber.ROUND_DOWN))
//     acc.schedule.push(acc.totalDistribution)

//     return acc
//   },
//   { schedule: [], totalDistribution: 0n }
// )
// schedule.unshift(0n)

console.log(`Epoch\t| Rate\t| Amount`)
schedule.forEach((rate, index) => {
  console.log(`${index}\t| ${rate}\t| ${index*epochDuration}\t| ${new BigNumber(rate).div(decimals).toFixed(2, BigNumber.ROUND_DOWN)} mBase`)
})


console.log(`Epoch\t| Rate\t| BlockNumber\t| Normalized`)
hbRate.forEach((rate, index) => {
  console.log(`${index}\t| ${rate}\t| ${index*epochDuration}\t| ${new BigNumber(rate).div(denominator).toFixed(2, BigNumber.ROUND_DOWN)}`)
})

const totalDistribution = schedule[schedule.length - 1]
const totalDistributionWithHb = totalDistribution * hbRate[hbRate.length - 1] / denominator + totalDistribution + 1n

console.log(`totalDistribution:`, totalDistribution)
console.log(`totalDistributionWithHb:`, totalDistributionWithHb)

const farmingDuration = BigInt(schedule.length) * BigInt(epochDuration)

module.exports = {
  hbRate,
  schedule,
  totalDistribution,
  totalDistributionWithHb,
  epochDuration,
  denominator,
  farmingDuration,
}




// const {holderBonus: holderBonusBn} = new Array(farmDurationWeeks)
//   .fill(0)
//   .reduce((data, _, index) => {
//     if (index === 0) {
//       data.holderBonus.push(holderBonusInit)
//     } else {
//       data.holderBonus.push(
//         data.holderBonus[index - 1]
//           .times(
//             holderBonusIncrease
//               .times(holderBonusIncreaseRate.pow(index))
//               .plus(1)
//           )          
//       )
//     }

//     return data
//   }, {holderBonus:[]})

// const {holderBonus: holderBonusBnA} = holderBonusBn.reduce((data, hbBn, index) => {
//   data.sum = hbBn.plus(data.sum)

//   data.holderBonus.push(data.sum.div(index + 1))

//   return data
// }, {holderBonus:[], sum: new BigNumber(0)})
// const {holderBonus: holderBonusAverageRate} = holderBonusBnA.reduce((data, hb, index) => {
//   data.sum = data.sum.plus(hb)
//   data.holderBonus.push(data.sum)

//   return data
// }, {holderBonus:[], sum: new BigNumber(0)})
// const holderBonus = holderBonusAverageRate.map(hbBn => hbBn.times(denominator).toFixed(0, BigNumber.ROUND_DOWN))



// // The first item of `holderBonusAverageRate` should be equal zero
// holderBonus.unshift('0')
