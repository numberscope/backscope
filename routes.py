from run import app
from flask import render_template, url_for

@app.route('/')
def main():
    return render_template('base.html')

@app.route('/index')
def index():
    return render_template('index.html')

@app.route('/tool_page')
def tool_page():
    return render_template('tool.html')
