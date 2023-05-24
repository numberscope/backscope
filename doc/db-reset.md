Resetting the database
======================

If you need to clear out the entire database and start from scratch — for
example, when pulling a commit that modifies the database schema — the easiest
thing to do is delete the database and reinitialize an empty database.
An example session for this is below; make sure before executing these
commands that you have activated the virtual environment
(`source venv/bin/activate`) for the backscope project.

```
dropdb <database_name>
createdb <database_name>
rm -rf migrations
flask db init
flask db migrate
flask db upgrade
```