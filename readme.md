# Solidity API

## MBaseFarm








### StakerState








```solidity
struct StakerState {
  uint128 holderBonusStart;
  uint128 amount;
  uint256 initialRewardRate;
  uint128 reward;
  uint128 claimedReward;
  uint256 holderBonusReward;
  uint256 holderBonusClaimedReward;
  uint256 holderBonusInitalRate;
}
```

### startedStaking

```solidity
uint128 startedStaking
```



_The block number from which farming is started._




### denominator

```solidity
uint128 denominator
```

Divide the item of &#x60;holderBonusAverageRate&#x60; or &#x60;rewardSchedule&#x60; by this variable to get the actual value of the item.

_Items in &#x60;holderBonusAverageRate&#x60; and &#x60;rewardSchedule&#x60; are multiplied by 10^6 to get more accuracy._




### holderBonusAverageRate

```solidity
uint256[] holderBonusAverageRate
```

Divide the item of &#x60;holderBonusAverageRate&#x60; by &#x60;denominator&#x60; variable to get the actual value of the item.

key - epoch number;
value - Average value of items between 0 and the index of item;

_The schedule of distribution._




### holderBonusEpochDuration

```solidity
uint128 holderBonusEpochDuration
```

201600 blocks per a week.

_Every 201600 blocks the holder bonus changes._




### scheduleEpochDuration

```solidity
uint128 scheduleEpochDuration
```

201600 blocks per a week.

_Every 201600 blocks the distribution changes._




### totalDistribution

```solidity
uint256 totalDistribution
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
uint128 maxEpochIndex
```



_maxEpochIndex_




### rewardSchedule

```solidity
uint256[] rewardSchedule
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
uint128 totalStaked
```



_Amount of LP currently staked in the service._




### stakerState

```solidity
mapping(address &#x3D;&gt; struct MBaseFarm.StakerState) stakerState
```

MBaseFarm.StakerState





### stakingToken

```solidity
address stakingToken
```







### earningToken

```solidity
address earningToken
```







### StakingLaunched

```solidity
event StakingLaunched(uint128 block, uint256 totalDistribution)
```







### Staked

```solidity
event Staked(address owner, address from, uint128 amount)
```







### UpdateHistoricalRewardRate

```solidity
event UpdateHistoricalRewardRate(uint256 rate)
```







### Rewarded

```solidity
event Rewarded(address owner, address to, uint128 amount)
```







### constructor

```solidity
constructor(address _stakingToken, address _earningToken) public
```







### setSchedule

```solidity
function setSchedule(uint256[] _holderBonusAverageRate, uint256[] _rewardSchedule) public
```







### launchStaking

```solidity
function launchStaking() public
```







### _blockNumber

```solidity
function _blockNumber() private view returns (uint128)
```







### getState

```solidity
function getState() public view returns (uint128 holderBonusStart, uint128 amount, uint128 reward, uint128 claimedReward, uint128 holderBonusDuration)
```







### stake

```solidity
function stake(uint128 amount) public
```







### _stake

```solidity
function _stake(address owner, address from, uint128 amount) private
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
function _updateStateAndStaker(address owner) private returns (struct MBaseFarm.StakerState state)
```







### getRewards

```solidity
function getRewards(address owner) public view returns (uint128 amount)
```

etRewards(address owner) public view





### calcUnrewarded

```solidity
function calcUnrewarded(uint256 _historicalRewardRate, uint256 _initialRewardRate, uint256 _amount) public pure returns (uint128 unrewarded)
```

istorical reward rate and the state of the farmer.
Don&#x27;t use this method for getting staker reward, use the &quot;getRewards&quot; method instead.


| Name | Type | Description |
| ---- | ---- | ----------- |
| _historicalRewardRate | uint256 | The historical reward rate. |
| _initialRewardRate | uint256 | The last recorded rate. |
| _amount | uint256 | Staked amount. |

| Name | Type | Description |
| ---- | ---- | ----------- |
| unrewarded | uint128 | Pending reward. /   function calcUnrewarded(uint256 _historicalRewa |


### updateHistoricalRewardRate

```solidity
function updateHistoricalRewardRate() public
```

ate() public {





### calcHistoricalRewardRate

```solidity
function calcHistoricalRewardRate(uint256 _currentSupply, uint128 _totalStaked, uint256 _historicalRewardRate) public pure returns (uint256 currentHistoricalRewardRate)
```

The return value should always be greater than or equal to &#x60;_historicalRewardRate&#x60;.
The &#x60;_historyRewardRate&#x60; is as multiplied by &#x60;denominator&#x60; as &#x60;historyRewardRate&#x60; and return value.


| Name | Type | Description |
| ---- | ---- | ----------- |
| _currentSupply | uint256 | Amount of unlocked tokens since last update &#x60;historicalRewardRate&#x60;, multiplied by &#x60;denominator&#x60;. |
| _totalStaked | uint128 | Amount of tokens currently staked in the service. |
| _historicalRewardRate | uint256 | Current historical reward rate. |

| Name | Type | Description |
| ---- | ---- | ----------- |
| currentHistoricalRewardRate | uint256 | New historical reward rate considering new unlocked tokens and amount of total staked. /    function calcHistoricalRewardRate(uint256 _cur |


### _updateTotalSupply

```solidity
function _updateTotalSupply() private returns (uint256 currentSupply)
```







### calcSupplyByBlock

```solidity
function calcSupplyByBlock(uint128 _block, uint256 _totalSupply) public view returns (uint256 amount, uint128 epochIndex)
```

number and total supply.


| Name | Type | Description |
| ---- | ---- | ----------- |
| _block | uint128 | Number of the block for which you want to calculate the additional supply. |
| _totalSupply | uint256 | Current total supply. |

| Name | Type | Description |
| ---- | ---- | ----------- |
| amount | uint256 | Additional supply by block number. |
| epochIndex | uint128 | The number of distribution schedule epoch. /   function calcSupplyByBlock(uint128 _block, uint |


### getHolderBonusDuration

```solidity
function getHolderBonusDuration() public view returns (uint256 holderBonusDuration)
```







### calcHolderBonusDuration

```solidity
function calcHolderBonusDuration(uint128 _holderBonusStart) public view returns (uint128 holderBonusDuration)
```







### calcCurrentHolderBonusRate

```solidity
function calcCurrentHolderBonusRate(uint128 _duration) public view returns (uint256 rate, uint256 epochIndex)
```

nusRate(uint128 _du





### calcHolderBonus

```solidity
function calcHolderBonus(uint128 _duration, uint256 _holderBonusInitalRate, uint256 _reward) public view returns (uint256 amount, uint256 currentHolderBonusRate)
```

of staking.
_holderBonusInitalRate must be multiplied by the &quot;denominator&quot;.


| Name | Type | Description |
| ---- | ---- | ----------- |
| _duration | uint128 |  |
| _holderBonusInitalRate | uint256 | Initial holder bonus rate. |
| _reward | uint256 | Staking reward. |

| Name | Type | Description |
| ---- | ---- | ----------- |
| amount | uint256 | The amount of holder bonus reward by hold duration, initial holder bonus rate and staking reward. |
| currentHolderBonusRate | uint256 | Current holder bonus rate multiplied by &#x60;denominator&#x60;. /   function calcHolderBonus(uint128 _duration, uin |


### calcHolderBonusByState

```solidity
function calcHolderBonusByState(struct MBaseFarm.StakerState state) private view returns (uint256 holderBonusAmount, uint256 currentHolderBonusRate)
```

rn holderBonusAmount 
/
  function calcHolderBonusByState(StakerState sto





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
function _updateHolderBonusDays(address owner, uint128 addedAmount) private
```







### recalcStartHolderBonus

```solidity
function recalcStartHolderBonus(uint128 _stakedAmount, uint128 _addedAmount, uint128 _holderBonusDuration) public view returns (uint128 holderBonusStart)
```

uint128 _staked






