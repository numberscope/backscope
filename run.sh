#!/bin/bash


# Prefix for minified NSCore
MIN_PREFIX="`pwd`/static/js/NScore_bundle_legacy.js"

# Environment variables
FLASK_ENV=development
export FLASK_ENV
export FLASK_APP=run.py
export FLASK_RUN_PORT=5001


# Check for existing executables
probe () {
        flask --version >/dev/null 2>&1 || \
          { echo >&2 "Requires flask but it's not installed.  Aborting."; exit 1; }

        npm --version >/dev/null 2>&1 || \
          { echo >&2 "Requires npm but it's not installed.  Aborting."; exit 1; }
}

# Setup
prepare () {
        if [[ -f $MIN_PREFIX ]]; then
          rm $MIN_PREFIX
        fi
        npm run-script build && return 0 || return 1
}

# Run application
run () {
        flask run & \
          echo "Running on port 5001" || \
          echo "error running application make sure flask is installed"
}


probe
prepare && run
