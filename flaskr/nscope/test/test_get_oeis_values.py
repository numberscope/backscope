import unittest
from flaskr import create_app, db
import flaskr.nscope.views as views
from flaskr.config import TestConfig


# guidance on test database handling:
#   https://stackoverflow.com/a/17818795/1644283
#   https://flask-testing.readthedocs.io/en/v0.4/

# this test currently fails, which i think is accuarate! it looks like
# `fetch_values` never sets the `shift` attribute of the Sequence it returns, so
# we end up indexing from zero even if the shift should be nonzero
class TestGetOEISValues(unittest.TestCase):
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
    
    # we choose A321580 because:
    # - it has a nonzero shift, so we can make sure the default value is getting
    #   changed to the actual value
    # - it currently has small values and few references, which speeds up the
    #   background work triggered by the request
    def test_get_oeis_values(self):
      # using test client is recommended in Flask testing how-to
      #   https://flask.palletsprojects.com/en/2.3.x/testing/
      # "The test client makes requests to the application without running a
      # live server." the `with` block runs teardown
      #   https://github.com/pallets/flask/issues/2949
      with self.app.test_client() as client:
        print("  Testing response")
        endpoint = "http://127.0.0.1:5000/api/get_oeis_values/A321580/12"
        response = client.get(endpoint)
        expected_json = {
          'id': 'A321580',
          'name': 'A321580 [name not yet loaded]',
          'values': {
            '1': '1',
            '2': '2',
            '3': '4',
            '4': '8',
            '5': '10',
            '6': '12',
            '7': '16',
            '8': '18',
            '9': '24',
            '10': '26',
            '11': '28',
            '12': '32'
          }
        }
        self.assertEqual(response.status_code, 200)
        self.assertDictEqual(response.json, expected_json)
        
        # TO DO: test background work


if __name__ == "__main__":
    unittest.main()
