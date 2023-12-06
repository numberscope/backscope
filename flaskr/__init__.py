"""
Init file (creates app and database)
"""

import os
import click
import logging
from logging import StreamHandler
from logging.handlers import RotatingFileHandler
from structlog.processors import JSONRenderer, TimeStamper
from structlog.stdlib import ProcessorFormatter
from structlog.dev import ConsoleRenderer
from flask import Flask, current_app
from flask.cli import with_appcontext
from flask_cors import CORS
from flask_migrate import Migrate
from flask_sqlalchemy import SQLAlchemy

from dotenv import load_dotenv

from .config import config


"""Exception for when environment variables are bad or missing."""
class EnvironmentException(Exception):
  pass


# Load all environment variables from .env
load_dotenv()

# Create a new sql alchemy database object
db = SQLAlchemy()

def create_file_handler():
  # create a file handler, which writes to rotating files api.log, api.log.1, ..., api.log.5
  handler = RotatingFileHandler('api.log', maxBytes=10**7, backupCount=5)
  
  # add a JSON formatter
  formatter = ProcessorFormatter(
    processors = [
      ProcessorFormatter.remove_processors_meta,
      TimeStamper(fmt="%Y-%b-%d %H:%M:%S", utc=False),
      JSONRenderer()
    ]
  )
  handler.setFormatter(formatter)
  
  # we definitely want the log file to include bad request warnings, so the log
  # level has to be at least that low
  handler.setLevel(logging.WARNING)
  
  return handler

def create_console_handler(debug=False):
  # create a stream handler that writes to stderr
  handler = StreamHandler()
  
  # add a console formatter
  formatter = ProcessorFormatter(
    processors = [
      ProcessorFormatter.remove_processors_meta,
      ConsoleRenderer()
    ]
  )
  handler.setFormatter(formatter)
  
  # print everything, or almost everything, in the console
  handler.setLevel(logging.DEBUG if debug else logging.INFO)
  
  return handler

# To choose the environment, we look for settings in the following order:
#  (1) Function parameter
#  (2) .env
#  (3) Default to 'development'
def create_app(environment=None, oeis_scheme='https', oeis_hostport='oeis.org'):
    if environment is None:
      # Get app type from .env if provided. Otherwise, use 'development'
      environment = os.environ.get('APP_ENVIRONMENT', 'development')

    # Set up logging
    #
    # To access `app.logger` before `app` is created, we take advantage of
    # knowing that `app` will use the `__name__` logger. we set `app.logger` to
    # the most verbose level so that each handler can do its own filtering
    #
    # "When you want to configure logging for your project, you should do it as
    # soon as possible when the program starts. If app.logger is accessed before
    # logging is configured, it will add a default handler. If possible,
    # configure logging before creating the application object"
    #
    #   https://flask.palletsprojects.com/en/2.3.x/logging/
    #
    app_logger = logging.getLogger(__name__)
    app_logger.setLevel(logging.DEBUG)
    app_logger.addHandler(create_file_handler())
    if config[environment].DEVELOPMENT:
      # in development, also log to the console, with higher verbosity
      app_logger.addHandler(create_console_handler(config[environment].DEBUG))

    # Create app
    app = Flask(__name__, instance_relative_config=True)

    # Check logging
    app.logger.info('Backscope is up and running')
    app.logger.warning({
      'foo': 92,
      'bar': [2, 8, 1]
    })

    # Upload config from config.py
    if config[environment].DEVELOPMENT: CORS(app)
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