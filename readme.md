# Solidity API

## MBaseFarm

### FarmerState

```solidity
struct FarmerState {
  uint256 holderBonusStart;
  uint128 amount;
  uint128 initialRewardRate;
  uint128 reward;
  uint256 claimedReward;
  uint256 holderBonusReward;
  uint256 holderBonusClaimedReward;
  uint256 holderBonusInitalRate;
}
```

### startedStaking

```solidity
uint256 startedStaking
```

_The block number from which farming is started._

### denominator

```solidity
uint256 denominator
```

Divide the item of &#x60;holderBonusAverageRate&#x60; or &#x60;rewardSchedule&#x60; by this variable to get the actual value of the item.

_Items in &#x60;holderBonusAverageRate&#x60; and &#x60;rewardSchedule&#x60; are multiplied by 10^6 to get more accuracy._

### holderBonusAverageRate

```solidity
uint128[] holderBonusAverageRate
```

Divide the item of &#x60;holderBonusAverageRate&#x60; by &#x60;denominator&#x60; variable to get the actual value of the item.

key - epoch number;
value - Average value of items between 0 and the index of item;

_The schedule of distribution._

### holderBonusEpochDuration

```solidity
uint256 holderBonusEpochDuration
```

201600 blocks per a week.

_Every 201600 blocks the holder bonus changes._

### scheduleEpochDuration

```solidity
uint256 scheduleEpochDuration
```

201600 blocks per a week.

_Every 201600 blocks the distribution changes._

### totalDistribution

```solidity
uint128 totalDistribution
```

_The total amount for staking rewards._

### lastScheduleEpoch

```solidity
uint256 lastScheduleEpoch
```

_The number of last ended schedule epoch._

### totalSupply

```solidity
uint256 totalSupply
```

_The total supply of distributed tokens at the time of the last change in the state of the contract._

### maxEpochIndex

```solidity
uint256 maxEpochIndex
```

_maxEpochIndex_

### rewardSchedule

```solidity
uint128[] rewardSchedule
```

Divide the item of &#x60;rewardSchedule&#x60; by &#x60;denominator&#x60; variable to get the actual value of the item.

key - epoch number;
value - cumulative total supply;

_The schedule of distribution._

### historicalRewardRate

```solidity
uint256 historicalRewardRate
```

Never decreases.

_How many MBase minted per one LP._

### totalStaked

```solidity
uint256 totalStaked
```

_Amount of LP currently staked in the service._

### farmerState

```solidity
mapping(address &#x3D;&gt; struct MBaseFarm.FarmerState) farmerState
```

MBaseFarm.FarmerState

### stakingToken

```solidity
address stakingToken
```

### earningToken

```solidity
address earningToken
```

### stakingTokenDecimalsDenominator

```solidity
uint256 stakingTokenDecimalsDenominator
```

### constructor

```solidity
constructor(address _stakingToken, address _earningToken, uint128[] _holderBonusAverageRate, uint128[] _rewardSchedule) public
```

### blockNumber

```solidity
function blockNumber() public view returns (uint256)
```

### launchStaking

```solidity
function launchStaking() public
```

### stake

```solidity
function stake(uint128 amount) public
```

### _stake

```solidity
function _stake(address owner, uint128 amount) private
```

### unstake

```solidity
function unstake(uint128 amount) public
```

### _unstake

```solidity
function _unstake(address owner, address to, uint128 amount) private
```

### claim

```solidity
function claim() public
```

### _claim

```solidity
function _claim(address owner, address to) private
```

### _updateStateAndStaker

```solidity
function _updateStateAndStaker(address owner) private returns (struct MBaseFarm.FarmerState state)
```

### getRewards

```solidity
function getRewards(address owner) public view returns (uint256 amount)
```

s owner) public view

### calcReward

```solidity
function calcReward(uint256 _historicalRewardRate, uint256 _initialRewardRate, uint256 _amount, uint128 _reward) public view returns (uint128 currentReward)
```

istorical reward rate and the state of the farmer.
/
  function calcReward(uint256 _historicalRewardRa

### updateHistoricalRewardRate

```solidity
function updateHistoricalRewardRate() public
```

### calcHistoricalRewardRate

```solidity
function calcHistoricalRewardRate(uint256 _currentSupply, uint256 _totalStaked, uint256 _historicalRewardRate) public pure returns (uint256 currentHistoricalRewardRate)
```

The return value should always be greater than or equal to &#x60;_historicalRewardRate&#x60;.
The &#x60;_historyRewardRate&#x60; is as multiplied by &#x60;denominator&#x60; as &#x60;historyRewardRate&#x60; and return value.

| Name | Type | Description |
| ---- | ---- | ----------- |
| _currentSupply | uint256 | Amount of unlocked tokens since last update &#x60;historicalRewardRate&#x60;, multiplied by &#x60;denominator&#x60;. |
| _totalStaked | uint256 | Amount of tokens currently staked in the service. |
| _historicalRewardRate | uint256 | Current historical reward rate. |

| Name | Type | Description |
| ---- | ---- | ----------- |
| currentHistoricalRewardRate | uint256 | New historical reward rate considering new unlocked tokens and amount of total staked. /   function calcHistoricalRewardRate(uint256 _curr |

### _updateTotalSupply

```solidity
function _updateTotalSupply() private returns (uint256 currentSupply)
```

### calcSupplyByBlock

```solidity
function calcSupplyByBlock(uint256 _block, uint256 _totalSupply) public view returns (uint256 amount, uint256 epochIndex)
```

number and total supply.

| Name | Type | Description |
| ---- | ---- | ----------- |
| _block | uint256 | Number of the block for which you want to calculate the additional supply. |
| _totalSupply | uint256 | Current total supply. |

| Name | Type | Description |
| ---- | ---- | ----------- |
| amount | uint256 | Additional supply by block number. |
| epochIndex | uint256 | The number of distribution schedule epoch. /   function calcSupplyByBlock(uint256 _block, uint |

### getHolderBonusDuration

```solidity
function getHolderBonusDuration() public view returns (uint256 holderBonusDuration)
```

### calcHolderBonusDuration

```solidity
function calcHolderBonusDuration(uint256 _holderBonusStart) public view returns (uint256 holderBonusDuration)
```

### calcCurrentHolderBonusRate

```solidity
function calcCurrentHolderBonusRate(uint256 _duration) public view returns (uint256 rate, uint256 epochIndex)
```

nusRate(uint256 _du

### calcHolderBonus

```solidity
function calcHolderBonus(uint256 _duration, uint256 _holderBonusInitalRate, uint256 _reward) public view returns (uint256 amount, uint256 currentHolderBonusRate)
```

_holderBonusInitalRate should be multiplied by &#x60;denominator&#x60;.

| Name | Type | Description |
| ---- | ---- | ----------- |
| _duration | uint256 |  |
| _holderBonusInitalRate | uint256 | Initial holder bonus rate. |
| _reward | uint256 | Staking reward. |

| Name | Type | Description |
| ---- | ---- | ----------- |
| amount | uint256 | The amount of holder bonus reward by hold duration, initial holder bonus rate and staking reward. |
| currentHolderBonusRate | uint256 | Current holder bonus rate multiplied by &#x60;denominator&#x60;. /   function calcHolderBonus(uint256 _duration, uin |

### calcHolderBonusByState

```solidity
function calcHolderBonusByState(struct MBaseFarm.FarmerState state) private view returns (uint256 holderBonusAmount, uint256 currentHolderBonusRate)
```

### getHolderBonus

```solidity
function getHolderBonus() public view returns (uint256 holderBonusAmount)
```

### claimHolderBonus

```solidity
function claimHolderBonus() public
```

### _claimHolderBonus

```solidity
function _claimHolderBonus(address owner, address to) private
```

### _resetHolderBonus

```solidity
function _resetHolderBonus(address owner) private
```

### _updateHolderBonusDays

```solidity
function _updateHolderBonusDays(address owner, uint256 addedAmount) private returns (uint256 duration)
```

