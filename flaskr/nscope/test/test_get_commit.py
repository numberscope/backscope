import unittest
import flaskr.nscope.test.abstract_endpoint_test as abstract_endpoint_test
import subprocess # for calling git

class TestGetCommit(abstract_endpoint_test.AbstractEndpointTest):
  endpoint = "http://localhost:5000/api/get_commit"
  
  #   should return the most recent hash
  short_hash = subprocess.check_output(['git', 'rev-parse', '--short', 'HEAD'])
  short_hash = str(short_hash, "utf-8").strip()
  expected_response = {
    'short_commit_hash': short_hash,
  }
