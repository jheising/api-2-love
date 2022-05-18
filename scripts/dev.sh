#!/bin/bash

export API_ROOT="${API_ROOT:-./api}"
export SCRIPT_DIR=$( cd "$(dirname "${BASH_SOURCE[0]}")" ; pwd -P )
export LOG_LEVEL="${LOG_LEVEL:-info}"

echo "${API_ROOT}/**/*"

ts-node-dev --watch "${API_ROOT}/**" --transpile-only "${SCRIPT_DIR}/dev-server.ts"