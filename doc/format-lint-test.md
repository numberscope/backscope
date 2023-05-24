Formatting, Linting, and Testing
================================

### Formatting

To auto-format your code, enter the following command from the root
of the backscope directory:

```
black .
```

(The virtual environment directory used to be named `.venv`, but we
renamed it to `venv` so that files inside that directory would be
ignored by the formatter or the linter, I (Liam) can't remember which.)

### Linting

To lint your code, enter the following command from the root
of the backscope directory:

```
ruff check .
```

### Testing

#### Seed the database before you run your tests

Before you run the tests suite for the first time, you should seed
your database with data for the A000001 sequence. To do this, hit the
API routes for the sequence object, values, and metadata in that order.
It is important to do this because at least one test (as of this
writing, only the `test_get_oeis_sequence` test) assumes there is data
in the database. (Otherwise it wouldn't be able to test much.)

If you don't seed your database with data for the A000001 sequence,
right now it is possible to make all the tests pass by simply running
the tests suite again. However, this might change if future tests assume
the presence of data before the database is seeded.

To run the tests suite, enter the following command from the root
of the backscope directory:

```
pytest
```