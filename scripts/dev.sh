#!/bin/bash

export API_ROOT="${API_ROOT:-./api}"
export LOG_LEVEL="${LOG_LEVEL:-info}"

ts-node-dev --watch "${API_ROOT}/**" --transpile-only "../scripts/dev-server.ts"