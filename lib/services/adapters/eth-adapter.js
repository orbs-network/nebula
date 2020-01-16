const Web3 = require('web3');

const validatorRegistryABI = require('./abi.json');

const web3 = new Web3('http://eth.orbs.com:8545');

var orbsValidatorRegistry = new web3.eth.Contract(JSON.parse(validatorRegistryABI.result), '0x804c8336846d8206c95CEe24752D514210B5a240', {
    gasPrice: '20000000000' // default gas price in wei, 20 gwei in this case
});

module.exports = {
    getWeb3Adapter() {
        return orbsValidatorRegistry.methods;
    }
};
