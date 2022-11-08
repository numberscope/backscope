# Numberscope - backscope

Copyright 2020-2022 Regents of the University of Colorado.

This project is licensed under the
[MIT License](https://opensource.org/licenses/MIT). See the text of the MIT
License in LICENSE.md.

## What is backscope?

backscope is [Numberscope's](https://numberscope.colorado.edu) back end. It is
responsible for getting sequences and other data from the [On-Line Encyclopedia
of Integer Sequences](https://oeis.org).

## Set up backscope

### Install Python

You need a version of Python at least equal to 3.5. (If you don't have
Python, install the latest stable version.) By installing a version of
Python greater than or equal to 3.5, you should get the package
installer for Python (`pip`) and a working `venv` module for creating a
virtual environment.

To check to see your Python version, issue the following command:

```shell
python --version
```

The output should be something like "Python 3.10.8". If you see a message about
not being able to find Python, or you don't see any output, you need to
troubleshoot your Python installation.

Depending on how you installed Python, the executable might be named `python3`.
In that case, issue the following command:

```shell
python3 --version
```

To check to see if you have a working `venv` module, issue the following
command (substituting `python3` if necessary):

```shell
python -m venv -h
```

You should see help for the `venv` module.

### Create a virtual environment and install dependencies

1. Create your virtual environment:

   ```bash
   python -m venv .venv # create a new virtual env called .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   pip install --force cypari2
   ```

2. Install and configure PostgreSQL and create an empty database:

   Specific instructions for PostgreSQL installation are unfortunately beyond
   the current scope of this README, as they depend greatly on the particulars
   of your operating system. You need to end up with a running
   Postgres server on your machine that will accept localhost connections.

   Specifically, once you are set up, it should be possible to use the command
   `psql` to connect to a Postgres shell where you can create a database for
   backscope. You should be able to use the `-U` flag to specify a user who
   has the correct permissions to access the Postgres shell and create a database.

   ```bash
   psql -U <username for psql>
   <username>=# CREATE DATABASE <database name>;
   CREATE DATABASE
   <username>=# \q
   ```

3. Set up your environment and initialize the database:

   This project uses python-dotenv. In order to detect your database
   username / password, you must create a file called `.env` in the root
   of your directory containing:
   ```
   export APP_SETTINGS="config.DevelopmentConfig"
   export DATABASE_URI="postgresql://localhost/<database name>"
   export SECRET_KEY="Uneccessary for development"
   export POSTGRES_USER="<username for psql>"
   export POSTGRES_DB="<database name>"
   export POSTGRES_PASSWORD="<password for psql>"
   ```
   You can see other configuration options inside
   [the config file](./flaskr/config.py).

4. Configure the database:

   ```bash
   python manage.py db init # initializes tables inside database
   ```
   
   The previous command will issue a message about editing
   `alembic.ini`, which is safe to ignore. The default works fine.

   ```bash
   python manage.py db migrate # migrate data models
   python manage.py db upgrade # upgrade changes to database
   psql -d <database name>
   db=# \d
    Schema |      Name       |   Type   | Owner
   --------+-----------------+----------+--------------------
    public | alembic_version | table    | <username for psql>
    public | user            | table    | <username for psql>
    public | user_id_seq     | sequence | <username for psql>
   db=# \q
   ```

## Run backscope

Option 1:
```bash
python manage.py runserver
```

Option 2:
```bash
export FLASK_APP=flaskr
flask run
```

This should print a series of messages. One of these
messages should be the URL the server is running on, typically
`http://127.0.0.1:5000/`. To test that the server is working correctly,
try visiting `<URL>/api/get_oeis_values/A000030/50` (substitute in the server
URL for `<URL>`). This should display the first digits of the numbers from
0 through 49.

## More information

### General

- [API Endpoints](./doc/api_endpoints.md)
- [Directory Descriptions](./doc/directory_descriptions.md)
- [Resetting the Database](./doc/resetting-the-database.md)

### Administering the production backscope instance

- [Update Backscope](./doc/update-backscope.md)
- [Server Administration](./doc/server-administration.md)
- [Database Administration](./doc/database-administration.md)
- [server Directory README](./server/README.md)

