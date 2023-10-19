# Install and configure PostgreSQL

Comprehensive instructions for PostgreSQL installation are unfortunately
beyond the current scope of this README, as they depend greatly on the
particulars of your operating system. You need to end up with a running
Postgres server on your machine that will accept localhost connections. You
can find detailed directions for the necessary PostgreSQL installation
on a fresh Ubuntu system in the last section of the
[Ubuntu installation instructions](install-ubuntu.md).

## Create a database

Once you are set up, it should be possible to use the
command `psql` to connect to a Postgres shell where you can create a
database for backscope. You should create a database with a name of your
choice; in the following steps we will use `<database name>` wherever you
need to insert your chosen name. Similarly, you will need to create a
user with a name of your choice, which we will refer to as
`<backscope database user>`. Note that it is perfectly permissible to have
the database and user names be the same, and may even be convenient to
do so since then invoking `psql` with that user will default to the
database of the same name.

You need to grant the backscope database user all permissions on the
database you create. You need to set up the authentication methods for
the backscope database user so that you can use the `-U` flag on `psql` to
specify that user (and it should prompt for the password). In the
[Ubuntu install instructions](install-ubuntu.md) you can see one sequence
of commands that will configure PostgreSQL properly.

Once the database and user are created and authentication and permissions are
configured properly, you can proceed to the next step.

## Set up your environment

This project uses python-dotenv. In order to detect your database
username / password, you must create a file called `.env` in the root
directory of your backscope installation, containing:

```
POSTGRES_USER="<backscope database user>"
POSTGRES_PASSWORD="<database password for that user>"
POSTGRES_DB="<database name>"
DATABASE_URI="postgresql://localhost/<database name>"
APP_ENVIRONMENT="development"
SECRET_KEY="Uneccessary for development"
```

To run tests, the `.env` file must also include:

```
POSTGRES_DISPOSABLE_DB="<disposable database name>"
```

:warning: **Beware:** running tests will clear the database `POSTGRES_DISPOSABLE_DB`. Other actions may also clear this database.

You can see other configuration options inside
[the config file](./flaskr/config.py).

## Configure the database

Note that in the following guide, commands that you would be
entering/executing are preceded by a `>` character (representing a generic
"shell prompt") whereas output that the commands would generate (which may
or may not be shown in detail, depending on context) is shown on lines
without a `>` character.

Also, if you are copying/typing these commands by hand, note that the `#`
character indicates a "shell comment." You don't need to enter this
character or anything that follows it on a line.

```
> python manage.py db init  # initializes tables inside database
```

The previous command might issue a message about editing
`alembic.ini`, which is safe to ignore. The default works fine. Then continue
with:

```
> python manage.py db migrate  # migrate data models
> python manage.py db upgrade  # upgrade changes to database
> psql -U <backscope database user> -d <database name>  # invokes data browser
db> \d
            List of relations
 Schema |      Name       | Type     | Owner 
--------+-----------------+----------+-------
 public | alembic_version | table    | <username for psql>
 public | sequences       | table    | <username for psql>
 public | user            | table    | <username for psql>
 public | user_id_seq     | sequence | <username for psql>
db> \q  # exits psql
```

Note that if you made the backscope database user name the same as the
database name, then the `psql` command above can be shortened to just
`psql -U <backscope database user>`.

You should now be ready to [run backscope](running-backscope.md).
