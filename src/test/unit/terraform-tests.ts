import { describe, it } from "mocha";
import chai from "chai";
import asserttype from "chai-asserttype";
chai.use(asserttype);

const { expect } = chai;

import { Terraform } from "../../lib/services/terraform";
const tf = new Terraform();

describe("terraform service unit tests", () => {
  it("should parse terraform outputs correctly", () => {
    const cleanOutputs = [
      {
        key: "manager.public_ip",
        value: "1.2.4.5"
      },
      {
        key: "manager.public_dns",
        value: "ec2-1-2-4-5.somezone.amazon.com"
      }
    ];

    const dataAsString = cleanOutputs
      .map(
        ({ key, value }) =>
          `\u001b[0m${key}\u001b[0m = \u001b[0m${value}\u001b[0m`
      )
      .join("\n");

    const result = tf.parseOutputs(dataAsString);
    expect(result).to.be.array();
    expect(result.length).to.equal(2);
    expect(result).to.deep.equal(cleanOutputs);
  });

  it("should return an empty [] when there are no outputs in the string", () => {
    const result = tf.parseOutputs("fadssaf\n");
    expect(result).to.be.array();
    expect(result.length).to.equal(0);
  });

  describe("createTerraformVariablesFile", () => {
    it("default call", () => {
      const keys = {
        aws: {
          profile: "default"
        },
        ssh: {
          path: `${process.env.HOME}/.ssh/id_rsa.pub`,
          cidr: ["0.0.0.0/0"]
        },
        orbs: {
          nodeKeys: {
            address: "54018092153dcdea764f89d33b086c7114e11985",
            privateKey:
              "1e4c067360dd8b81db5de2609783c505f61f239cd970195d00165dd9e4df774b"
          },
          boyarConfig: {
            network: [],
            orchestrator: {},
            chains: [
              {
                Id: 10000,
                HttpPort: 8080,
                GossipPort: 4400,
                DockerConfig: {
                  ContainerNamePrefix: "orbs-network",
                  Image: "orbsnetwork/node",
                  Tag: "v0.9.3",
                  Pull: true
                },
                Config: {
                  "ethereum-endpoint": "http://172.31.1.100:8545",
                  "logger-file-truncation-interval": "15m",
                  profiling: true,
                  "benchmark-consensus-constant-leader":
                    "6e2cb55e4cbe97bf5b1e731d51cc2c285d83cbf9"
                }
              },
              {
                Id: 20000,
                HttpPort: 8081,
                GossipPort: 4401,
                DockerConfig: {
                  ContainerNamePrefix: "orbs-network",
                  Image: "orbsnetwork/node",
                  Tag: "v0.9.3",
                  Pull: true
                },
                Config: {
                  "ethereum-endpoint": "http://172.31.1.100:8545",
                  "logger-file-truncation-interval": "15m",
                  profiling: true,
                  "benchmark-consensus-constant-leader":
                    "6e2cb55e4cbe97bf5b1e731d51cc2c285d83cbf9"
                }
              },
              {
                Id: 30000,
                HttpPort: 8082,
                GossipPort: 4402,
                DockerConfig: {
                  ContainerNamePrefix: "orbs-network",
                  Image: "orbsnetwork/node",
                  Tag: "v0.9.3",
                  Pull: true
                },
                Config: {
                  "ethereum-endpoint": "http://172.31.1.100:8545",
                  "logger-file-truncation-interval": "15m",
                  profiling: true,
                  "benchmark-consensus-constant-leader":
                    "6e2cb55e4cbe97bf5b1e731d51cc2c285d83cbf9"
                }
              }
            ]
          },
          ethereumTopologyContractAddress:
            "0xa8Ef7740D85B1c0c22E39aae896e829Af7c895A5",
          ethereumEndpoint: "http://eth.orbs.com"
        }
      };

      const cloud = {
        type: "aws",
        region: "ap-south-1",
        instanceType: "m4.large",
        nodeCount: 0,
        name: "mumbai-node4",
        ip: "52.66.33.249",
        bootstrapUrl: undefined,
        cachePath: process.cwd() + "/test/terraform"
      };

      console.log(tf.createTerraformVariablesFile({ keys, cloud }));

      expect(tf.createTerraformVariablesFile({ keys, cloud })).to.equal(
        `path_to_ssh_pubkey = "${process.env.HOME}/.ssh/id_rsa.pub"
incoming_ssh_cidr_blocks = ["0.0.0.0/0"]
name = "mumbai-node4"
aws_profile = "default"
region = "ap-south-1"
instance_type = "m4.large"
instance_count = 0
boyar_config_source = <<EOF
{"network":[],"orchestrator":{},"chains":[{"Id":10000,"HttpPort":8080,"GossipPort":4400,"DockerConfig":{"ContainerNamePrefix":"orbs-network","Image":"orbsnetwork/node","Tag":"v0.9.3","Pull":true},"Config":{"ethereum-endpoint":"http://172.31.1.100:8545","logger-file-truncation-interval":"15m","profiling":true,"benchmark-consensus-constant-leader":"6e2cb55e4cbe97bf5b1e731d51cc2c285d83cbf9"}},{"Id":20000,"HttpPort":8081,"GossipPort":4401,"DockerConfig":{"ContainerNamePrefix":"orbs-network","Image":"orbsnetwork/node","Tag":"v0.9.3","Pull":true},"Config":{"ethereum-endpoint":"http://172.31.1.100:8545","logger-file-truncation-interval":"15m","profiling":true,"benchmark-consensus-constant-leader":"6e2cb55e4cbe97bf5b1e731d51cc2c285d83cbf9"}},{"Id":30000,"HttpPort":8082,"GossipPort":4402,"DockerConfig":{"ContainerNamePrefix":"orbs-network","Image":"orbsnetwork/node","Tag":"v0.9.3","Pull":true},"Config":{"ethereum-endpoint":"http://172.31.1.100:8545","logger-file-truncation-interval":"15m","profiling":true,"benchmark-consensus-constant-leader":"6e2cb55e4cbe97bf5b1e731d51cc2c285d83cbf9"}}]}
EOF
s3_bucket_name = "boyar-mumbai-node4"
s3_boyar_key = "boyar/config.json"
s3_boyar_config_url = "https://s3-ap-south-1.amazonaws.com/boyar-mumbai-node4/boyar/config.json"
ethereum_endpoint = "http://eth.orbs.com"
ethereum_topology_contract_address = "0xa8Ef7740D85B1c0c22E39aae896e829Af7c895A5"`
      );
    });
  });
});
