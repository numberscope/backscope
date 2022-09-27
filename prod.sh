#!/bin/bash
cd /home/scope/repos/backscope &&
source .venv/bin/activate &&
pip install -r requirements.txt &&
gunicorn --workers 3 --bind unix:/home/scope/repos/backscope/backscope.sock -m 777 wsgi:app
