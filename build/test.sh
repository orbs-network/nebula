#!/bin/bash

yarn test
SUCCESS=$?

echo "Running clean up!"
bash ./build/clean.sh 

exit $SUCCESS