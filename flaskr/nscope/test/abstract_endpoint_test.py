import unittest
import sys
from flaskr import create_app, db
import flaskr.nscope.views as views


# guidance on test database handling:
#   https://stackoverflow.com/a/17818795
#   https://flask-testing.readthedocs.io/en/v0.4/

class AbstractEndpointTest(unittest.TestCase):
  def assert_endpoint_test_attr(self, name):
    assert hasattr(self, name), f"Can't construct endpoint test without '{name}' attribute"
  
  def __init__(self, *args, **kwargs):
    # make sure required attributes are present
    self.assert_endpoint_test_attr('endpoint')
    self.assert_endpoint_test_attr('expected_response_json')
    
    # check whether unittest is running in verbose mode
    # hat tip StackOverflow users Dimitris Fasarakis Hilliard and EquipDev...
    #   https://stackoverflow.com/a/43002355
    #   https://stackoverflow.com/questions/43001768/how-can-a-test-in-python-unittest-get-access-to-the-verbosity-level#comment73163492_43002355
    # ... who provided this code under the MIT license
    #   https://meta.stackexchange.com/q/271080
    self.verbose = ('-v' in sys.argv) or ('--verbose' in sys.argv)
    
    super().__init__(*args, *kwargs)
  
  def setUp(self):
    self.app = create_app('testing')
    self.ctx = self.app.app_context()
    with self.ctx:
      db.drop_all()
      db.create_all()
    
    # put mid-test messages on a new line
    if self.verbose:
      print()
  
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
  
  def test_endpoint(self):
    # using test client is recommended in Flask testing how-to
    #   https://flask.palletsprojects.com/en/2.3.x/testing/
    # "The test client makes requests to the application without running a live
    # server." the `with` block runs teardown
    #   https://github.com/pallets/flask/issues/2949
    with self.app.test_client() as client:
      if self.verbose:
        print("  Testing response")
      response = client.get(self.endpoint)
      self.assertEqual(response.status_code, 200)
      self.assertDictEqual(response.json, self.expected_response_json)
      
      # TO DO: test background work