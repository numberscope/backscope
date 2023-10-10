import unittest
import requests
import json


class TestGetOEISValues(unittest.TestCase):
    def test_get_oeis_values(self):
        endpoint = "http://127.0.0.1:5000/api/get_oeis_values/A000396/10"
        actual = requests.get(endpoint).json()
        expected = {
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
        self.assertDictEqual(actual, expected)


if __name__ == "__main__":
    unittest.main()
