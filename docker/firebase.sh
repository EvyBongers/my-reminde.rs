#!/bin/bash

echo ">>> Installing node modules..."

pnpm install

echo ">>> Installing firebase node modules..."

(cd functions && npm install)

echo ">>> Starting functions builder..."

(cd functions && npm build --watch)

echo ">>> Executing firebase emulator..."

exec pnpm run firebase "${@}"
