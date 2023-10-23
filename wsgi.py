import click
import unittest
from flaskr import create_app

app = create_app()

# this is a wrapper for 'unittest discover', and the help messages are copied
# from there
#   https://docs.python.org/3/library/unittest.html#test-discovery
@app.cli.command()
@click.option('-v', '--verbose', 'verbosity',
  count=True, default=0,
  help='Verbose output'
)
@click.option('-s', '--start-directory', 'start_dir', default='.',
  help='Directory to start discovery (. default)'
)
@click.option('-p', '--pattern', 'pattern', default='test*.py',
  help='Pattern to match test files (test*.py default)'
)
@click.option('-t', '--top-level-directory', 'top_level_dir',
  help='Top level directory of project (defaults to start directory)'
)
def test(verbosity, start_dir, pattern, top_level_dir):
  test_suite = unittest.defaultTestLoader.discover(
    start_dir=start_dir,
    pattern=pattern,
    top_level_dir=top_level_dir
  )
  unittest.TextTestRunner(verbosity=verbosity+1).run(test_suite)
