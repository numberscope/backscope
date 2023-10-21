# a mimimal Flask app
#   https://flask.palletsprojects.com/en/2.3.x/quickstart/

from flask import Flask

app = Flask(__name__)

_content = '''
<html>
  <head>
    <title>The Mock On-Line Encyclopedia of Integer Sequences&#x1F61D; (MOEIS&#x1F61D;)</title>
  </head>
  <body>
    <p>Last modified October 21 lunchtime 2023. Contains 0 sequences. (Running on moeis0.)</p>
  </body>
</html>
'''

@app.route("/")
def hello():
  return _content