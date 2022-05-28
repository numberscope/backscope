"""
Manages Resources and runs server / database
"""

import os
import sys

from flask_script import Manager
from flask_migrate import Migrate, MigrateCommand

from flaskr import create_app, db

app = create_app()

migrate = Migrate(app, db)
manager = Manager(app)

manager.add_command('db', MigrateCommand)

if __name__ == '__main__':
    if sys.argv[1] == 'runserver':
        print('''

Copyright 2020-2022 Regents of the University of Colorado.

This project is licensed under the
[MIT License](https://opensource.org/licenses/MIT). See LICENSE.md.

             ''')
    manager.run()

