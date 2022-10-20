#!/bin/bash
cd /home/scope/repos/backscope &&
source .venv/bin/activate &&
pip install -r requirements.txt &&
pip install --force cypari2 &&
gunicorn --workers 3 --bind unix:/home/scope/repos/backscope/backscope.sock -m 777 wsgi:app
