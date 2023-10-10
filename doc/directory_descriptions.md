# Description of directories

As of 2022-11-01, this document might be outdated.

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

```python3
 app.logger.info('%s logged in successfully', user.username)
```

Logging levels are set in flaskr/config.py

Refer to https://flask.palletsprojects.com/en/1.1.x/logging/ for more information

##### flaskr

Flaskr is the main application. It contains all entry points to the application. \_\_init\_\_.py contains all the application macros.

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
