"""
Init file (creates app and database)
"""

import os
from flask import Flask
import click
from flask.cli import with_appcontext
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
import logging
from logging.handlers import RotatingFileHandler
import sys

from dotenv import load_dotenv

from .config import config

# This statement loads all environment variables from .env
load_dotenv()

# Create a new sql alchemy database object
db = SQLAlchemy()

# default environment is development, otherwie specified by .env
def create_app(environment='development'):
    
    # Get app type from .env
    environment = os.environ.get('APP_ENVIRONMENT', environment)

    # Initial app and configuration
    app = Flask(__name__, instance_relative_config=True)

    # Upload config from config.py
    app.config.from_object(config[environment])

    # Need to be more cognisant of this in the future
    CORS(app, resources={r'/*' : {'origins' : '*'}})
    
    # Logging
    file_handler = RotatingFileHandler('api.log', maxBytes=10000, backupCount=1)
    file_handler.setLevel(logging.INFO)
    app.logger.addHandler(file_handler)
    stdout = logging.StreamHandler(sys.stdout)
    stdout.setLevel(logging.DEBUG)
    app.logger.addHandler(stdout)

    # Initialize the application
    db.init_app(app)
    
    # Add a command line interface to the application
    app.cli.add_command(init_db_command)

    # The nscope endpoint application
    from flaskr import nscope

    # The executor and blueprint are specified via nscope
    nscope.executor.init_app(app)
    app.register_blueprint(nscope.bp)

    # The primary application
    return app


def init_db():
    db.drop_all()
    db.create_all()

@click.command("init-db")
@with_appcontext
def init_db_command():
    init_db()
    click.echo("Initialized Database")

