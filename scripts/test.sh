#!/bin/bash
if [ -n $SERVERLESS_AWS_STORAGE_ARN ];
then
  env TS_NODE_COMPILER_OPTIONS='{ "module": "commonjs" }' mocha -r ts-node/register 'test/**/*.ts' --timeout 120000
fi
