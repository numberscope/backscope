#!/bin/bash


# Prefix for minified NSCore
MIN_PREFIX="`pwd`/static/js/NScore_bundle_legacy.js"

# A list of necessary commands for the project
CMDS=("flask --version" "npm --version")

# Environment variables
FLASK_ENV=development
export FLASK_ENV
export FLASK_APP=run.py
export FLASK_RUN_PORT=5001


# Check for existing executables
probe () {
        for ((i = 0; i < ${#CMDS[@]}; i++))
        do
                ${CMDS[$i]} > /dev/null 2>&1 || \
                  { echo >&2 "Requires ${CMDS[$i]} but not installed"; exit 1;}
        done
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
        flask run && \
          return 0 || return 1
}


probe
prepare && run || echo "Error on setup npm application may have failed"
