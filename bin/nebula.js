#!/usr/bin/env node

const { CoreService } = require('./../lib/services/core/core');
const { TerraformService } = require('./../lib/services/terraform/terraform');
const terraformProdAdapter = require('./../lib/adapters/terraform/adapter');
const { coreAdapter } = require('../lib/adapters/core/adapter');
const boyarConfig = require('./../testnet/boyar');
const bucketPrefix = 'boyar-discovery';

const c = new CoreService(new TerraformService(terraformProdAdapter), coreAdapter);

function ValidateIPaddress(ipaddress) {
  if (/^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(ipaddress)) {
    return true;
  }
  return false;
}

require('yargs') // eslint-disable-line
  .command('create', 'creates an Orbs constellation in the cloud', (yargs) => {
    return yargs
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
        default: 't3.large'
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
    const { awsProfile, sshPublicKey, orbsAddress, orbsPrivateKey, region,
      nodeSize, managerPublicIp } = argv;

    if (orbsAddress.length !== 40) {
      console.error(
        'Invalid Orbs node address, required hex of 40 characters',
        `Got: ${orbsAddress} (Length: ${orbsAddress.length})`
      );
      process.exit(1);
    }

    if (orbsPrivateKey.length !== 64) {
      console.error(
        'Invalid Orbs private key, required hex of 64 characters',
        `Got: ${orbsPrivateKey} (Length: ${orbsPrivateKey.length})`
      );
      process.exit(1);
    }

    const keys = {
      aws: {
        awsProfile,
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
      }
    };

    const cloud = {
      type: types.clouds.aws,
      region,
      instanceType: nodeSize,
      bucketPrefix,
    };

    if (managerPublicIp !== false) {
      if (ValidateIPaddress(managerPublicIp)) {
        cloud.ip = managerPublicIp;
      } else {
        console.error('The supplied IP address ', managerPublicIp,
          'is not a valid IPv4 address!');
        process.exit(1);
      }
    }

    const result = await c.createConstellation({ cloud, keys });

    if (result.ok === true) {
      const managerIP = ('ip' in cloud) ? cloud.ip : result.manager.ip;

      console.log(
        'Your constellation was created successfully!',
        "Provided below is the address of your manager node public IP"
          `The manager IPv4 is: ${managerIP}`
      );

      process.exit(0);
    }
  })
  .option('verbose', {
    alias: 'v',
    default: false
  })
  .demandCommand()
  .help()
  .argv
