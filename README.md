# NumberscopeFlask



## Initial Setup

#### Python3 Setup

You will need:

- python3
- python3-pip
- virtualenv or anaconda or a virtual python package manager

Set up initial dependencies:

1. Source / create  your python environment:

   ```bash
   $ virtualenv -p python3 .venv # Create a new virtual env called .venv
   $ source .venv/bin/activate
   $ pip install -r requirements.txt
   ```

   If you use a different python package manager, install requirements through this instead

2. Install and configure postgresql and create an empty database

   Specific instructions for PostgreSQL installation are unfortunately beyond
   the current scope of this README, as they depend greatly on the particulars
   of the operating system you are using. You need to end up with a running
   postgresql server on your machine that will accept localhost connections
   with password/md5 authentication.

   Specifically, once you are set up, it should be possible to execute
   `psql -U <user name> -W -l` with some usre name, enter some password at
   the prompt, and be shown a list of databases. Depending on your setup, it
   may also be possible also to simply execute `psql -l`, and so in all of
   the examples below we drop the `-U <user name>` and `-W` options, but
   either or both may be necessary any time you invoke postgres
   command-line programs.

   The USERNAME and password that work for psql are the ones that you need to
   include in the `.env` file detailed in the next step.

   Finally, once the server is set up and running, pick a database_name, and
   execute:

   ```bash
   $ psql    # or perhaps psql -U <user name> -W
   # The <user name>=# at the beginning of the next line represents the
   # psql prompt; everything after that represents what you type:
   <user name>=# CREATE DATABASE <database_name>;
   CREATE DATABASE
   <user name>=# \q
   $
   ```

   You will need the database_name again for the .env file in the next step.

3. Setup your environment and initialize the database

   This project uses python-dotenv. In order to detect your database username / password, you must include a file called .env in the root of your directory. This file should contain:

   /home/path/to/numberscopeFlask/.env

   ```bash
   export APP_SETTINGS="config.DevelopmentConfig"
   export DATABASE_URI="postgresql://localhost/<database_name>"
   export SECRET_KEY="Uneccessary for development"
   export POSTGRES_USER="<user name for psql>"
   export POSTGRES_DB="<database_name>"
   export POSTGRES_PASSWORD="<user password for psql>"
   ```

   You can see various other configuration options inside ./flaskr/config.py

   Start your database and setup database access

   ```bash
   $ python3 manage.py db init # initializes tables inside database
   $ # Note the previous command will issue a message about editing
   $ # alembic.ini, which is safe to ignore - the default works fine
   $ python3 manage.py db migrate # migrate data models found in the project to database
   $ python3 manage.py db upgrade # Upgrade changes to database
   
   $ psql -d <database_name>
   db=# \d 
    Schema |      Name       |   Type   | Owner 
   --------+-----------------+----------+-------
    public | alembic_version | table    | theo
    public | user            | table    | theo
    public | user_id_seq     | sequence | theo
   
   db=# \q
   ```

   Currently there is one example user model in flaskr/nscope/models.py



### Running the application

---

Running this application only deals with flask (backend).

Currently the server is built on development mode.

```bash
$ python3 manage.py runserver
# Or
$ export FLASK_APP=flaskr
$ flask run
```

This should print a series of messages starting with
"Serving Flask app 'flaskr'" and ending with debugger information. One of these
messages should be the URL the server is running on, typically
`http://127.0.0.1:5000/`. To test that the server is working correctly,
try visiting "<URL>/api/get_oeis_values/A000045/50" (substitute in the server
URL for "<URL>" -- this should display the first 50 terms of the sum recurrence.

## Resetting the database

If you need to clear out the entire database and start from scratch -- for
example, when pulling a commit that modifies the database schema -- the easiest
thing to do is delete the database and reinitialize an empty database.
An example session for this is below; make sure before executing these
commands that you have activated the virtual environment (venv) for the
backscope project.

```bash
# From the top-level backscope directory:
$ dropdb <database_name>    # or dropdb -U <user name> -W <database_name>
$ createdb <database_name>  # may need the same options as well
$ rm -r migrations
# As above, the next command will give an ignorable message about alembic.ini
$ python3 manage.py db init
$ python3 manage.py db migrate
$ python3 manage.py db upgrade
```

Now you should again be ready to run the backscope server.

## Endpoints

This section documents all of the endpoints provided by the backscope server.
All of them return JSON data with the specified keys and values. Also, every
endpoint includes the key 'id' with value the OEIS id for the sake of verifying
that it is the data as requested. In case of an OEIS_ID that does not match
anything in the OEIS, an error string is returned. Note that the angle brackets
<> in the URLS indicate where subsitutions are made, they should not be present
in the URLs actually used.

Also note that if any of the requests are made for a given sequence, then the
back end will in the background obtain all of the data necessary to respond
to all of the endpoints for future requests concerning that sequence without
going back to the OEIS.

### URL: api/get_oeis_values/<OEIS_ID>/<COUNT>

This is the most rapid endpoint, it makes at most one request to the OEIS server
(and only if the OEIS_ID has not previously been requested).

#### Key: name

A string giving the official name of the OEIS sequence with id OEIS_ID,
if already known to backscope, or a temporary name if not.

#### Key: values

An array of _strings_ (of digits) giving the first COUNT values of the sequence
with id OEIS_ID. Since some sequence values correspond to extremely large
numbers, strings are used to avoid the limitations of any particular numeric
datatype.

### URL: api/get_oeis_name_and_values/<OEIS_ID>

Potentially a bit slower than the above URL, it may make an extra request to
ensure that the name is correct.

#### Key: name

A string giving the official name of the OEIS sequence with id OEIS_ID

#### Key: values

An array of strings (of digits) giving all values of the sequence with id
OEIS_ID known to the OEIS.

### URL: api/get_oeis_metadata/<OEIS_ID>

A potentially very slow endpoint (if the sequence is unknown to the backscope);
may make hundreds of requests to the OEIS to generate all of the back
references to the sequence.

#### Key: name

A string giving the official name of the OEIS sequence with id OEIS_ID

#### Key: xrefs

A string which is the concatenation (separated by newlines) of all of the
OEIS text "xref" records for the sequence with id OEIS_ID.

#### Key: backrefs

An array of strings giving all OEIS ids that mention the given OEIS_ID.

## Other information about the backscope project

### Description of Directories:

---

##### migrations

Auto generated

##### manage.py

The main entry point into the application

The main usage from this file is:

```bash
$ python3 manage.py db init
$ python3 manage.py db migrate
$ python3 manage.py db upgrade

$ python3 manage.py runserver
```

Any other target may be considered for future development

##### api.log

The log file for the flask application

an example logging statment is shown below in python3

``` python3
 app.logger.info('%s logged in successfully', user.username)
```

Logging levels are set in flaskr/config.py

Refer to https://flask.palletsprojects.com/en/1.1.x/logging/ for more information



##### flaskr

Flaskr is the main application. It contains all entry points to the application. \__init\__.py contains all the application macros.



##### flaskr/\_\_init\_\_.py

The primary file for all application macros



##### flaskr/config.py

The configuration directory for all macro config options. Generally development mode is being used.



##### flaskr/nscope

The nscope api python module. This contains numberscope endpoints and blueprints and models



##### flaskr/nscope/\_\_init\_\_.py

The main entry point to nscope, containing the blueprint for numberscope (imported in \_\_init\_\_.py in flaskr)



##### flaskr/nscope/models.py

Database models. See the example for how to define models as well as https://flask-sqlalchemy.palletsprojects.com/en/2.x/models/



##### flaskr/nscope/views.py

The primary blueprint for numberscope. This is the main application. Note that currently, there is only one endpoint (vuetest). But refer to the documentation within views on how to create a new route.





### WSGI Setup

WSGI is setup on the production server. all wsgi instances and configurations are neglected in the github repository for security.

Documentation is in progress.



On the server, you may manage the status of the application by the systemd entry point for numberscope



```bash
$ sudo systemctl status numberscopeFlask.service
```



Numberscope is serving both index.html as well as the numberscope api routes declared inside flask.

