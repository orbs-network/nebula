#!/bin/bash

yarn test
SUCCESS=$?
echo "running tests"


echo "Running clean up!"
bash ./build/clean.sh

exit $SUCCESS
