// SPDX-License-Identifier: MIT

pragma solidity 0.8.12;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/utils/math/SafeCast.sol";

contract MBaseFarm is Context {
  using SafeERC20 for IERC20;
  using SafeCast for uint256;

  /**
   * @dev This is the data necessary to calculate the user's profitability.
   *
   * @param holderBonusStart is start time of accrual of the bonus holder.
   * @param amount of LP currently staked by the farmer.
   * @param initialRewardRate value of historicalRewardRate before last update of the farmer's data.
   * @param reward total amount of MBase accrued to the farmer.
   * @param claimedReward total amount of MBase the farmer transferred from the service already.
   */
  struct StakerState {
    uint128 holderBonusStart;
    uint128 amount;
    uint256 initialRewardRate;
    uint128 reward;
    uint128 claimedReward;
    uint128 holderBonusReward;
    uint128 holderBonusClaimedReward;
  }

  /**
   * @dev The block number from which farming is started.
   */
  uint128 public startedStaking;

  /**
   * @dev Items in `holderBonusAverageRate` is multiplied by 10^6 to get more accuracy.
   * @notice Divide the item of `holderBonusAverageRate` or `rewardSchedule` by this variable to get the actual value of the item.
   */
  uint128 public constant denominator = 10**6;
  /**
   * @dev The schedule of distribution.
   * @notice Divide the item of `holderBonusAverageRate` by `denominator` variable to get the actual value of the item.
   *
   * key - epoch number;
   * value - Average value of items between 0 and the index of item;
   */
  uint128[] public holderBonusAverageRate;
  /**
   * @dev Every 201600 blocks the holder bonus changes.
   * @notice 201600 blocks per a week.
   */
  uint128 public immutable holderBonusEpochDuration;

  /**
   * @dev Every 201600 blocks the distribution changes.
   * @notice 201600 blocks per a week.
   */
  uint128 public immutable scheduleEpochDuration;
  /**
   * @dev The total amount for staking rewards.
   */
  uint256 public totalDistribution;
  /**
   * @dev The number of last ended schedule epoch.
   */
  uint256 public lastScheduleEpoch;
  /**
   * @dev The total supply of distributed tokens at the time of the last change in the state of the contract.
   */
  uint256 public totalSupply;
  /**
   * @dev maxEpochIndex
   */
  uint128 public maxEpochIndex;
  /**
   * @dev The schedule of distribution.
   *
   * key - epoch number;
   * value - cumulative total supply;
   */
  uint256[] public rewardSchedule;
  /**
   * @dev How many MBase minted per one LP.
   * @notice Never decreases.
   */
  uint256 public historicalRewardRate;
  /**
   * @dev Amount of LP currently staked in the service.
   */
  uint128 public totalStaked;

  /**
   * MBaseFarm.StakerState
   */
  mapping (address => StakerState) public stakerState;

  address public immutable stakingToken;
  address public immutable earningToken;

  event StakingLaunched(uint128 block, uint256 totalDistribution);
  event Staked(address indexed owner, address indexed from, uint128 amount);
  event UpdateHistoricalRewardRate(uint256 rate);
  event Rewarded(address indexed owner, address indexed to, uint128 amount);
  event HolderBonusRewarded(address indexed owner, address indexed to, uint128 amount);
  event UpdateHolderBonusDuration(address indexed owner, uint128 amount, uint128 fromBlock);
  event ResetHolderBonusDuration(address indexed owner);

  constructor(address _stakingToken, address _earningToken, uint128 _holderBonusEpochDuration, uint128 _scheduleEpochDuration) {
    require(_stakingToken != address(0), "Invalid staking token address");
    require(_earningToken != address(0), "Invalid earning token address");

    holderBonusEpochDuration = _holderBonusEpochDuration;
    scheduleEpochDuration = _scheduleEpochDuration;

    stakingToken = _stakingToken;
    earningToken = _earningToken;
  }

  function setSchedule(uint128[] memory _holderBonusAverageRate, uint256[] memory _rewardSchedule) public {
    require(startedStaking == 0, "[launchStaking]: Staking is already launched");
    require(_holderBonusAverageRate.length == _rewardSchedule.length && _rewardSchedule.length > 0, "Invalid length");
    require(_holderBonusAverageRate[0] == 0, "The first item of `holderBonusAverageRate` should be equal zero");
    require(_rewardSchedule[0] == 0, "The first item of `rewardSchedule` should be equal zero");
    
    // Хуй знает почему, но не работает в ganache, при этом все норм в тестнете
    //
    // for (uint256 index = 0; index < _rewardSchedule.length; index++) {
    //   require(_holderBonusAverageRate[index] < denominator, "Items of `holderBonusAverageRate` should be less then `denominator`");
    //   require(_rewardSchedule[index] > 0, "Items of `rewardSchedule` should be greater than 0");
    // }

    rewardSchedule = _rewardSchedule;
    holderBonusAverageRate = _holderBonusAverageRate;
    maxEpochIndex = (_rewardSchedule.length - 1).toUint128();
    totalDistribution = _rewardSchedule[_rewardSchedule.length - 1] + 1;
  }

  function launchStaking() public {
    require(startedStaking == 0, "[launchStaking]: Staking is already launched");
    require(holderBonusAverageRate.length > 0 && rewardSchedule.length > 0, "[launchStaking]: Schedule is not setted");
    require(totalDistribution > 0, "[launchStaking]: The total distribution is too low");

    IERC20(earningToken).safeTransferFrom(_msgSender(), address(this), totalDistribution);

    startedStaking = _blockNumber();

    emit StakingLaunched(startedStaking, totalDistribution);
  }

  function _blockNumber() private view returns (uint128) {
    return block.number.toUint128();
  }

  function getState() public view returns (uint128 amount, uint128 reward, uint128 claimedReward, uint128 holderBonusStart, uint128 holderBonusDuration, uint128 holderBonus) {
    address owner = _msgSender();

    StakerState storage state = stakerState[owner];
    holderBonusStart = state.holderBonusStart;
    holderBonusDuration = getHolderBonusDurationByState(state);
    holderBonus = getHolderBonusByAccount(owner);
    amount = state.amount;
    reward = getRewards(owner);
    claimedReward = state.claimedReward;
  }

  function stake(uint128 amount) public {
    require(startedStaking > 0, "[stake]: The staking is not launched");
    require(amount > 0, "[stake]: No zero deposit allowed");

    address owner = _msgSender();

    _stake(owner, owner, amount);
  }

  function _stake(address owner, address from, uint128 amount) private {
    IERC20(stakingToken).safeTransferFrom(from, address(this), amount);

    _updateStateAndStaker(owner);

    // Important
    //
    // The "_updateHolderBonusState" method must be called before the updating amount.
    StakerState storage state = _updateHolderBonusState(owner, amount);

    state.amount += amount;
    totalStaked += amount;

    emit Staked(owner, from, amount);
  }

  function unstake(uint128 amount) public {
    address owner = _msgSender();
    

    _unstake(owner, owner, amount);
  }

  function _unstake(address owner, address to, uint128 amount) private {
    _updateStateAndStaker(owner);
    StakerState storage state = _updateHolderBonusState(owner, 0);
    _resetHolderBonus(owner);
  
    require(state.amount >= amount, "NmxStakingService: NOT_ENOUGH_STAKED");

    state.amount -= amount;
    totalStaked -= amount;

    IERC20(stakingToken).safeTransfer(to, amount);
    // emit Unstaked(owner, to, amount);
  }

  function claim() public {
    address owner = _msgSender();

    _claim(owner, owner);
  }

  function _claim(address _owner, address _to) private {
    _updateStateAndStaker(_owner);
    StakerState storage state = _updateHolderBonusState(_owner, 0);
    assert(state.reward >= state.claimedReward);
    uint128 unclaimedReward = state.reward - state.claimedReward;

    state.claimedReward += unclaimedReward;

    IERC20(earningToken).safeTransfer(_to, unclaimedReward);
    emit Rewarded(_owner, _to, unclaimedReward);
  }

  function _updateStateAndStaker(address _owner) private returns (StakerState storage state) {
    updateHistoricalRewardRate();
    state = stakerState[_owner];

    uint128 unrewarded = calcUnrewarded(historicalRewardRate, state.initialRewardRate, state.amount);
    state.initialRewardRate = historicalRewardRate;
    state.reward = unrewarded + state.reward;
  }

  /**
   * @dev for ui
   * @dev 
   */
  function getRewards(address owner) public view returns (uint128 amount) {
    StakerState storage state = stakerState[owner];
    (uint256 currentSupply,) = calcSupplyByBlock(_blockNumber(), totalSupply);
    uint256 currentHistoricalRewardRate = calcHistoricalRewardRate(currentSupply, totalStaked, historicalRewardRate);
    uint128 unrewarded = calcUnrewarded(currentHistoricalRewardRate, state.initialRewardRate, state.amount);

    amount = state.reward + unrewarded - state.claimedReward;
  }

  /**
   * @dev Calculates the reward based on the historical reward rate and the state of the farmer.
   * @notice Don't use this method for getting staker reward, use the "getRewards" method instead.
   *
   * @param _historicalRewardRate The historical reward rate.
   * @param _initialRewardRate The last recorded rate.
   * @param _amount Staked amount.
   *
   * @return unrewarded Pending reward.
   */
  function calcUnrewarded(uint256 _historicalRewardRate, uint256 _initialRewardRate, uint256 _amount) public pure returns (uint128 unrewarded) {
    unrewarded = (((_historicalRewardRate - _initialRewardRate) * _amount) >> 40).toUint128();
  }

  /**
   * 
   */
  function updateHistoricalRewardRate() public {
    uint256 currentSupply = _updateTotalSupply();
    historicalRewardRate = calcHistoricalRewardRate(currentSupply, totalStaked, historicalRewardRate);

    emit UpdateHistoricalRewardRate(historicalRewardRate);
  }

  /**
   * @dev Calculate historical reward rate.
   * @notice The return value should always be greater than or equal to `_historicalRewardRate`.
   * @notice The `_historyRewardRate` is as multiplied by `denominator` as `historyRewardRate` and return value.
   *
   * @param _currentSupply Amount of unlocked tokens since last update `historicalRewardRate`, multiplied by `denominator`.
   * @param _totalStaked Amount of tokens currently staked in the service.
   * @param _historicalRewardRate Current historical reward rate.
   *
   * @return currentHistoricalRewardRate New historical reward rate considering new unlocked tokens and amount of total staked.
   */ 
  function calcHistoricalRewardRate(uint256 _currentSupply, uint128 _totalStaked, uint256 _historicalRewardRate) public pure returns (uint256 currentHistoricalRewardRate) {
    if (_currentSupply == 0 || _totalStaked == 0) {
      return _historicalRewardRate;
    }

    uint256 additionalRewardRate = (_currentSupply << 40) / _totalStaked;
    currentHistoricalRewardRate = _historicalRewardRate + additionalRewardRate;
  }

  function _updateTotalSupply() private returns (uint256 currentSupply) {
    (uint256 amount, uint128 epoch) = calcSupplyByBlock(_blockNumber(), totalSupply);

    currentSupply = amount;
    lastScheduleEpoch = epoch;
    totalSupply += amount;
  }

  /**
   * @dev Calculate additional supply by block number and total supply.
   * 
   * @param _block Number of the block for which you want to calculate the additional supply.
   * @param _totalSupply Current total supply.
   *
   * @return amount Additional supply by block number.
   * @return epochIndex The number of distribution schedule epoch.
   */
  function calcSupplyByBlock(uint128 _block, uint256 _totalSupply) public view returns (uint256 amount, uint128 epochIndex) {
    require(startedStaking > 0 && _block >= startedStaking, "[calcSupplyByBlock]: The staking is not launched");
    
    uint128 remainder;
    uint128 duration = _block - startedStaking;
    epochIndex = duration / scheduleEpochDuration;

    if (epochIndex >= maxEpochIndex) {
      epochIndex = maxEpochIndex;
    } else {
      remainder = duration % scheduleEpochDuration; 
    }
  
    // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
    // TODO: ВОЗМОЖНО ВСЁ ЕБНИТСЯ, Т.К МОЖЕТ БЫТЬ НЕСКОЛЬКО ТРАНЗАКЦИЙ ЗА БЛОК
    // ВООБЩЕ ДОЛЖНО БЫТЬ ВСЕ НОРМ, НО ЛУЧШЕ ПРОВЕРИТЬ
    // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
    require(
      epochIndex >= lastScheduleEpoch && epochIndex <= maxEpochIndex,
      "[calcSupplyByBlock]: Tokens for the block are already supplied"
    );

    amount = rewardSchedule[epochIndex];

    if (remainder > 0 && rewardSchedule[epochIndex + 1] > 0) {
      amount += remainder * (rewardSchedule[epochIndex + 1] - amount) / scheduleEpochDuration;
    }

    amount -= _totalSupply;
  }

  /**
   * @dev for ui
   */
  function getHolderBonusDuration() public view returns (uint128 holderBonusDuration) {
    address owner = _msgSender();

    holderBonusDuration = getHolderBonusDurationByAccount(owner);
  }

  /**
   * @dev for ui
   */
  function getHolderBonusDurationByAccount(address _owner) public view returns (uint128 holderBonusDuration) {
    StakerState storage state = stakerState[_owner];

    holderBonusDuration = getHolderBonusDurationByState(state);
  }

  /**
   */
  function getHolderBonusDurationByState(StakerState memory _state) public view returns (uint128 holderBonusDuration) {
    if (_state.amount > 0) {
      holderBonusDuration = calcHolderBonusDuration(_state.holderBonusStart);
    }
  }

  /**
   * @dev for ui
   */
  // function getHolderBonusRate() public view returns (uint128 rate, uint128 epochIndex) {
  //   address owner = _msgSender();
  //   StakerState storage state = stakerState[owner];

  //   uint128 holderBonusDuration = calcHolderBonusDuration(state.holderBonusStart);

  //   (rate, epochIndex) = calcCurrentHolderBonusRate(holderBonusDuration);
  // }

  /**
   * @dev
   */
  function calcHolderBonusDuration(uint128 _holderBonusStart) public view returns (uint128 holderBonusDuration) {
    uint128 blockNumber = _blockNumber();

    if (blockNumber > _holderBonusStart) {
      holderBonusDuration = blockNumber - _holderBonusStart;
    }
  }

  /**
   * @dev Calc current holder bonus rate.
   *
   * @param _duration Hold duration (number of blocks).
   *
   * @return rate Current holder bonus rate.
   * @return epochIndex Current holder bonus epoch.
   */
  function calcCurrentHolderBonusRate(uint128 _duration) public view returns (uint128 rate, uint128 epochIndex) {
    epochIndex = _duration / holderBonusEpochDuration;
    uint128 remainder;

    if (epochIndex > maxEpochIndex) {
      epochIndex = maxEpochIndex;
    } else {
      remainder = _duration % holderBonusEpochDuration;
    }

    rate = holderBonusAverageRate[epochIndex];

    if (remainder > 0 && holderBonusAverageRate[epochIndex + 1] > 0) {
      rate += (remainder * (holderBonusAverageRate[epochIndex + 1] - rate)) / holderBonusEpochDuration;
    }
  }

  /**
   * @dev
   *
   * @param _duration Duration of staking.
   * @param _reward Staking reward.
   *
   * @return amount The amount of holder bonus reward by hold duration, initial holder bonus rate and staking reward.
   * @return currentHolderBonusRate Current holder bonus rate multiplied by `denominator`.
   */
  function calcHolderBonus(uint128 _duration, uint128 _reward) public view returns (uint128 amount, uint128 currentHolderBonusRate, uint128 epochIndex) {
    (currentHolderBonusRate, epochIndex) = calcCurrentHolderBonusRate(_duration);
    amount = _reward * currentHolderBonusRate / denominator;
  }

  /**
   * @dev
   * @see calcHolderBonus
   *
   * @param _state Staker state
   *
   * @return holderBonusAmount 
   * @return currentHolderBonusRate 
   * @return epochIndex 
   */
  function _calcHolderBonusByState(StakerState storage _state) private view returns (uint128 holderBonusAmount, uint128 currentHolderBonusRate, uint128 epochIndex) {
    (holderBonusAmount, currentHolderBonusRate, epochIndex) = calcHolderBonus(
      getHolderBonusDurationByState(_state),
      calcUnrewarded(historicalRewardRate, _state.initialRewardRate, _state.amount) + _state.reward - _state.claimedReward
    );

    holderBonusAmount = holderBonusAmount + _state.holderBonusReward - _state.holderBonusClaimedReward;
  }

  /**
   * @dev for ui
   */
  function getHolderBonus() public view returns (uint128 holderBonusAmount) {
    address owner = _msgSender();

    holderBonusAmount = getHolderBonusByAccount(owner);
  }

  function getHolderBonusByAccount(address _owner) public view returns (uint128 holderBonusAmount) {
    StakerState storage state = stakerState[_owner];

    (holderBonusAmount,,) = _calcHolderBonusByState(state);
  }

  function claimHolderBonus() public {
    address owner = _msgSender();

    _claimHolderBonus(owner, owner);
  }

  function _claimHolderBonus(address owner, address to) private {
    StakerState storage state = _updateHolderBonusState(owner, 0);

    assert(state.holderBonusReward >= state.holderBonusClaimedReward);
    uint128 holderBonusUnclaimedReward = state.holderBonusReward - state.holderBonusClaimedReward;

    emit HolderBonusRewarded(owner, to, holderBonusUnclaimedReward);
    state.holderBonusClaimedReward += holderBonusUnclaimedReward;

    IERC20(earningToken).safeTransfer(to, holderBonusUnclaimedReward);
  }

  function _resetHolderBonus(address _owner) private {
    stakerState[_owner].holderBonusStart = 0;

    emit ResetHolderBonusDuration(_owner);
  }

  //!!!!!!!!!!!!!!!!!!!!!!!!
  // !!! Проверить, скорее всего не правильно работает
  // Обновляется holderBonusReward, но не учитывается при след обновление
  //!!!!!!!!!!!!!!!!!!!!!!!!
  function _updateHolderBonusState(address _owner, uint128 _addedAmount) private returns (StakerState storage state) {
    state = stakerState[_owner];
    uint128 holderBonusDuration = getHolderBonusDurationByState(state);

    state.holderBonusStart = recalcStartHolderBonus(state.amount, _addedAmount, holderBonusDuration);
    emit UpdateHolderBonusDuration(_owner, _addedAmount, state.holderBonusStart);

    (uint128 holderBonusReward,,) = _calcHolderBonusByState(state);
    
    state.holderBonusReward = holderBonusReward;
  }

  /**
   * @dev Recalculate block number from which the start of the bonus holder is considered.
   * 
   * @param _stakedAmount Staked amount.
   * @param _addedAmount Added amount.
   * @param _holderBonusDuration Current holder bonus duration.
   *
   * @return holderBonusStart The new block number from which the start of the bonus holder is considered.
   */
  function recalcStartHolderBonus(uint256 _stakedAmount, uint256 _addedAmount, uint256 _holderBonusDuration) public view returns (uint128 holderBonusStart) {
    holderBonusStart = _blockNumber();

    if (_holderBonusDuration > 0 && _stakedAmount > 0) {
      holderBonusStart -= ((_stakedAmount * _holderBonusDuration + _addedAmount) / (_stakedAmount + _addedAmount)).toUint128();
    }
  }
}
