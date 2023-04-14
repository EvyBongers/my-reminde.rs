#!/bin/bash

echo ">>> Installing node modules..."

pnpm install

echo ">>> Executing pnpm..."

exec pnpm "${@}"
