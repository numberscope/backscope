import unittest
from flaskr import create_app
import flaskr.nscope.views as views


class TestGetOEISValues(unittest.TestCase):
    def setUp(self):
      self.app = create_app()
    
    def tearDown(self):
      print("  Waiting for background work")
      views.executor.shutdown()
      print("  Background work done")
    
    # we choose A321580 because it currently has small values and few
    # references, which speeds up the `save_oeis_sequence` background work
    def test_get_oeis_values(self):
      # using test client is recommended in Flask testing how-to
      #   https://flask.palletsprojects.com/en/2.3.x/testing/
      # "The test client makes requests to the application without running a
      # live server." the `with` block runs teardown
      #   https://github.com/pallets/flask/issues/2949
      with self.app.test_client() as client:
        print("\n  Testing response")
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
        
        # TO DO: test `save_oeis_sequence` background work
    
    ## to make sure that shutting down the executor doesn't cause later tests to
    ## fail
    def test_dummy(self):
      with self.app.test_client() as client:
        print("\n  Testing response")
        endpoint = "http://127.0.0.1:5000/api/get_oeis_values/A000001/10"
        response = client.get(endpoint)


if __name__ == "__main__":
    unittest.main()
