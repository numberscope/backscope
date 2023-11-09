"""
Init file (creates app and database)
"""

import os
from flask import Flask
import click
from flask.cli import with_appcontext
from flask_cors import CORS
from flask_migrate import Migrate
from flask_sqlalchemy import SQLAlchemy
import logging
from logging.handlers import RotatingFileHandler
import sys

from dotenv import load_dotenv

from .config import config


"""Exception for when environment variables are bad or missing."""
class EnvironmentException(Exception):
  pass


# Load all environment variables from .env
load_dotenv()

# Create a new sql alchemy database object
db = SQLAlchemy()

## LOGBAD - start logging
logging.basicConfig(filename='response.log', level='INFO') ## LOGBAD

# To choose the environment, we look for settings in the following order:
#  (1) Function parameter
#  (2) .env
#  (3) Default to 'development'
def create_app(environment=None, oeis_scheme='https', oeis_hostport='oeis.org'):
    if environment is None:
      # Get app type from .env if provided. Otherwise, use 'development'
      environment = os.environ.get('APP_ENVIRONMENT', 'development')

    # Initial app and configuration
    app = Flask(__name__, instance_relative_config=True)

    # Upload config from config.py
    if environment == 'development': CORS(app)
    if config[environment].TESTING and config[environment].SQLALCHEMY_DATABASE_URI is None:
      ## this is a really convoluted way of throwing an exception when you try
      ## to run tests without specifying the test database, but allowing the
      ## test database to be unspecified in other circumstances. we should clean
      ## this up somehow
      raise EnvironmentException(
        'To create the Backscope app in testing mode, the '
        'POSTGRES_DISPOSABLE_DB environment variable must be set to a non-empty '
        'string. Beware: running tests will clear the database '
        'POSTGRES_DISPOSABLE_DB. Other actions may also clear this database.'
      )
    app.config.from_object(config[environment])
    app.config['oeis_scheme'] = oeis_scheme
    app.config['oeis_hostport'] = oeis_hostport
    
    # Logging
    file_handler = RotatingFileHandler('api.log', maxBytes=10000, backupCount=1)
    file_handler.setLevel(logging.INFO)
    app.logger.addHandler(file_handler)
    stdout = logging.StreamHandler(sys.stdout)
    stdout.setLevel(logging.DEBUG)
    app.logger.addHandler(stdout)

    # Initialize the application
    db.init_app(app)
    Migrate(app, db)

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

