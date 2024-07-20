# Write and run tests

## Write tests

### Basics

Backscope uses the [`unittest`](https://docs.python.org/3/library/unittest.html) framework for testing.

Tests are kept in the [`flaskr/nscope/test`](../flaskr/nscope/test) directory. The test routine opens all the files with names matching `test*.py`, pulls out all the classes that descend from `unittest.TestCase`, and runs all the tests those classes describe. You can use the `@unittest.skip()` decorator to skip tests.

Using the [mock OEIS](mock-oeis.md), you can test Backscope's response to OEIS behavior that we can't or shouldn't replicate at will using real OEIS API calls.

### Examples

The file [`trivial_test.py`](../flaskr/nscope/test/trivial_test.py) contains a minimal example of a test: the test that always passes. This test isn't worth running, so we gave it a file name that the test routine will ignore.

The file [`abstract_endpoint_test.py`](../flaskr/nscope/test/abstract_endpoint_test.py) contains an abstract test&mdash;a class that describes a whole family of tests. The concrete tests in [`test_get_oeis_values.py`](../flaskr/nscope/test/test_get_oeis_values.py) descend from it. The abstract test can't be run, so we gave it a file name that the test routine will ignore.

The file [`test_mock_oeis.py`](../flaskr/nscope/test/test_mock_oeis.py) contains a basic example of a test that uses the mock OEIS. See the [mock OEIS documentation](mock-oeis.md) for more details.

## Set up for testing

### Create a disposable database

Before you can run tests, you need to create a disposable database and give `<backscope database user>` all permissions on it. We'll use `<disposable database name>` to stand for whatever you name it.

For guidance, consult the generic instructions on how to [create a database](install-postgres.md#create-a-database), or the Ubuntu-specific instructions on how to create a database when you [install and configure PostgreSQL](install-ubuntu.md#install-and-configure-postgresql) under Ubuntu.

Unlike the main database, the disposable database doesn't need to be configured.

### Specify the disposable database in your environment

Add the line

```
POSTGRES_DISPOSABLE_DB="<disposable database name>"
```

to your `.env` file.

:warning: **Beware:** running tests will clear the database `POSTGRES_DISPOSABLE_DB`, **and** leave it in a state in which it cannot be used for regular serving of sequence data. Other actions may also clear this database.

For guidance, consult the basic instructions on how to [set up your environment](install-postgres.md#set-up-your-environment). If you're indecisive, put the line that specifies the disposable database just after the one that specifies the main database.

## Run tests

### Call the test routine

1. Go into the top-level directory of the Backscope repository.
2. Activate the Backscope virtual environment.
   + If you're using [`venv`](https://docs.python.org/3/library/venv.html) to manage virtual environments, and you've put Backscope's virtual environment in a directory called `.venv`, use the command `source .venv/bin/activate` to activate.
3. Execute the command `flask test`.
   + In quiet mode, you'll see a string of characters representing passed (`.`), failed (`F`), and skipped (`s`) tests.
   + To see the tests' names as well as their outcomes, execute `flask test -v` or `flask test --verbose`.
   + This command is a wrapper for `python -m unittest [-v]` and `python -m unitpytest discover [-v] [-s START] [-p PATTERN] [-t TOP]`. For more options, call `unittest` or `unittest discover` directly.

### Look at the test output

Here are some examples of what test results can look like.

:arrow_down: The `..` below tells us that both tests passed.

```
> flask test
..
----------------------------------------------------------------------
Ran 2 tests in 1.650s

OK
```

:arrow_down: The `s.` below tells us that one test was skipped and the other passed. Running in verbose mode may print an explanation of why we're skipping the test. This message is passed to the `@unittest.skip()` decorator.

```
> flask test
s.
----------------------------------------------------------------------
Ran 2 tests in 0.934s

OK (skipped=1)
```

:arrow_down: The `F.` below tells us that one test failed and the other passed. A report from the failed test follows.

```
> flask test
F.
======================================================================
FAIL: test_endpoint (flaskr.nscope.test.test_get_oeis_values.TestGetOEISValues)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "/home/aaron/Documents/code/backscope/flaskr/nscope/test/abstract_endpoint_test.py", line 65, in test_endpoint
    self.assertDictEqual(response.json, self.expected_response_json)
AssertionError: {'id'[61 chars]': {'0': '1', '1': '2', '2': '4', '3': '8', '4[83 chars]32'}} != {'id'[61 chars]': {'1': '1', '2': '2', '3': '4', '4': '8', '5[84 chars]32'}}
Diff is 1082 characters long. Set self.maxDiff to None to see it.

----------------------------------------------------------------------
Ran 2 tests in 1.631s

FAILED (failures=1)
```

:arrow_down: Testing in verbose mode, like below, shows the tests' names as well as their outcomes.

```
> flask test -v
test_endpoint (flaskr.nscope.test.test_get_oeis_values.TestGetOEISValues) ... 
  Testing response
  Waiting for background work
  Background work done
ok
test_endpoint (flaskr.nscope.test.test_get_oeis_values.TestGetOEISValuesWithoutShift) ... 
  Testing response
  Waiting for background work
  Background work done
ok

----------------------------------------------------------------------
Ran 2 tests in 2.556s

OK
```
