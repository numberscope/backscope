import unittest
from flaskr import create_app, db, clear_database
from structlog.testing import capture_logs


class LoggingTest(unittest.TestCase):
  expected_capture = [{'event': 'Error message', 'log_level': 'error'}]
  
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
    with capture_logs() as capture:
      self.app.structlogger.error('Error message')
      self.assertEqual(capture, self.expected_capture)


if __name__ == "__main__":
    unittest.main()
