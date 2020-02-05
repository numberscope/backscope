from flask import Flask

app = Flask(__name__)

import routes

if __name__ == '__main__':
    app.run()

