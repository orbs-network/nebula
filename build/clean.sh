#!/bin/bash

for CTX in $(ls -lh _terraform | awk '{print $9}'); do
    cd _terraform/$CTX
    
    terraform destroy --var-file=terraform.tfvars -auto-approve
    rm -f terraform.tfvars

    cd ../..
done

for CTX in $(ls -lh ~/.nebula | awk '{print $9}'); do
    cd ~/.nebula/$CTX
    
    terraform destroy --var-file=terraform.tfvars -auto-approve
    rm -f terraform.tfvars
done

cd test/e2e/eip_tf_state && terraform destroy --var-file=terraform.tfvars -auto-approve
