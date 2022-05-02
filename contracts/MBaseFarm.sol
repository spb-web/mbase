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

  /**
   * @dev The block number from which farming is started.
   */
  uint256 public startedStaking;

  /**
   * @dev Items in `holderBonusAverageRate` and `rewardSchedule` are multiplied by 10^6 to get more accuracy.
   * @notice Divide the item of `holderBonusAverageRate` or `rewardSchedule` by this variable to get the actual value of the item.
   */
  uint256 public constant denominator = 10**6;
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
  uint256 public constant holderBonusEpochDuration = 201600;

  /**
   * @dev Every 201600 blocks the distribution changes.
   * @notice 201600 blocks per a week.
   */
  uint256 public constant scheduleEpochDuration = 201600;
  /**
   * @dev The total amount for staking rewards.
   */
  uint128 public totalDistribution;
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
  uint256 public maxEpochIndex;
  /**
   * @dev The schedule of distribution.
   * @notice Divide the item of `rewardSchedule` by `denominator` variable to get the actual value of the item.
   *
   * key - epoch number;
   * value - cumulative total supply;
   */
  uint128[] public rewardSchedule;
  /**
   * @dev How many MBase minted per one LP.
   * @notice Never decreases.
   */
  uint256 public historicalRewardRate;
  /**
   * @dev Amount of LP currently staked in the service.
   */
  uint256 public totalStaked;

  /**
   * MBaseFarm.FarmerState
   */
  mapping (address => FarmerState) public farmerState;

  address public immutable stakingToken;
  address public immutable earningToken;
  uint256 public immutable stakingTokenDecimalsDenominator;

  constructor(
    address _stakingToken,
    address _earningToken,
    uint128[] memory _holderBonusAverageRate,
    uint128[] memory _rewardSchedule
  ) {
    require(_holderBonusAverageRate.length == _rewardSchedule.length && _rewardSchedule.length > 0, "Invalid length");
    require(_holderBonusAverageRate[0] == 0, "The first item of `holderBonusAverageRate` should be equal zero");
    require(_rewardSchedule[0] == 0, "The first item of `rewardSchedule` should be equal zero");
    require(_stakingToken != address(0), "Invalid staking token address");
    require(_earningToken != address(0), "Invalid earning token address");

    // Хуй знает почему, но не работает в ganache, при этом все норм в тестнете
    //
    // for (uint256 index = 0; index < _rewardSchedule.length; index++) {
    //   require(_holderBonusAverageRate[index] < denominator, "Items of `holderBonusAverageRate` should be less then `denominator`");
    //   require(_rewardSchedule[index] > 0, "Items of `rewardSchedule` should be greater than 0");
    // }

    rewardSchedule = _rewardSchedule;
    holderBonusAverageRate = _holderBonusAverageRate;

    stakingToken = _stakingToken;
    earningToken = _earningToken;
    maxEpochIndex = _rewardSchedule.length - 1;

    totalDistribution = _rewardSchedule[_rewardSchedule.length - 1];
    stakingTokenDecimalsDenominator = 10 ** ERC20(_stakingToken).decimals();
  }

  function blockNumber() public view returns (uint256) {
    return block.number;
  }

  function launchStaking() public {
    require(startedStaking == 0, "[launchStaking]: Staking is already launched");

    IERC20(earningToken).safeTransferFrom(_msgSender(), address(this), totalDistribution);

    startedStaking = blockNumber();
  }

  function stake(uint128 amount) public {
    require(startedStaking > 0, "[stake]: The staking is not launched");

    address owner = _msgSender();

    _stake(owner, amount);
    _updateHolderBonusDays(owner, amount);
  }

  function _stake(address owner, uint128 amount) private {
    IERC20(stakingToken).safeTransferFrom(owner, address(this), amount);

    FarmerState storage state = _updateStateAndStaker(owner);

    state.amount += amount;
    totalStaked += amount;
  }

  function unstake(uint128 amount) public {
    address owner = _msgSender();
    

    _unstake(owner, owner, amount);
    _resetHolderBonus(owner);
  }

  function _unstake(address owner, address to, uint128 amount) private {
    FarmerState storage state = _updateStateAndStaker(owner);
  
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

  function _claim(address owner, address to) private {
    FarmerState storage state = _updateStateAndStaker(owner);
    assert(state.reward >= state.claimedReward);
    uint256 unclaimedReward = state.reward - state.claimedReward;

    // emit Rewarded(owner, to, unclaimedReward);
    state.claimedReward += unclaimedReward;

    IERC20(earningToken).safeTransfer(to, unclaimedReward);
  }

  function _updateStateAndStaker(address owner) private returns (FarmerState storage state) {
    updateHistoricalRewardRate();
    state = farmerState[owner];

    uint128 reward = calcReward(historicalRewardRate, state.initialRewardRate, state.amount, state.reward);
    state.initialRewardRate = historicalRewardRate.toUint128();
    state.reward = reward;

    (uint256 holderBonusReward, uint256 holderBonusRate) = calcHolderBonusByState(state);
    state.holderBonusReward = holderBonusReward;
    state.holderBonusInitalRate = holderBonusRate;
  }

  /**
   * for ui
   */
  function getRewards(address owner) public view returns (uint256 amount) {
    FarmerState storage state = farmerState[owner];
    (uint256 currentSupply,) = calcSupplyByBlock(blockNumber(), totalSupply);
    uint256 currentHistoricalRewardRate = calcHistoricalRewardRate(currentSupply, totalStaked, historicalRewardRate);

    amount = calcReward(currentHistoricalRewardRate, state.initialRewardRate, state.amount, state.reward);
  }

  /**
   * @dev Calculates the reward based on the historical reward rate and the state of the farmer.
   */
  function calcReward(uint256 _historicalRewardRate, uint256 _initialRewardRate, uint256 _amount, uint128 _reward) public view returns (uint128 currentReward) {
    uint128 unrewarded = uint128(((_historicalRewardRate - _initialRewardRate) * _amount) / denominator / stakingTokenDecimalsDenominator);
    currentReward = _reward + unrewarded;
  }

  function updateHistoricalRewardRate() public {
    uint256 currentSupply = _updateTotalSupply();
    historicalRewardRate = calcHistoricalRewardRate(currentSupply, totalStaked, historicalRewardRate);
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
  function calcHistoricalRewardRate(uint256 _currentSupply, uint256 _totalStaked, uint256 _historicalRewardRate) public pure returns (uint256 currentHistoricalRewardRate) {
    if (_currentSupply == 0 || _totalStaked == 0) {
      return _historicalRewardRate;
    }

    uint256 additionalRewardRate = _currentSupply / _totalStaked;
    currentHistoricalRewardRate = _historicalRewardRate + additionalRewardRate;
  }

  function _updateTotalSupply() private returns (uint256 currentSupply) {
    (uint256 amount, uint256 epoch) = calcSupplyByBlock(blockNumber(), totalSupply);

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
  function calcSupplyByBlock(uint256 _block, uint256 _totalSupply) public view returns (uint256 amount, uint256 epochIndex) {
    require(startedStaking > 0 && _block >= startedStaking, "[calcSupplyByBlock]: The staking is not launched");
    
    uint256 remainder;
    uint256 duration = _block - startedStaking;
    epochIndex = duration / scheduleEpochDuration;

    if (epochIndex >= maxEpochIndex) {
      epochIndex = maxEpochIndex;
    } else {
      remainder = duration % scheduleEpochDuration;
    }
  
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




  function getHolderBonusDuration() public view returns (uint256 holderBonusDuration) {
    address owner = _msgSender();
    FarmerState storage state = farmerState[owner];

    holderBonusDuration = calcHolderBonusDuration(state.holderBonusStart);
  }

  function calcHolderBonusDuration(uint256 _holderBonusStart) public view returns (uint256 holderBonusDuration) {
    holderBonusDuration = blockNumber() - _holderBonusStart;
  }

  /**
   * @dev
   */
  function calcCurrentHolderBonusRate(uint256 _duration) public view returns (uint256 rate, uint256 epochIndex) {
    epochIndex = _duration / holderBonusEpochDuration;
    uint256 remainder;

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
   * @param _duration Duration of staking.
   * @param _holderBonusInitalRate Initial holder bonus rate.
   * @param _reward Staking reward.
   * @notice _holderBonusInitalRate should be multiplied by `denominator`.
   *
   * @return amount The amount of holder bonus reward by hold duration, initial holder bonus rate and staking reward.
   * @return currentHolderBonusRate Current holder bonus rate multiplied by `denominator`.
   */
  function calcHolderBonus(uint256 _duration, uint256 _holderBonusInitalRate, uint256 _reward) public view returns (uint256 amount, uint256 currentHolderBonusRate) {
    (currentHolderBonusRate,) = calcCurrentHolderBonusRate(_duration);
    amount = _reward * (currentHolderBonusRate - _holderBonusInitalRate) / denominator;
  }

  function calcHolderBonusByState(FarmerState storage state) private view returns (uint256 holderBonusAmount, uint256 currentHolderBonusRate) {
    (holderBonusAmount, currentHolderBonusRate) = calcHolderBonus(
      calcHolderBonusDuration(state.holderBonusStart),
      state.holderBonusInitalRate,
      calcReward(historicalRewardRate, state.initialRewardRate, state.amount, state.reward)
    );
  }

  function getHolderBonus() public view returns (uint256 holderBonusAmount) {
    address owner = _msgSender();
    FarmerState storage state = farmerState[owner];

    (holderBonusAmount,) = calcHolderBonusByState(state);
  }

  function claimHolderBonus() public {
    address owner = _msgSender();

    _claimHolderBonus(owner, owner);
  }

  function _claimHolderBonus(address owner, address to) private {
    FarmerState storage state = _updateStateAndStaker(owner);

    assert(state.holderBonusReward >= state.holderBonusClaimedReward);
    uint256 holderBonusUnclaimedReward = state.reward - state.claimedReward;

    // emit Rewarded(owner, to, unclaimedReward);
    state.holderBonusClaimedReward += holderBonusUnclaimedReward;

    IERC20(earningToken).safeTransfer(to, holderBonusUnclaimedReward);
  }



















  function _resetHolderBonus(address owner) private {
    delete farmerState[owner].holderBonusStart;
  }

  function _updateHolderBonusDays(address owner, uint256 addedAmount) private returns (uint256 duration) {
    FarmerState storage state = farmerState[owner];
    uint256 totalAmount = state.amount + addedAmount;
    uint256 holderBonusDuration = calcHolderBonusDuration(state.holderBonusStart);

    if (totalAmount == 0) {
      duration = 0;
    } else {
      duration = (state.amount * holderBonusDuration + addedAmount) / totalAmount;
    }

    state.holderBonusStart = blockNumber() - duration;
  }
}
