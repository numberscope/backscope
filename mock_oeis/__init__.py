import os.path
from flask import Flask, Blueprint, Response

# application factory guide
#   https://flask.palletsprojects.com/en/2.3.x/patterns/appfactories/

api = Blueprint('api', __name__)

@api.route('/ready')
def ready():
  return 'ready'

@api.route('/test')
def test():
  return {
    'salutation': 'hello',
    'addressee': 'world'
  }

@api.route("/<oeis_id>/<filename>", methods=["GET"])
def get_data(oeis_id, filename):
  expected_filename = f'b{oeis_id[1:]}.txt'
  if filename == expected_filename:
    filepath = os.path.join('mock_oeis', 'data', filename)
    if os.path.isfile(filepath):
      with open(filepath) as file:
        return Response(file.read(), mimetype='text/plain')
    else:
      return f"Mock OEIS doesn't have sequence {oeis_id}", 404
  else:
    return f"B-file for {oeis_id} is called {expected_filename}, not {filename}", 404

def create_app():
  app = Flask(__name__)
  ##app.config.from_object()
  app.register_blueprint(api)
  return app