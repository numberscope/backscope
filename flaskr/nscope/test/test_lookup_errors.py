import unittest
import flaskr.nscope.test.abstract_endpoint_test as abstract_endpoint_test


# According to the OEIS wiki, "The A-number A000000 is inadmissible". That
# should make A000000 a relatively stable example of a non-existent sequence.
#
#   https://oeis.org/wiki/A-numbers
#
class TestNonexistentSequence(abstract_endpoint_test.AbstractEndpointTest):
  endpoint = 'http://localhost:5000/api/get_oeis_values/A000000/12'
  expected_response = "Error: B-file for ID 'A000000' not found in OEIS."
  expected_log_output = [
    {'log_level': 'error', 'event': 'request issue', 'tags': ['http error']}
  ]


if __name__ == "__main__":
    unittest.main()
