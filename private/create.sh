#!/bin/bash -xe

for i in `seq 1 3`;
do
    ../bin/nebula.js create -f nodes/node${i}.json
done 
