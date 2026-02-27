#!/usr/bin/env bash
set -euo pipefail

python -m pipeline.validate
npm --prefix site run lint
npm --prefix site run build
