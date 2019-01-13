#!/bin/bash

yarn test
SUCCESS=$?

echo "Running clean up!"
./build/clean.sh

exit $SUCCESS