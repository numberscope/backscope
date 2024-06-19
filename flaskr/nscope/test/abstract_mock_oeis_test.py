import os
import unittest
import requests
import requests.exceptions
import sys
import time
import mock_oeis
from urllib.parse import urlunparse
from subprocess import Popen
from flaskr import create_app, db
import flaskr.nscope.views as views


# for starting and stopping the server, hat tip StackOverflow user moe asal...
#   https://stackoverflow.com/q/63422975
# ... who provided code under the MIT license, and ideas under CC BY-SA 4.0
#   https://meta.stackexchange.com/q/271080


class AbstractMockOEISTest(unittest.TestCase):
  mock_scheme = 'http'
  mock_host = 'localhost'
  mock_port = '5001'
  mock_hostport = f'{mock_host}:{mock_port}'

  values_available = True
  search_available = True

  def assert_mock_oeis_test_attr(self, name):
    assert hasattr(self, name), (
      f"Can't construct a '{type(self).__name__}' "
      f"mock OEIS test without '{name}' attribute"
    )

  def __init__(self, *args, **kwargs):
    # make sure required attributes are present
    self.assert_mock_oeis_test_attr('endpoint')
    self.assert_mock_oeis_test_attr('expected_response')
  
    # check whether unittest is running in verbose mode
    # hat tip StackOverflow users Dimitris Fasarakis Hilliard and EquipDev...
    #   https://stackoverflow.com/a/43002355
    #   https://stackoverflow.com/questions/43001768/how-can-a-test-in-python-unittest-get-access-to-the-verbosity-level#comment73163492_43002355
    # ... who provided this code under the MIT license
    #   https://meta.stackexchange.com/q/271080
    self.verbose = ('-v' in sys.argv) or ('--verbose' in sys.argv)

    super().__init__(*args, *kwargs)

  def mock_oeis_url(self, path):
    return urlunparse([
      self.mock_scheme,
      self.mock_hostport,
      path,
      '', # path parameters
      '', # query
      ''  # fragment
    ])

  def waitUntilReady(self):
    # wait for the server to start up
    interval = 0.25
    retry = True
    while retry:
      if interval > 2:
        raise RuntimeError('Mock OEIS server took too long to start')
      time.sleep(interval)
      if self.verbose:
        print(f'  Waited {interval}s; attempting connection to mock OEIS server')
      try:
        response = requests.get(self.mock_oeis_url('/ready'))
        retry = not response.status_code == 200
      except requests.exceptions.ConnectionError:
        retry = True
      interval = 2*interval

  def setUp(self):
    # check whether unittest is running in verbose mode
    # hat tip StackOverflow users Dimitris Fasarakis Hilliard and EquipDev...
    #   https://stackoverflow.com/a/43002355
    #   https://stackoverflow.com/questions/43001768/how-can-a-test-in-python-unittest-get-access-to-the-verbosity-level#comment73163492_43002355
    # ... who provided this code under the MIT license
    #   https://meta.stackexchange.com/q/271080
    self.verbose = ('-v' in sys.argv) or ('--verbose' in sys.argv)
    if self.verbose:
      print()

    # create app
    self.app = create_app('testing', oeis_scheme='http', oeis_hostport=f'localhost:{self.mock_port}')
    self.ctx = self.app.app_context()
    with self.ctx:
      db.drop_all()
      db.create_all()

    # start serving mock OEIS
    self.oeis_server = Popen(
      ['flask', '--app', 'mock_oeis', 'run', '--port', self.mock_port],
      env={
        'VALUES_AVAILABLE': '1' if self.values_available else '0',
        'SEARCH_AVAILABLE': '1' if self.search_available else '0',
        **os.environ
      }
    )

  def tearDown(self):
    # wait for background work to finish
    if self.verbose:
      print("  Waiting for background work")
    views.executor.shutdown()
    if self.verbose:
      print("  Background work done")

    # clear database
    db.session.remove()
    with self.ctx:
      db.drop_all()

    # send termination signal to server thread
    self.oeis_server.terminate()

    # wait for server subprocess to terminate
    self.oeis_server.wait()

  def test_endpoint(self):
    # using test client is recommended in Flask testing how-to
    #   https://flask.palletsprojects.com/en/2.3.x/testing/
    # "The test client makes requests to the application without running a live
    # server." the `with` block runs teardown
    #   https://github.com/pallets/flask/issues/2949
    self.waitUntilReady()
    with self.app.test_client() as client:
      if self.verbose:
        print("  Testing response")

      # check status
      response = client.get(self.endpoint)
      self.assertEqual(response.status_code, 200)

      # check response. so far, mock OEIS tests all use text responses, so
      # there's no need to condition on the response type like we do in the
      # abstract endpoint test
      self.assertEqual(response.text, self.expected_response)