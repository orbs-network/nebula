# Publishing Nebula Versions

> Note: This section is only relevant to Nebula maintainers

## NPM tags we use

* `latest` - the stable release, used by validators.

* `experimental` - unstable dev release, used by developers and core team.


To view current versions for both tags, visit [this page](https://www.npmjs.com/package/@orbs-network/orbs-nebula?activeTab=versions) or run in CLI:

```
npm dist-tag ls @orbs-network/orbs-nebula
```

## Installing the stable version (latest)

```
npm install @orbs-network/orbs-nebula
```

## Installing the experimental version

```
npm install @orbs-network/orbs-nebula@experimental
```

## Publishing new versions under these tags

See https://docs.npmjs.com/cli/dist-tag
