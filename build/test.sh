#!/bin/bash

yarn run test:unit
SUCCESS=$?
echo "running tests"


echo "Running clean up!"
bash ./build/clean.sh

exit $SUCCESS
