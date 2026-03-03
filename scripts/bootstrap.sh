#!/usr/bin/env bash
set -euo pipefail

echo "Installing Node dependencies..."
npm install
npm --prefix site install

echo "Installing Python pipeline package..."
python3 -m pip install -e ./pipeline

echo "Generating seed data..."
python3 -m pipeline.update --scope all
python3 -m pipeline.report --year 2026
python3 -m pipeline.validate

echo "Bootstrap complete."
