#!/bin/bash

echo ">>> Installing node modules..."

pwd
ls -al
pnpm install

echo ">>> Executing pnpm..."

exec pnpm "${@}"
