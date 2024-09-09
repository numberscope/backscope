import unittest
import flaskr.nscope.test.abstract_endpoint_test as abstract_endpoint_test


class TestGetOEISHeadersPositive(abstract_endpoint_test.AbstractEndpointTest):
  endpoint = 'http://localhost:5000/api/get_oeis_header/A003173'
  
  # we choose A003173 because:
  # - it has positive shift
  # - it has small values and few references, which speeds up the
  #   background work triggered by the request
  expected_response = {
    'id': 'A003173',
    'name': 'Heegner numbers: imaginary quadratic fields with unique factorization (or class number 1).',
    'first': '1',
    'last': '9',
    'chunk_size': 1024
  }

class TestGetOEISHeadersNegative(abstract_endpoint_test.AbstractEndpointTest):
  endpoint = 'http://localhost:5000/api/get_oeis_header/A000521'
  
  # we choose A000521 because:
  # - it has a negative shift
  # - it has many long values, so a full data request would be very large
  expected_response = {
    'id': 'A000521',
    'name': 'Coefficients of modular function j as power series in q = e^(2 Pi i t). Another name is the elliptic modular invariant J(tau).',
    'first': '-1',
    'last': '10000',
    'chunk_size': 1024
  }


if __name__ == "__main__":
    unittest.main()
