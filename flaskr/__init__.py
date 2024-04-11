"""
Init file (creates app and database)
"""

import os
import click
import logging
import structlog
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
import subprocess # for calling git

from dotenv import load_dotenv

from .config import config


"""Exception for when environment variables are bad or missing."""
class EnvironmentException(Exception):
  pass


# Load all environment variables from .env
load_dotenv()

# Create a new sql alchemy database object
db = SQLAlchemy()

# --- Log setup utilities ---

# We definitely want the log file to include bad request warnings, so the log
# level has to be at least that low
file_log_level = logging.WARNING

# If we're in development, the console log level is either DEBUG or INFO,
# depending on whether debugging is turned on. If we're not in development,
# there's no console log, so the console log level is effectively infinite
def console_log_level(environment):
  return (
    (
      logging.DEBUG if config[environment].DEBUG else
      logging.INFO
    ) if config[environment].DEVELOPMENT else
    float('inf')
  )

def create_file_handler():
  # Create a file handler, which writes to rotating files api.log, api.log.1, ..., api.log.5
  handler = RotatingFileHandler('api.log', maxBytes=10**7, backupCount=5)
  
  # Add a JSON formatter
  formatter = ProcessorFormatter(
    processors = [
      ProcessorFormatter.remove_processors_meta,
      TimeStamper(fmt='iso', utc=False),
      JSONRenderer(sort_keys=True)
    ]
  )
  handler.setFormatter(formatter)
  
  # Set log level
  handler.setLevel(file_log_level)
  
  return handler

def create_console_handler(environment):
  # Create a stream handler that writes to stderr
  handler = StreamHandler()
  
  # Add a console formatter
  formatter = ProcessorFormatter(
    processors = [
      ProcessorFormatter.remove_processors_meta,
      TimeStamper(fmt='iso', utc=False),
      ConsoleRenderer()
    ]
  )
  handler.setFormatter(formatter)
  
  # Print everything, or almost everything, in the console
  handler.setLevel(console_log_level(environment))
  
  return handler

# This factory calls up the logger that will be stored in current_app.logger
##class BackscopeLoggerFactory(structlog.stdlib.LoggerFactory):
##  def __init__(self, default_name, **kwargs):
##    super().__init__(**kwargs)
##    self.default_name = default_name
##  
##  def __call__(self, name=None, *args) -> logging.Logger:
##    if name is None:
##      name = self.default_name
##    print('factory made: ', super().__call__(name, *args))
##    return super().__call__(name, *args)

# --- App creation ---

# To choose the environment, we look for settings in the following order:
#  (1) Function parameter
#  (2) .env
#  (3) Default to 'development'
def create_app(environment=None, oeis_scheme='https', oeis_hostport='oeis.org'):
    if environment is None:
      # Get app type from .env if provided. Otherwise, use 'development'
      environment = os.environ.get('APP_ENVIRONMENT', 'development')
    
    # --- Set up logging ---
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
    
    # For explicit logging, we'll use a structured logger that feeds into the
    # basic logger. The structured logger will be current_app.structlogger, and
    # the basic logger will be current_app.logger
    structlog.configure(
      processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.ProcessorFormatter.wrap_for_formatter,
      ],
      ##logger_factory=BackscopeLoggerFactory(__name__)
      logger_factory=structlog.stdlib.LoggerFactory()
    )
    ##structlogger = structlog.get_logger(__name__)
    
    # Create file handler
    file_handler = create_file_handler()
    
    # Set up the basic logger
    min_level = min(file_log_level, console_log_level(environment))
    ##logging.basicConfig(
      ##level=min_level
      ##level=min(file_log_level, console_log_level(environment))
    ##)
    basic_logger = logging.getLogger(__name__)
    basic_logger.setLevel(min_level)
    basic_logger.addHandler(file_handler)
    if config[environment].DEVELOPMENT:
      # in development, also log to the console, with higher verbosity
      basic_logger.addHandler(create_console_handler(environment))
    
    # Create app
    app = Flask(__name__, instance_relative_config=True)
    
    # Add structured logger
    app.structlogger = structlog.get_logger(__name__)
    
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
    
    # Remember the git hash of the code we are running:
    if 'GIT_REVISION_HASH' in os.environ:
      app.config['git_revision_hash'] = os.getenv('GIT_REVISION_HASH')
    else:
      # hash can be provided by the command
      #    git rev-parse --short HEAD
      # thanks to: https://stackoverflow.com/questions/14989858/get-the-current-git-hash-in-a-python-script/
      app.config['git_revision_hash'] = subprocess.check_output(
        ['git', 'rev-parse', '--short', 'HEAD'], encoding='utf8').strip()
    
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
