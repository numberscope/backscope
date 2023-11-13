# Resetting the database

## Clear the stored data, but keep the database structure

Backscope caches data about every sequence that's been requested. You may find yourself in a situation where that stored data is causing a problem. For example:

- You're working on code that only runs when Backscope downloads data from the OEIS. To try your code on a particular sequence, you need to make sure the sequence isn't cached already.
- A bug in your code has left certain data flagged, incorrectly, as a download in progress. Backscope won't clear the flag until the download finishes, and it won't start the download if the flag is set.

In a situation like this, you don't need to wipe out the whole database structure; it's enough to clear the data stored inside that structure. Here's how to do it:

1. Activate Backscope's virtual environment, if it's not active already.
   + For example, if you're using [`venv`](https://docs.python.org/3/library/venv.html) and you've put the virtual environment in `.venv`, call `source .venv/bin/activate`.
2. Clear the database by calling `flask clear-database`.

:warning: **Beware:** this will clear the database named by the `POSTGRES_DB` variable in the `.env` file.

## Wipe out the whole database structure and build a fresh database from scratch

More rarely, you may find yourself in a situation where the structure of the database is causing a problem, which can't be solved just by clearing the contents of the database. For example:

- You just wrote or checked out a version of Backscope that uses a different database schema.

In a situation like this, it's often easiest to wipe out the whole database structure and build a new database from scratch, as if you're setting up Backscope for the first time. Here's how to do it:

1. Activate Backscope's virtual environment, if it's not active already.
   + For example, if you're using [`venv`](https://docs.python.org/3/library/venv.html) and you've put the virtual environment in `.venv`, call `source .venv/bin/activate`.
2. Erase every trace of the database from your global PostgreSQL instance by calling:
   ```bash
   dropdb <database name>
   ```
   Typically, `<database name>` should match the `POSTGRES_DB` variable in the `.env` file.
3. Forget local information about past migrations by removing or renaming the `migrations` folder in the top level of the Backscope repository.
4. Create a new database and furnish it with the Backscope database structure by calling:
   ```bash
   createdb <database name>
   flask db init
   flask db migrate
   flask db upgrade
   ```

:warning: **Beware:** steps 2–3 will wipe out the entire structure and contents of the database `<database name>`.