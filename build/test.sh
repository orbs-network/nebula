#!/bin/bash

yarn run test
SUCCESS=$?
echo "running tests"


echo "Running clean up!"
bash ./build/clean.sh

exit $SUCCESS
