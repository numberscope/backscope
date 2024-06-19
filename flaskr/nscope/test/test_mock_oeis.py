import flaskr.nscope.test.abstract_mock_oeis_test as abstract_mock_oeis_test

class TestMockOEIS(abstract_mock_oeis_test.AbstractMockOEISTest):
  endpoint = 'http://localhost:5000/api/get_oeis_values/A153080/12'
  expected_response = {
    'id': 'A153080',
    'name': 'A153080 [name not yet loaded]',
    'values': {
      '0': '2',
      '1': '15',
      '2': '28',
      '3': '41',
      '4': '54',
      '5': '67',
      '6': '80',
      '7': '93',
      '8': '106',
      '9': '119',
      '10': '132',
      '11': '145'
    }
  }
  updated_expected_response = expected_response.copy()
  updated_expected_response['name'] = 'a(n) = 13*n + 2.'

  # we override the `test_endpoint` method because the default implementation
  # uses a fixed response, but we need to allow two different responses: one
  # with a placeholder sequence name, and one with the actual sequence name
  # included. by overriding, we also avoid having to handle JSON responses in
  # the default implementation
  def test_endpoint(self):
    self.waitUntilReady()
    with self.app.test_client() as client:
      if self.verbose:
        print("  Testing response")
      response = client.get(self.endpoint)
      self.assertEqual(response.status_code, 200)
      if (
        'name' in response.json
        and response.json['name'] == self.updated_expected_response['name']
      ):
        self.assertDictEqual(response.json, self.updated_expected_response)
      else:
        self.assertDictEqual(response.json, self.expected_response)


if __name__ == "__main__":
  unittest.main()