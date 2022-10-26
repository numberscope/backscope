# Tests

Since Flask's documentation recommends using Pytest, our project decided to use
Pytest as our testing framework.

1. To get started writing Pytest tests for general Python code,
   see [these docs](https://docs.pytest.org/en/7.2.x/getting-started.html).
2. To get started writing Pytest tests for Flask code, check
   out [these docs](https://flask.palletsprojects.com/en/2.2.x/testing/).

## Where should I put my tests?

Suppose there is code in `mod1.py` in the `foo` Python package† you need to
test:

```
foo/
  |_ __init__.py
  |_ mod1.py
  |_ mod2.py
```

You should create a `tests` Python package in the `foo` Python package.

```
foo/
  |_ tests/
  |_ __init__.py
  |_ mod1.py
  |_ mod2.py
```

Within the `tests` Python package, Pytest expects you to name your test
files `test_filename.py` or `filename_test.py`. In this project, we prefer
the former `test_filename.py` convention.

```
foo/
  |_ tests/
    |_ __init__.py
    |_ test_mod1.py
  |_ __init__.py
  |_ mod1.py
  |_ mod2.py
```

Within `test_mod1.py`, Pytest expects you to start all test functions
with `test_`. At this point, you should refer to (1) the general Pytest docs
or (2) the Flask testing docs.

### † What is a Python package?

A Python package is a directory with an `__init__.py` file in it.

## How do I run tests?

Make sure your virtual environment is activated (`source .venv/bin/activate` or
whatever the equivalent command is for your shell), then from the root of
backscope, issue the command `pytest`.