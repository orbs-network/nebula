#!/bin/bash

#yarn test
echo "running tests"
SUCCESS=$?

echo "Running clean up!"
bash ./build/clean.sh 

exit $SUCCESS