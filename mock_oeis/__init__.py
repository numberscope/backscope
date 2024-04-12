import os.path
from flask import Flask, Blueprint, Response, request

# you can launch a mock OEIS server by calling
#
#   flask --app mock_oeis run
#
# from the top level of the repository

# application factory guide
#   https://flask.palletsprojects.com/en/2.3.x/patterns/appfactories/

api = Blueprint('api', __name__)

@api.route('/ready')
def ready():
  return Response('ready', mimetype='text/plain')

@api.route('/<oeis_id>/<filename>')
def get_data(oeis_id, filename):
  expected_filename = f'b{oeis_id[1:]}.txt'
  if not (filename == expected_filename):
    return f"B-file for {oeis_id} is called {expected_filename}, not {filename}", 404
  
  filepath = os.path.join('mock_oeis', 'data', filename)
  if not os.path.isfile(filepath):
    return f"Mock OEIS doesn't have sequence {oeis_id}", 404
  
  with open(filepath) as file:
    return Response(file.read(), mimetype='text/plain')

# since this sequence only has one page of results, the OEIS search endpoint
# ignores the 'start' parameter
@api.route('/search')
def search():
  result_format = request.args['fmt']
  if not (result_format == 'json'):
    return f"Mock OEIS can only return search results in 'json' format; '{result_format}' format was requested", 400
  
  search_query = request.args['q']
  if search_query.startswith('id:'):
    filename = f'search-id-{search_query[3:]}.json'
  else:
    filename = f'search-{search_query}.json'
  filepath = os.path.join('mock_oeis', 'data', filename)
  if not os.path.isfile(filepath):
    return f"Mock OEIS doesn't have results for search query '{search_query}'", 400
  
  with open(filepath) as file:
    return Response(file.read(), mimetype='application/json')

def create_app():
  app = Flask(__name__)
  app.register_blueprint(api)
  return app
