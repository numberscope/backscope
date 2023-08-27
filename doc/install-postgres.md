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
database for backscope. You should be able to use the `-U` flag to
specify a user who has the correct permissions to access the Postgres
shell and create a database. Presuming so, execute the following commands.
Note that you may choose the database name as you like; you simply
must be sure to use the same name in the appropriate place in the next step.


```
psql -U <username for psql>
<username>=# CREATE DATABASE <database name>;
CREATE DATABASE
<username>=# \q
```

### Set up your environment

This project uses python-dotenv. In order to detect your database
username / password, you must create a file called `.env` in the root
directory of your backscope installation, containing:

```
POSTGRES_USER="<username for psql>"
POSTGRES_PASSWORD="<password for psql>"
POSTGRES_DB="<database name>"
DATABASE_URI="postgresql://localhost/<database name>"
APP_ENVIRONMENT="development"
SECRET_KEY="Uneccessary for development"
```

You can see other configuration options inside
[the config file](./flaskr/config.py).

### Configure the database

```
python manage.py db init # initializes tables inside database
```

The previous command might issue a message about editing
`alembic.ini`, which is safe to ignore. The default works fine. Then continue
with:

```
python manage.py db migrate # migrate data models
python manage.py db upgrade # upgrade changes to database
psql -U <username for psql> -d <database name>
db=# \d
            List of relations
 Schema |      Name       | Type     | Owner 
--------+-----------------+----------+-------
 public | alembic_version | table    | <username for psql>
 public | sequences       | table    | <username for psql>
 public | user            | table    | <username for psql>
 public | user_id_seq     | sequence | <username for psql>
db=# \q
```

You should now be ready to [run backscope](running-backscope.md).
