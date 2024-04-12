#!/bin/bash

EXPECTEDARGS=2
if [ $# -lt $EXPECTEDARGS ]; then
    echo "Usage: $0 <LB_ADDR> <LOAD_TEST_LOOPS> <(optional): NUM_OF_TOTAL_REQUESTS> <(optional): NUM_OF_CONCURRENT_REQUESTS>"
    exit 0
fi

LB=$1
LOOPS=$2
REQS=${3:-50000}
CONCURRENCY=${4:-100}

for ((i=0;i<$LOOPS;i++))
do
    echo "==================================="
    echo `date`
    echo "loop #: $(($i+1)) of $LOOPS"
    hey -n $REQS -c $CONCURRENCY -host "apps.example.com" http://$LB/echoserver
    echo "-------------------"
done
