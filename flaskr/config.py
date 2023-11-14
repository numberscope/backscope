"""
Config for flask app
"""

import os
from dotenv import load_dotenv
load_dotenv()


POSTGRES = {
    'user': os.getenv('POSTGRES_USER', 'postgres'),
    'pw': os.getenv('POSTGRES_PASSWORD', 'root'),
    'db': os.getenv('POSTGRES_DB', 'postgres'),
    'host': os.getenv('POSTGRES_HOST', 'localhost'),
    'port': os.getenv('POSTGRES_PORT', 5432),
}

# the key 'POSTGRES_DISPOSABLE_DB' is missing by default because tests and other
# actions can and will clear whatever database it names!
TEST_POSTGRES = {
    'user': os.getenv('POSTGRES_USER', 'postgres'),
    'pw': os.getenv('POSTGRES_PASSWORD', 'root'),
    'host': os.getenv('POSTGRES_HOST', 'localhost'),
    'port': os.getenv('POSTGRES_PORT', 5432),
}
if 'POSTGRES_DISPOSABLE_DB' in os.environ:
  _postgres_disposable_db = os.getenv('POSTGRES_DISPOSABLE_DB')
  if not f'{_postgres_disposable_db}' == '':
    TEST_POSTGRES['db'] = _postgres_disposable_db

class Config:
    ERROR_404_HELP = False

    SECRET_KEY = os.getenv('APP_SECRET', 'secret key')

    SQLALCHEMY_DATABASE_URI = 'postgresql+psycopg2://{user}:{pw}@{host}:{port}/{db}'.format(**POSTGRES)
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    DOC_USERNAME = 'api'
    DOC_PASSWORD = 'password'
    
    DEBUG = False
    TESTING = False
    PRODUCTION = False


class DevConfig(Config):
    DEBUG = True


class TestConfig(Config):
    if 'db' in TEST_POSTGRES and not '{db}'.format(**TEST_POSTGRES) == '':
      SQLALCHEMY_DATABASE_URI = 'postgresql+psycopg2://{user}:{pw}@{host}:{port}/{db}'.format(**TEST_POSTGRES)
    else:
      SQLALCHEMY_DATABASE_URI = None
    TESTING = True
    DEBUG = True


class ProdConfig(Config):
    PRODUCTION = True


config = {
    'development': DevConfig,
    'testing': TestConfig,
    'production': ProdConfig
}
