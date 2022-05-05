const BN_TEN = web3.utils.toBN('10')

const getVal = (val) => typeof val === 'function' ? val() : val

const variableShouldBeEqual = (contract, name, value, params = () => []) => (
  it(`The \`${name}\` should be equal ${value}`, async () => {
    const paramsVal = getVal(params)
    //console.log('Params:', ...paramsVal)
    const returns = await getVal(contract)[getVal(name)](...paramsVal)

    assert.equal(returns.valueOf(), getVal(value).toString())
  })
)

const toWei = (amount, decimals = 18) => {
  return web3.utils.toBN(amount).mul(BN_TEN.pow(web3.utils.toBN(decimals)))
}

const advanceBlock = () => {
  return new Promise((resolve, reject) => {
    web3.currentProvider.send({
      jsonrpc: '2.0',
      method: 'evm_mine',
      id: new Date().getTime()
    }, (err, result) => {
      if (err) { return reject(err) }
      const newBlockHash = web3.eth.getBlock('latest').hash

      return resolve(newBlockHash)
    })
  })
}


exports.advanceBlock = advanceBlock
exports.variableShouldBeEqual = variableShouldBeEqual
exports.toWei = toWei
exports.toBN = web3.utils.toBN