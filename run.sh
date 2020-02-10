#!/usr/bin/env bash

source ".scripts/flask"

# Environment variables
FLASK_ENV=development
export FLASK_ENV
export FLASK_APP=run.py
export FLASK_RUN_PORT=5001

prepare && run || echo "Error on setup application may have failed"
