#!/bin/bash -xe

for i in `seq 1 3`;
do
    ../bin/nebula.js destroy --name example-node${i}
done 
