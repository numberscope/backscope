from flask import Flask, Blueprint

# application factory guide
#   https://flask.palletsprojects.com/en/2.3.x/patterns/appfactories/

api = Blueprint('api', __name__, url_prefix='/api')

@api.route('/ready')
def ready():
  return 'ready'

@api.route('/test')
def test():
  return {
    'salutation': 'hello',
    'addressee': 'world'
  }

def create_app():
  app = Flask(__name__)
  ##app.config.from_object()
  app.register_blueprint(api)
  return app