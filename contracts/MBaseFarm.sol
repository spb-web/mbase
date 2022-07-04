// SPDX-License-Identifier: MIT

pragma solidity 0.8.12;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/utils/math/SafeCast.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MBaseFarm is Context, Ownable {
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
    uint256 holderBonusStart;
    uint256 amount;
    uint256 initialRewardRate;
    uint256 reward;
    uint256 claimedReward;
  }

  /**
   * @dev The block number from which farming is started.
   */
  uint256 public startedStaking;

  /**
   * @dev Items in `hbRate` is multiplied by 10^6 to get more accuracy.
   * @notice Divide the item of `hbRate` or `rewardSchedule` by this variable to get the actual value of the item.
   */
  uint256 public constant denominator = 10**6;
  /**
   * @dev The schedule of distribution.
   * @notice Divide the item of `hbRate` by `denominator` variable to get the actual value of the item.
   *
   * key - epoch number;
   * value - Average value of items between 0 and the index of item;
   */
  uint256[] public hbRate = [
    0,
    5000,
    5466,
    6065,
    6728,
    7462,
    8272,
    9167,
    10154,
    11242,
    12441,
    13759,
    15207,
    16796,
    18538,
    20446,
    22532,
    24811,
    27296,
    30002,
    32945,
    36142,
    39608,
    43362,
    47419,
    51799,
    56518,
    61595,
    67049,
    72896,
    79155,
    85843,
    92976,
    100572,
    108644,
    117209,
    126278,
    135865,
    145980,
    156632,
    167829,
    179576,
    191878,
    204736,
    218150,
    232118,
    246636,
    261696,
    277289,
    293403,
    310026,
    327141,
    344730,
    362773,
    381247,
    400128,
    419390,
    439005,
    458944,
    479177,
    499671,
    520394,
    541312,
    562391,
    583597,
    604894,
    626248,
    647624,
    668988,
    699418,
    711542,
    732668,
    753650,
    774458,
    795064,
    815439,
    835557,
    855393,
    874925,
    894130,
    912989,
    931484,
    949597,
    967315,
    984623,
    1001512,
    1017971,
    1033991,
    1049567,
    1064694,
    1079368,
    1093586,
    1107349,
    1120656,
    1133509,
    1145912,
    1157867,
    1169379,
    1180455,
    1191101,
    1201324,
    1211131,
    1220531,
    1229534,
    1238148,
    1246383,
    1248668
  ];
  /**
   * @dev Every 201600 blocks the holder bonus changes.
   * @notice 201600 blocks per a week.
   */
  uint256 public immutable holderBonusEpochDuration;

  /**
   * @dev Every 201600 blocks the distribution changes.
   * @notice 201600 blocks per a week.
   */
  uint256 public immutable scheduleEpochDuration;
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
  uint256 public maxEpochIndex;
  /**
   * @dev The schedule of distribution.
   *
   * key - epoch number;
   * value - cumulative total supply;
   */
  uint256[] public rewardSchedule = [
    0,
    1068824616071430000000000,
    2148337478303570000000000,
    3238645469158040000000000,
    4339856539921040000000000,
    5452079721391680000000000,
    6575425134677030000000000,
    7710004002095230000000000,
    8855928658187610000000000,
    10013312560840900000000000,
    11182270302520800000000000,
    12362917621617400000000000,
    13555371413905000000000000,
    14759749744115500000000000,
    15976171857628100000000000,
    17204758192275800000000000,
    18445630390269900000000000,
    19698911310244100000000000,
    20964725039417900000000000,
    22243196905883600000000000,
    23534453491013800000000000,
    24838622641995400000000000,
    26155833484486800000000000,
    27486216435403100000000000,
    28829903215828500000000000,
    30187026864058200000000000,
    31557721748770300000000000,
    32942123582329400000000000,
    34340369434224100000000000,
    35752597744637800000000000,
    37178948338155600000000000,
    38619562437608600000000000,
    40074582678056100000000000,
    41544153120908100000000000,
    43028419268188600000000000,
    44527528076941900000000000,
    46041627973782700000000000,
    47570868869592000000000000,
    49115402174359300000000000,
    50675380812174400000000000,
    52250959236367500000000000,
    53842293444802600000000000,
    55449540995322100000000000,
    57072861021346800000000000,
    58712414247631700000000000,
    60368363006179400000000000,
    62040871252312600000000000,
    63730104580907200000000000,
    65436230242787700000000000,
    67159417161287000000000000,
    68899835948971300000000000,
    70657658924532400000000000,
    72433060129849200000000000,
    74226215347219100000000000,
    76037302116762700000000000,
    77866499754001800000000000,
    79713989367613200000000000,
    81579953877360800000000000,
    83464578032205800000000000,
    85368048428599300000000000,
    87290553528956800000000000,
    89232283680317800000000000,
    91193431133192400000000000,
    93174190060595700000000000,
    95174756577273100000000000,
    97195328759117200000000000,
    99236106662779900000000000,
    101297292345479000000000000,
    103379089885005000000000000,
    105481705399927000000000000,
    107605347069997000000000000,
    109750225156769000000000000,
    111916552024408000000000000,
    114104542160724000000000000,
    116314412198402000000000000,
    118546380936458000000000000,
    120800669361894000000000000,
    123077500671584000000000000,
    125377100294371000000000000,
    127699695913386000000000000,
    130045517488592000000000000,
    132414797279549000000000000,
    134807769868416000000000000,
    137224672183172000000000000,
    139665743521075000000000000,
    142131225572357000000000000,
    144621362444152000000000000,
    147136400684665000000000000,
    149676589307583000000000000,
    152242179816730000000000000,
    154833426230969000000000000,
    157450585109350000000000000,
    160093915576515000000000000,
    162763679348352000000000000,
    165460140757906000000000000,
    168183566781557000000000000,
    170934227065444000000000000,
    173712393952170000000000000,
    176518342507763000000000000,
    179352350548912000000000000,
    182214698670473000000000000,
    185105670273249000000000000,
    188025551592053000000000000,
    190974631724045000000000000,
    193953202657357000000000000,
    196961559300001000000000000,
    199999999509073000000000000
  ];
  /**
   * @dev How many MBase minted per one LP.
   * @notice Never decreases.
   */
  uint256 public historicalRewardRate;
  /**
   * @dev Amount of LP currently staked in the service.
   */
  uint256 public totalStaked;

  uint256 public maxHbDuration;

  /**
   * MBaseFarm.StakerState
   */
  mapping (address => StakerState) public stakerState;

  address public immutable stakingToken;
  address public immutable earningToken;

  event StakingLaunched(uint256 block, uint256 totalDistribution);
  event Staked(address indexed owner, address indexed from, uint256 amount, uint256 hbFromBlock);
  event UpdateHistoricalRewardRate(uint256 rate);
  event Unstaked(address indexed owner, address indexed to, uint256 amount);
  event Rewarded(address indexed owner, address indexed to, uint256 amount, uint256 hbReward);

  constructor(address _stakingToken, address _earningToken, uint256 _holderBonusEpochDuration, uint256 _scheduleEpochDuration) {
    require(_stakingToken != address(0), "Invalid staking token address");
    require(_earningToken != address(0), "Invalid earning token address");

    holderBonusEpochDuration = _holderBonusEpochDuration;
    scheduleEpochDuration = _scheduleEpochDuration;

    stakingToken = _stakingToken;
    earningToken = _earningToken;
    maxEpochIndex = rewardSchedule.length - 1;
    maxHbDuration = maxEpochIndex * holderBonusEpochDuration;
    totalDistribution = rewardSchedule[rewardSchedule.length - 1];
    totalDistribution += totalDistribution * hbRate[hbRate.length - 1] / denominator + 1;
  }

  function launchStaking() public onlyOwner {
    require(startedStaking == 0, "[launchStaking]: Staking is already launched");
    require(hbRate.length > 0 && rewardSchedule.length > 0, "[launchStaking]: Schedule is not setted");
    require(totalDistribution > 0, "[launchStaking]: The total distribution is too low");

    IERC20(earningToken).safeTransferFrom(_msgSender(), address(this), totalDistribution);

    startedStaking = _blockNumber();

    emit StakingLaunched(startedStaking, totalDistribution);
  }

  function _blockNumber() private view returns (uint256) {
    return block.number;
  }

  function getState() public view returns (uint256 amount, uint256 reward, uint256 claimedReward, uint256 holderBonusStart, uint256 holderBonusDuration, uint256 holderBonus) {
    address owner = _msgSender();

    StakerState storage state = stakerState[owner];
    holderBonusStart = state.holderBonusStart;
    holderBonusDuration = getHolderBonusDurationByState(state);
    holderBonus = getHolderBonusByAccount(owner);
    amount = state.amount;
    reward = getRewards(owner);
    claimedReward = state.claimedReward;
  }

  function stake(uint256 amount) public {
    require(startedStaking > 0, "[stake]: The staking is not launched");
    require(amount > 0, "[stake]: No zero deposit allowed");

    address owner = _msgSender();

    _stake(owner, owner, amount);
  }

  function _stake(address _owner, address _from, uint256 _amount) private {
    IERC20(stakingToken).safeTransferFrom(_from, address(this), _amount);

    StakerState storage state = _updateStateAndStaker(_owner);
    _claimWithoutUpdate(_owner, _owner);
    _updateStartHolderBonus(state, _amount);

    state.amount += _amount;
    totalStaked += _amount;

    emit Staked(_owner, _from, _amount, state.holderBonusStart);
  }

  function unstake(uint256 amount) public {
    address owner = _msgSender();
    
    _unstake(owner, owner, amount);
  }

  function _unstake(address _owner, address _to, uint256 _amount) private {
    StakerState storage state = _updateStateAndStaker(_owner);
    _claimWithoutUpdate(_owner, _to);
    _resetHolderBonus(_owner);
  
    require(state.amount >= _amount, "NmxStakingService: NOT_ENOUGH_STAKED");

    state.amount -= _amount;
    totalStaked -= _amount;

    IERC20(stakingToken).safeTransfer(_to, _amount);
    emit Unstaked(_owner, _to, _amount);
  }

  function claim() public {
    address owner = _msgSender();

    _claim(owner, owner);
  }

  function _claim(address _owner, address _to) private {
    _updateStateAndStaker(_owner);
    _claimWithoutUpdate(_owner, _to);
  }

  function _claimWithoutUpdate(address _owner, address _to) private {
    StakerState storage state = stakerState[_owner];

    assert(state.reward >= state.claimedReward);
    // farming rewards
    uint256 unclaimedReward = state.reward - state.claimedReward;

    state.claimedReward += unclaimedReward;

    // hb rewards
    uint256 hbReward = calcHolderBonus(
      getHolderBonusDurationByState(state),
      unclaimedReward
    );

    IERC20(earningToken).safeTransfer(_to, unclaimedReward + hbReward);
    emit Rewarded(_owner, _to, unclaimedReward, hbReward);
  }

  function _updateStateAndStaker(address _owner) private returns (StakerState storage state) {
    updateHistoricalRewardRate();
    state = stakerState[_owner];

    uint256 unrewarded = calcUnrewarded(historicalRewardRate, state.initialRewardRate, state.amount);
    state.initialRewardRate = historicalRewardRate;
    state.reward = unrewarded + state.reward;
  }

  /**
   * @dev for ui
   * @dev 
   */
  function getRewards(address owner) public view returns (uint256 amount) {
    StakerState storage state = stakerState[owner];

    amount = _getRewardsByState(state);
  }

  function _getRewardsByState(StakerState memory state) private view returns (uint256 amount) {
    (uint256 currentSupply,) = calcSupplyByBlock(_blockNumber(), totalSupply);
    uint256 currentHistoricalRewardRate = calcHistoricalRewardRate(currentSupply, totalStaked, historicalRewardRate);
    uint256 unrewarded = calcUnrewarded(currentHistoricalRewardRate, state.initialRewardRate, state.amount);

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
  function calcUnrewarded(uint256 _historicalRewardRate, uint256 _initialRewardRate, uint256 _amount) public pure returns (uint256 unrewarded) {
    unrewarded = (((_historicalRewardRate - _initialRewardRate) * _amount) >> 40);
  }

  /**
   * 
   */
  function updateHistoricalRewardRate() public {
    uint256 currentSupply = _updateTotalSupply();
    historicalRewardRate = calcHistoricalRewardRate(currentSupply, totalStaked, historicalRewardRate);

    emit UpdateHistoricalRewardRate(historicalRewardRate);
  }

  function _updateTotalSupply() private returns (uint256 currentSupply) {
    (uint256 amount, uint256 epoch) = calcSupplyByBlock(_blockNumber(), totalSupply);

    currentSupply = amount;
    lastScheduleEpoch = epoch;
    totalSupply += amount;
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

    uint256 additionalRewardRate = (_currentSupply << 40) / _totalStaked;
    currentHistoricalRewardRate = _historicalRewardRate + additionalRewardRate;
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

    if (duration > maxHbDuration) {
      duration = maxHbDuration;
    }

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
  function getHolderBonusDuration() public view returns (uint256 holderBonusDuration) {
    address owner = _msgSender();

    holderBonusDuration = getHolderBonusDurationByAccount(owner);
  }

  /**
   * @dev for ui
   */
  function getHolderBonusDurationByAccount(address _owner) public view returns (uint256 holderBonusDuration) {
    StakerState storage state = stakerState[_owner];

    holderBonusDuration = getHolderBonusDurationByState(state);
  }

  /**
   */
  function getHolderBonusDurationByState(StakerState memory _state) public view returns (uint256 holderBonusDuration) {
    if (_state.amount > 0) {
      holderBonusDuration = calcHolderBonusDuration(_state.holderBonusStart);
    }
  }

  /**
   * @dev
   */
  function calcHolderBonusDuration(uint256 _holderBonusStart) public view returns (uint256 holderBonusDuration) {
    uint256 blockNumber = _blockNumber();

    if (blockNumber > _holderBonusStart && _holderBonusStart > 0) {
      holderBonusDuration = blockNumber - _holderBonusStart;

      if (holderBonusDuration > maxHbDuration) {
        holderBonusDuration = maxHbDuration;
      }
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
  function calcCurrentHolderBonusRate(uint256 _duration) public view returns (uint256 rate, uint256 epochIndex) {
    epochIndex = _duration / holderBonusEpochDuration;
    uint256 remainder;

    if (epochIndex > maxEpochIndex) {
      epochIndex = maxEpochIndex;
    } else {
      remainder = _duration % holderBonusEpochDuration;
    }

    rate = hbRate[epochIndex];

    if (remainder > 0 && hbRate[epochIndex + 1] > 0) {
      rate += (remainder * (hbRate[epochIndex + 1] - rate)) / holderBonusEpochDuration;
    }
  }

  /**
   * @dev
   *
   * @param _duration Duration of staking.
   * @param _reward Staking reward.
   *
   * @return hbRewards The amount of holder bonus reward by hold duration, initial holder bonus rate and staking reward.
   */
  function calcHolderBonus(uint256 _duration, uint256 _reward) public view returns (uint256 hbRewards) {
    (uint256 currentHolderBonusRate,) = calcCurrentHolderBonusRate(_duration);
    hbRewards = _reward * currentHolderBonusRate / denominator;
  }

  /**
   * @dev for ui
   */
  function getHolderBonus() public view returns (uint256 hbRewards) {
    address owner = _msgSender();

    hbRewards = getHolderBonusByAccount(owner);
  }

  function getHolderBonusByAccount(address _owner) public view returns (uint256 hbRewards) {
    StakerState storage state = stakerState[_owner];

    hbRewards = _calcHolderBonusByState(state);
  }

  /**
   * @dev
   * @see calcHolderBonus
   *
   * @param _state Staker state
   *
   * @return hbRewards 
   */
  function _calcHolderBonusByState(StakerState storage _state) private view returns (uint256 hbRewards) {
    hbRewards = calcHolderBonus(
      getHolderBonusDurationByState(_state),
      _getRewardsByState(_state)
    );
  }

  function _resetHolderBonus(address _owner) private {
    stakerState[_owner].holderBonusStart = 0;
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
  function recalcStartHolderBonus(uint256 _stakedAmount, uint256 _addedAmount, uint256 _holderBonusDuration) public view returns (uint256 holderBonusStart) {
    holderBonusStart = _blockNumber();

    if (_holderBonusDuration > 0 && _stakedAmount > 0) {
      holderBonusStart -= ((_stakedAmount * _holderBonusDuration + _addedAmount) / (_stakedAmount + _addedAmount));
    }
  }

  function _updateStartHolderBonus(StakerState storage _state, uint256 _addedAmount) private {
    uint256 holderBonusDuration = getHolderBonusDurationByState(_state);
    _state.holderBonusStart = recalcStartHolderBonus(_state.amount, _addedAmount, holderBonusDuration);
  }
}
