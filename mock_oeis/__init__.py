import os.path
from flask import Flask, Blueprint, Response, current_app, request

# you can launch a mock OEIS server by calling
#
#   flask --app mock_oeis run
#
# from the top level of the repository

# application factory guide
#   https://flask.palletsprojects.com/en/2.3.x/patterns/appfactories/

api = Blueprint('api', __name__)

unavailable_msg = 'You are crawling too fast.  Come back in a few minutes.\nMail questions to njasloane@gmail.com and rsc@swtch.com.\n'

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

  values_available = current_app.config['values available']
  if values_available == '1':
    with open(filepath) as file:
      return Response(file.read(), mimetype='text/plain; charset=utf-8')
  elif values_available == '0':
    return unavailable_msg, 503
  else:
    return f"Mock OEIS VALUES_AVAILABLE flag should be set to '0' or '1' instead of '{values_available}'", 500

# since this sequence only has one page of results, the OEIS search endpoint
# ignores the 'start' parameter
@api.route('/search')
def search():
  result_format = request.args['fmt']
  if not (result_format == 'json'):
    return f"Mock OEIS can only return search results in 'json' format; '{result_format}' format was requested", 400

  search_available = current_app.config['search available']
  if search_available == '1':
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
  elif search_available == '0':
    return unavailable_msg, 503
  else:
    return f"Mock OEIS SEARCH_AVAILABLE flag should be set to '0' or '1' instead of '{search_available}'", 500

def create_app():
  app = Flask(__name__)

  # configure behavior
  app.config['values available'] = os.environ.get('VALUES_AVAILABLE', '1')
  app.config['search available'] = os.environ.get('SEARCH_AVAILABLE', '1')

  app.register_blueprint(api)
  return app
