"""
Manages Resources and runs server / database
"""

import os
import sys
import unittest

from flask_script import Manager
from flask_migrate import Migrate, MigrateCommand

from flaskr import create_app, db

app = create_app()

migrate = Migrate(app, db)
manager = Manager(app)

manager.add_command('db', MigrateCommand)

# this is a wrapper for 'unittest discover', and the help messages are copied
# from there
#   https://docs.python.org/3/library/unittest.html#test-discovery
@manager.option('-v', '--verbose', dest='verbosity',
  action='store_const', const=2, default=1,
  help='Verbose output'
)
@manager.option('-s', '--start-directory', dest='start_dir', default='.',
  help='Directory to start discovery (. default)'
)
@manager.option('-p', '--pattern', dest='pattern', default='test*.py',
  help='Pattern to match test files (test*.py default)'
)
@manager.option('-t', '--top-level-directory', dest='top_level_dir',
  help='Top level directory of project (defaults to start directory)'
)
def test(verbosity, start_dir, pattern, top_level_dir):
  test_suite = unittest.defaultTestLoader.discover(
    start_dir=start_dir,
    pattern=pattern,
    top_level_dir=top_level_dir
  )
  unittest.TextTestRunner(verbosity=verbosity).run(test_suite)

if __name__ == '__main__':
    if sys.argv[1] == 'runserver':
        print('''

Copyright 2020-2022 Regents of the University of Colorado.

This project is licensed under the
[MIT License](https://opensource.org/licenses/MIT). See LICENSE.md.

             ''')
    manager.run()

