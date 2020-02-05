#!/bin/bash

echo 'Starting up Numberscope Server'
FLASK_ENV=development
export FLASK_ENV
export FLASK_APP=run.py
export FLASK_RUN_PORT=5001
flask run
echo 'Running on port 5001'

# Idea here: build script for getting numberscope project and importing the relevant js files
