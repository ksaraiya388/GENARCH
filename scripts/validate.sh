#!/usr/bin/env bash
set -euo pipefail

python3 -m pipeline.validate
npm --prefix site run lint
npm --prefix site run build
