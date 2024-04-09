"""
Init file (creates app and database)
"""

import click
from dotenv import load_dotenv
from flask import Flask, current_app
from flask.cli import with_appcontext
from flask_cors import CORS
from flask_migrate import Migrate
from flask_sqlalchemy import SQLAlchemy
import logging
from logging.handlers import RotatingFileHandler
import os
import subprocess # for calling git
import sys


from .config import config


"""Exception for when environment variables are bad or missing."""
class EnvironmentException(Exception):
  pass


# Load all environment variables from .env
load_dotenv()

# Create a new sql alchemy database object
db = SQLAlchemy()

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

    # Remember the git hash of the code we are running:
    if 'GIT_REVISION_HASH' in os.environ:
      app.config['git_revision_hash'] = os.getenv('GIT_REVISION_HASH')
    else:
      # hash can be provided by the command
      #    git rev-parse --short HEAD
      # thanks to: https://stackoverflow.com/questions/14989858/get-the-current-git-hash-in-a-python-script/
      app.config['git_revision_hash'] = subprocess.check_output(
        ['git', 'rev-parse', '--short', 'HEAD'], encoding='utf8').strip()

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
    app.cli.add_command(clear_database_command)

    # The nscope endpoint application
    from flaskr import nscope

    # The executor and blueprint are specified via nscope
    nscope.executor.init_app(app)
    app.register_blueprint(nscope.bp)

    # The primary application
    return app


def clear_database():
    db.drop_all()
    db.create_all()

@click.command("clear-database")
@with_appcontext
def clear_database_command():
    if current_app.config['PRODUCTION']:
      confirm = input(
        'Backscope is running in production mode. Are you sure you want to '
        'clear the production database? Enter "yes" to confirm, or any other '
        'string to abort: '
      )
      if not (confirm == 'yes'):
        click.echo("No action taken")
        return
    clear_database()
    click.echo("Database cleared")
