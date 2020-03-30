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

2. Setup your database and environment

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
   $ sudo systemctl start postgresql
   $ python3 manage.py init # initializes tables inside database
   $ python3 manage.py migrate # migrate data models found in the project to database
   $ python3 manage.py upgrade # Upgrade changes to database
   
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

