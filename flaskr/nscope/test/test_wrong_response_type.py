import flaskr.nscope.test.abstract_mock_oeis_test as abstract_mock_oeis_test

class TestUnavailableValues(abstract_mock_oeis_test.AbstractMockOEISTest):
  values_available = False
  endpoint = 'http://localhost:5000/api/get_oeis_values/A153080/12'
  expected_response = 'Error: 503 Server Error: SERVICE UNAVAILABLE for url: http://localhost:5001/A153080/b153080.txt'


class TestUnavailableValuesInNameAndValues(abstract_mock_oeis_test.AbstractMockOEISTest):
  values_available = False
  endpoint = 'http://localhost:5000/api/get_oeis_name_and_values/A153080'
  expected_response = 'Error: 503 Server Error: SERVICE UNAVAILABLE for url: http://localhost:5001/A153080/b153080.txt'


class TestUnavailableSearchInNameAndValues(abstract_mock_oeis_test.AbstractMockOEISTest):
  search_available = False
  endpoint = 'http://localhost:5000/api/get_oeis_name_and_values/A153080'
  expected_response = 'Error: 503 Server Error: SERVICE UNAVAILABLE for url: http://localhost:5001/search?id=A153080&fmt=json'

class TestUnavailableSearch(abstract_mock_oeis_test.AbstractMockOEISTest):
  search_available = False
  endpoint = 'http://localhost:5000/api/get_oeis_metadata/A153080'
  expected_response = 'Error: 503 Server Error: SERVICE UNAVAILABLE for url: http://localhost:5001/search?q=A153080&fmt=json'