# Writing and running tests

Backscope uses the [`unittest`](https://docs.python.org/3/library/unittest.html) framework for testing.

## Running tests

1. Go into the top-level directory of the Backscope repository.
2. Activate the Backscope virtual environment.
   + If you're using [`venv`](https://docs.python.org/3/library/venv.html) to manage virtual environments, and you've put Backscope's virtual environment in a directory called `.venv`, use the command ``source .venv/bin/activate` to activate.
3. Call `python -m unittest`
   + To see all of the tests, and their outcomes, call `python -m unittest -v`
4. If a test fails, the output will look something like this:
```
python -m unittest -v
test_get_oeis_values (flaskr.nscope.test.test_get_oeis_values.TestGetOEISValues) ... 
  Testing response
  Waiting for background work
  Background work done
FAIL

======================================================================
FAIL: test_get_oeis_values (flaskr.nscope.test.test_get_oeis_values.TestGetOEISValues)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "/home/aaron/Documents/code/backscope/flaskr/nscope/test/test_get_oeis_values.py", line 69, in test_get_oeis_values
    self.assertDictEqual(response.json, expected_json)
AssertionError: {'id'[61 chars]': {'0': '1', '1': '2', '2': '4', '3': '8', '4[83 chars]32'}} != {'id'[61 chars]': {'1': '1', '2': '2', '3': '4', '4': '8', '5[84 chars]32'}}
Diff is 1082 characters long. Set self.maxDiff to None to see it.

----------------------------------------------------------------------
Ran 1 test in 0.898s

FAILED (failures=1)
```