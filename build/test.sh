#!/bin/bash

yarn test
SUCCESS=$?
echo "running tests"


echo "Running clean up!"
# Ignore cleanup
# bash ./build/clean.sh 

exit $SUCCESS
