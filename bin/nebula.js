#!/usr/bin/env node

const { create, destroy, update } = require('../lib/cli');
const { createOptions, destroyOptions, updateOptions } = require('../lib/cli/options');

require('yargs') // eslint-disable-line
  .command('create', 'Create an Orbs constellation in the cloud', createOptions, create)
  .command('destroy', 'Destroys an Orbs constellation', destroyOptions, destroy)
  .option('verbose', {
    alias: 'v',
    default: false
  })
  .command('update', 'Updates a running constellation\'s topology and vChains version', updateOptions, update)
  .demandCommand()
  .help()
  .argv
