#!/bin/bash
cd /home/scope/repos/backscope &&
source .venv/bin/activate &&
sh tools/install-requirements.sh &&
pip install gunicorn &&
export GIT_REVISION_HASH=$(sudo -u scope git rev-parse --short HEAD) &&
gunicorn --workers 3 --bind unix:/home/scope/repos/backscope/backscope.sock -m 777 wsgi:app
