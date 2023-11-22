# Testing with the mock OEIS

## Purpose

We need a mock OEIS to [test](tests.md) Backscope's response to OEIS behavior that we can't or shouldn't replicate at will using real OEIS API calls. Examples include throttling and site outages.

## Interaction

### Manual

The mock OEIS is a Flask app, just like Backscope. You can launch it on a development server by calling
```
flask --app mock_oeis run
```
from the top-level of the Backscope repository.

### Automated tests

The class [`TestMockOEIS`](../flaskr/nscope/test/test_mock_oeis.py) provides a basic example of how to use the mock OEIS in automated tests. This test should pass as long as all others pass and the mock OEIS is working, so it serves as a test of the mock OEIS itself.

:pencil2: **To do:** write an abstract mock OEIS test, in the spirit of [`AbstractEndpointTest`](../flaskr/nscope/test/abstract_endpoint_test.py). Then, go back and simplify `TestMockOEIS`.

## API

### Overview

The mock OEIS API is designed to mirror certain real OEIS API calls. The endpoint URLs are the same except for the scheme, host, and port, so you can replace the real OEIS with the mock OEIS in testing by passing the `oeis_scheme` and `oeis_hostport` parameters to [`flaskr.create_app`](../flaskr/__init__.py). For example, if you're running the mock OEIS locally on port 5000, the real OEIS search call
```
https://oeis.org/search?q=A153080&fmt=json
```
is mirrored by
```
http://localhost:5000/search?q=A153080&fmt=json
```
To minimize moving parts, the mock OEIS responses are hard-coded. They're stored in [`mock_oeis/data`](../mock_oeis/data).

### Available data

Each available endpoint has data for the following sequences:

- `A153080`
- `A321580`

Asking for data that's not available, or not available in the desired format, will typically lead to a 404 or 400 error response.

### Available endpoints

You can replace `A153080` with any other of the available sequences listed above.

- **B-file**: `/A153080/b153080.txt`
   - The sequence numbers have to match
- **Search**: `/search?q=A153080&fmt=json`
   - Only JSON data is available