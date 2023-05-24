Database Migrations
===================

We use an object relational mapper called SQLAlchemy (the package is
Flask SQLAlchemy) to describe the data we want to store in the database,
and it does the heavy lifting of interacting with the database.
Normally, you'd have to write SQL queries to insert and extract data
from the database, but ORMs abstract that work away from the developer.

When you change the data you want to store in your database (e.g. you
change the name of a variable), you have to "migrate" (change) the
database to conform to your new data.

Flask-Migrate is an extension that handles SQLAlchemy database
migrations for Flask applications using Alembic. The database operations
are made available through the Flask command-line interface.

How to migrate and update your database
---------------------------------------

### Run the `migrate` script

> The migration script needs to be reviewed and edited, as Alembic is
> not always able to detect every change you make to your models. In
> particular, Alembic is currently unable to detect table name changes,
> column name changes, or anonymously named constraints. A detailed
> summary of limitations can be found in the Alembic autogenerate
> documentation. Once finalized, the migration script also needs to be
> added to version control.

```
flask db migrate -m "Your migration message goes here."
```

### Run the `update` script

Apply the changes described by the migration script to your database:

```
flask db upgrade
```

First-time setup
----------------

If you don't have a migrations directory (you should because it's
tracked in version control), you can create it by entering the following
command:

```
flask db init
```

More help
---------

To see the commands you can run:

```
flask db --help
```

For more documentation on Flask-Migrate, see
https://flask-migrate.readthedocs.io/en/latest/.