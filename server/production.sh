#!/bin/bash
cd /home/scope/repos/backscope &&
source .venv/bin/activate &&
pip install -r requirements.txt &&
pip install gunicorn
gunicorn --workers 4 --bind unix:/home/scope/repos/backscope/backscope.sock -m 777 'app:create_app()'
