import unittest
import flaskr.nscope.test.abstract_endpoint_test as abstract_endpoint_test

class TestGetHash(abstract_endpoint_test.AbstractEndpointTest):
  endpoint = "http://127.0.0.1:5000/api/get_hash"
  
  #   should return the most recent hash
  expected_response_json = {
    'git_hash': 'ahashthatchanges',
  }
