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
    
    # there will be a long delay after the test runs because
    # `save_oeis_sequence` is running in the background
    def test_get_oeis_values(self):
      # using test client is recommended in Flask testing how-to
      #   https://flask.palletsprojects.com/en/2.3.x/testing/
      # "The test client makes requests to the application without running a
      # live server." the `with` block runs teardown
      #   https://github.com/pallets/flask/issues/2949
      with self.app.test_client() as client:
        print("\n  Testing response")
        endpoint = "http://127.0.0.1:5000/api/get_oeis_values/A000396/10"
        response = client.get(endpoint)
        expected_json = {
          'id': 'A000396',
          'name': 'A000396 [name not yet loaded]',
          'values': {
            '1': '6',
            '2': '28',
            '3': '496',
            '4': '8128',
            '5': '33550336',
            '6': '8589869056',
            '7': '137438691328',
            '8': '2305843008139952128',
            '9': '2658455991569831744654692615953842176',
            '10': '191561942608236107294793378084303638130997321548169216'
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
