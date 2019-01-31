#!/bin/bash

yarn test
SUCCESS=$?

if [ $SUCCESS == "0" ] 
then
    echo "Running clean up!"
    ./build/clean.sh 
fi

exit $SUCCESS