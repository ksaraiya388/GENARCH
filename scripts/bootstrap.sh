#!/usr/bin/env bash
set -euo pipefail

echo "Installing Node dependencies..."
npm install
npm --prefix site install

echo "Installing Python pipeline package..."
python -m pip install -e ./pipeline

echo "Generating seed data..."
python -m pipeline.update --scope all
python -m pipeline.report --year 2026
python -m pipeline.validate

echo "Bootstrap complete."
