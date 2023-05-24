Install and configure PostgreSQL
================================

Comprehensive instructions for PostgreSQL installation are unfortunately
beyond the current scope of this README, as they depend greatly on the
particulars of your operating system. You need to end up with a running
Postgres server on your machine that will accept localhost connections.

Specifically, once you are set up, it should be possible to use the
command `psql` to connect to a Postgres shell where you can create a
database for backscope. You should be able to use the `-U` flag to
specify a user who has the correct permissions to access the Postgres
shell and create a database.

```
psql -U <username for psql>
<username>=# CREATE DATABASE <database name>;
CREATE DATABASE
<username>=# \q
```

### Set up your environment and initialize the database

This project uses python-dotenv. In order to detect your database
username / password, you must create a file called `.env` in the root
of your directory containing:

```
DB_PASSWORD="<password for psql>"
DB_URI=postgresql://localhost/backscope
DB_USER="<username for psql>"
LOG_FILE_NAME=api.log
OEIS_URL=https://oeis.org/
```

### Configure the database

```
flask db init # initializes tables inside database
```

The previous command might issue a message about editing
`alembic.ini`, which is safe to ignore. The default works fine.

```
flask db migrate # migrate data models
flask db upgrade # upgrade changes to database
psql -U <username for psql> -d <database name>
db=# \d
            List of relations
 Schema |      Name       | Type  | Owner 
--------+-----------------+-------+-------
 public | alembic_version | table | <owner>
 public | sequences       | table | <owner>
db=# \q
```

### Database migrations

For further instructions on database migrations, see
[this doc](db-migrations.md).