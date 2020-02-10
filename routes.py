from run import app
from flask import render_template, url_for

# Root to index ???
@app.route('/')
def main():
    return render_template('homepage.html')

#  @app.route('/index')
#  def index():
#      return render_template('homepage.html')


@app.route('/tool_page')
def tool_page():
    return render_template('tool.html')

@app.route('/staging')
def staging_page():
    return render_template('staging.html')
