import unittest
import flaskr.nscope.test.abstract_endpoint_test as abstract_endpoint_test


class TestSearchOEIS(abstract_endpoint_test.AbstractEndpointTest):
  endpoint = 'http://localhost:5000/api/search_oeis/germain'
  
  expected_response = {
    'term': 'germain',
    'results': [
      ['A005384', 'Sophie Germain primes p: 2p+1 is also prime.'],
      ['A059455', 'Safe primes which are also Sophie Germain primes.'],
      ['A111153',
       'Sophie Germain semiprimes: semiprimes n such that '
       + '2n+1 is also a semiprime.'],
      ['A059452', 'Safe primes (A005385) that are not Sophie Germain primes.'],
      ['A156660', 'Characteristic function of Sophie Germain primes.'],
      ['A111206',
       'Semi-Sophie Germain semiprimes: semiprimes which are the product '
       + 'of Sophie Germain primes.'],
      ['A209253',
       'Number of ways to write 2n-1 as the sum of a Sophie Germain prime '
       + 'and a practical number.'],
      ['A124174',
       'Sophie Germain triangular numbers tr: 2*tr+1 is also a '
       + 'triangular number.'],
      ['A157342',
       'Semiprimes that are the product of two non-Sophie Germain primes.'],
      ['A156874', 'Number of Sophie Germain primes <= n.'],
    ]
  }

if __name__ == "__main__":
    unittest.main()
