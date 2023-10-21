import unittest
import requests
import requests.exceptions
import sys
import time
import mock_oeis
from multiprocessing import Process


# for starting and stopping the server, hat tip StackOverflow user moe asal...
#   https://stackoverflow.com/q/63422975
# ... who provided code under the MIT license, and ideas under CC BY-SA 4.0
#   https://meta.stackexchange.com/q/271080

class TestMockOEIS(unittest.TestCase):
  host = 'http://127.0.0.1'
  port = '5001'
  ready = f'{host}:{port}/api/ready'
  endpoint = f'{host}:{port}/api/test'
  expected_response_json = {
    'salutation': 'hello',
    'addressee': 'world'
  }
  
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
        response = requests.get(self.ready)
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
    
    # start serving mock OEIS
    self.oeis_app = mock_oeis.create_app()
    self.oeis_server = Process(target=self.oeis_app.run, kwargs={'port': 5001})
    self.oeis_server.start()
  
  def tearDown(self):
    self.oeis_server.terminate()
    self.oeis_server.join()
  
  def test_endpoint(self):
    self.waitUntilReady()
    response = requests.get(self.endpoint)
    self.assertEqual(response.status_code, 200)
    self.assertDictEqual(response.json(), self.expected_response_json)


if __name__ == "__main__":
  unittest.main()