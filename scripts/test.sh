#!/bin/bash
if [ -z $CI ];
then
  env TS_NODE_COMPILER_OPTIONS='{ "module": "commonjs" }' mocha -r ts-node/register 'test/**/*.ts' --timeout 120000
fi
