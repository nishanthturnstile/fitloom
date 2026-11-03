#!/bin/sh
set -eu
# On login or Docker recovery, rebuild from the current checkout before watching.
docker compose up --detach --build --wait --wait-timeout 240
exec docker compose watch --no-up web worker
