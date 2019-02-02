#!/usr/bin/env node

const chalk = require('chalk');
const path = require('path');
const fs = require('fs');

const types = require('./../constants/types');
const { CoreService } = require('./../lib/services/core/core');
const { TerraformService } = require('./../lib/services/terraform/terraform');
const terraformProdAdapter = require('./../lib/adapters/terraform/adapter');
const { coreAdapter } = require('../lib/adapters/core/adapter');
const boyarConfig = require('./../testnet/boyar');
const bucketPrefix = 'boyar-discovery';

const c = new CoreService(new TerraformService(terraformProdAdapter), coreAdapter);

function logGreen(text) {
  console.log(chalk.greenBright(text));
}

function logRed(text) {
  console.log(chalk.redBright(text));
}

function resolveHome(filepath) {
  if (filepath[0] === '~') {
    return path.join(process.env.HOME, filepath.slice(1));
  }
  return filepath;
}

function ValidateIPaddress(ipaddress) {
  if (/^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(ipaddress)) {
    return true;
  }
  return false;
}

require('yargs') // eslint-disable-line
  .command('create', 'Create an Orbs constellation in the cloud', (yargs) => {
    return yargs
      .option('file', {
        describe: 'a JSON file representing all flags here for the terminal sake!',
        alias: 'f',
        default: false
      })
      .option('name', {
        describe: 'name your constellation! in case non supplied defaults to a random name',
        default: ''
      })
      .option('cloud', {
        describe: 'dictates which cloud provider to use (at the moment only AWS is available)',
        default: 'aws'
      })
      .option('aws-profile', {
        describe: 'which aws profile name to use when provisioning. Strongly recommended instead of AWS keys for better security',
        default: 'default'
      })
      .boolean('testnet')
      .boolean('no-ethereum')
      .option('manager-public-ip', {
        describe: 'attach the provided (pre-existing AWS Elastic IP) to the provisioned manager node',
        default: false
      })
      .option('orbs-address', {
        describe: 'Orbs node address',
        default: ''
      })
      .option('orbs-private-key', {
        describe: 'Orbs node private key',
        default: ''
      })
      // .option('master-count', { -- We should support this ASAP.
      //   describe: 'The amount of master nodes within your constellation',
      //   choices: [1, 3, 5, 7],
      //   default: 1
      // })
      .option('node-count', {
        describe: 'The amount of worker nodes within your constellation (this nodes carry the load of operating virtual chains)',
        default: 2
      })
      .option('node-size', {
        describe: 'The worker node instance size to use',
        default: 't3.medium'
      })
      .option('manager-size', {
        describe: 'The master node instance size to use',
        default: 't3.medium'
      })
      .option('region', {
        describe: 'The region to setup the constellation in',
        default: 'us-east-1'
      })
      .option('ssh-public-key', {
        describe: 'The path to the public key used to provision the constellation machines',
        default: '~/.ssh/id_rsa.pub'
      })
      .option('master-zones', {
        describe: 'zones in which to setup the master instance',
        default: 'us-east-1a'
      })
      .help('help');
  }, async (argv) => {
    let _argv = {};

    if (argv.file !== '') {
      try {
        let pathToRequire = resolveHome(argv.file);
        if (pathToRequire.substr(0, 1) !== '/') {
          pathToRequire = path.join(process.cwd(), pathToRequire);
        }
        argsAsFile = require(pathToRequire);
      } catch (err) {
        logRed('Problem opening your arguments file!');
        logRed(err);
        process.exit(1);
      }

      _argv = argsAsFile;
    } else {
      _argv = argv;
    }

    const { awsProfile, sshPublicKey, orbsAddress, orbsPrivateKey, region,
      nodeSize, managerPublicIp, noEthereum = false, nodeCount, name } = _argv;

    if (orbsAddress.length !== 40) {
      logRed('Invalid Orbs node address, required hex of 40 characters');
      logRed(`Got: ${orbsAddress} (Length: ${orbsAddress.length})`);
      process.exit(1);
    }

    if (orbsPrivateKey.length !== 64) {
      logRed('Invalid Orbs private key, required hex of 64 characters');
      logRed(`Got: ${orbsPrivateKey} (Length: ${orbsPrivateKey.length})`);
      process.exit(1);
    }

    const keys = {
      aws: {
        profile: awsProfile,
      },
      ssh: {
        path: sshPublicKey,
      },
      orbs: {
        nodeKeys: {
          address: orbsAddress,
          privateKey: orbsPrivateKey,
          leader: "a328846cd5b4979d68a8c58a9bdfeee657b34de7",
        },
        boyarConfig,
        ethereum: !noEthereum,
      }
    };

    const cloud = {
      type: types.clouds.aws,
      region,
      instanceType: nodeSize,
      nodeCount: nodeCount,
      bucketPrefix,
    };

    if (name !== '' && name.length > 0) {
      cloud.spinContext = name;
    }

    if (managerPublicIp !== false && managerPublicIp !== '') {
      if (ValidateIPaddress(managerPublicIp)) {
        cloud.ip = managerPublicIp;
      } else {
        logRed(`The supplied IP address ${managerPublicIp}`);
        logRed('is not a valid IPv4 address!');
        process.exit(1);
      }
    }

    const result = await c.createConstellation({ cloud, keys });

    //const result = { ok: true, manager: { ip: '1.2.3.4' }, spinContext: 'itamar' };
    if (result.ok === true) {
      const managerIP = ('ip' in cloud) ? cloud.ip : result.manager.ip;

      logGreen('Your constellation was created successfully!');
      logGreen("Provided below is the address of your manager node public IP");
      logGreen(`The manager IPv4 is: ${managerIP}`);
      console.log('');
      logGreen('Your constellation name should be used when wanting to destroy/upgrade');
      logGreen('Constellation name:');
      logGreen(result.spinContext);
      console.log('');
      console.log('Example usage:');
      console.log(`nebula destroy --name ${result.spinContext}`);
      console.log('');
      logGreen('Please allow time now for your constellation to finish syncing with the Orbs network');
      logGreen('No further actions required at this point');

      process.exit(0);
    } else {
      logRed('Your constelation was not created successfully!');
      logRed(`with error message as follows: ${result.message}`);
      logRed('Please follow the inline messages from Terraform to find out why');
      logRed('More information on debugging errors can be found by running the same commands');
      logRed('that Nebula runs within your compiled Terraform infrastructure folder located at:');
      logRed(result.tfPath);
      console.log('');
      logRed('If you are clueless as to why this error happened or think it\'s a bug with Nebula');
      logRed('please kindly open a GitHub issue here: ');
      logRed('https://github.com/orbs-network/nebula');
    }
  })

  .command('destroy', 'Destroys an Orbs constellation', (yargs) => {
    return yargs
      .option('name', {
        describe: 'the name you used or were provided with when you created your constellation',
        default: '',
      })
      .usage('nebula destroy --name [your-constellation-name]')
      .demandOption('name')
      .help('help');
  }, async (argv) => {
    const { name } = argv;

    const destroyResult = await c.destroyConstellation({ spinContext: name });

    if (destroyResult.ok === true) {
      logGreen('Your constellation has been successfully destroyed!');
      process.exit(0);
    } else {
      logRed('Could not destroy constellation!');
      logRed(destroyResult.error);
      console.log('');
      logRed('If you are clueless as to why this error happened or think it\'s a bug with Nebula');
      logRed('please kindly open a GitHub issue here: ');
      logRed('https://github.com/orbs-network/nebula');
      process.exit(1);
    }
  })
  .option('verbose', {
    alias: 'v',
    default: false
  })
  .demandCommand()
  .help()
  .argv
