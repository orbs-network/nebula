#!/bin/bash

for CTX in $(ls -lh _terraform | awk '{print $9}'); do
    cd _terraform/$CTX
    
    node ../../build/ips.js `pwd`/outputs.json | xargs -I {} sh -c "ssh -i ~/.ssh/id_rsa -o ConnectTimeout=4 -o StrictHostKeyChecking=no ubuntu@{} 'sudo systemctl stop docker && sudo umount /dev/xvdh'"
    terraform destroy --var-file=terraform.tfvars -auto-approve
    rm -f terraform.tfvars

    cd ../..
done

cd test/e2e/eip_tf_state && terraform destroy --var-file=terraform.tfvars -auto-approve