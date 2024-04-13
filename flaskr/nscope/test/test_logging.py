from structlog.testing import capture_logs
import unittest

from flaskr import create_app, db, clear_database


class LoggingTest(unittest.TestCase):
  expected_log_output = [{'log_level': 'error', 'event': 'Error message'}]

  def setUp(self):
    self.app = create_app('testing')
    self.ctx = self.app.app_context()
    with self.ctx:
      clear_database()

  def tearDown(self):
    # clear database
    db.session.remove()
    with self.ctx:
      db.drop_all()

  def test_logging(self):
    with capture_logs() as log_output:
      self.app.structlogger.error('Error message')
      self.assertEqual(log_output, self.expected_log_output)


if __name__ == "__main__":
    unittest.main()
