import unittest
from flaskr import create_app, db
import flaskr.nscope.views as views
from flaskr.config import TestConfig

# guidance on test database handling:
#   https://stackoverflow.com/a/17818795/1644283
#   https://flask-testing.readthedocs.io/en/v0.4/

class AbstractEndpointTest(unittest.TestCase):
    def __init__(self, *args, **kwargs):
      assert(hasattr(self, 'endpoint'))
      assert(hasattr(self, 'expected_response_json'))
      super().__init__(*args, *kwargs)
    
    def setUp(self):
      self.app = create_app('testing')
      self.ctx = self.app.app_context()
      with self.ctx:
        db.create_all()
      
      # put mid-test messages on a new line
      print()
    
    def tearDown(self):
      # wait for background work to finish
      print("  Waiting for background work")
      views.executor.shutdown()
      print("  Background work done")
      
      # clear database
      db.session.remove()
      with self.ctx:
        db.drop_all()
    
    def test_endpoint(self):
      # using test client is recommended in Flask testing how-to
      #   https://flask.palletsprojects.com/en/2.3.x/testing/
      # "The test client makes requests to the application without running a
      # live server." the `with` block runs teardown
      #   https://github.com/pallets/flask/issues/2949
      with self.app.test_client() as client:
        print("  Testing response")
        response = client.get(self.endpoint)
        self.assertEqual(response.status_code, 200)
        self.assertDictEqual(response.json, self.expected_response_json)
        
        # TO DO: test background work