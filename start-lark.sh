#!/bin/bash
# 启动飞书长连接服务

cd "$(dirname "$0")"

export LARK_APP_ID="${LARK_APP_ID:?set LARK_APP_ID first}"
export LARK_APP_SECRET="${LARK_APP_SECRET:?set LARK_APP_SECRET first}"

npx -y tsx src/lark-websocket.ts
