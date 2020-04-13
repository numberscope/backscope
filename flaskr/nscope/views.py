"""
Views for nscope model
"""

from flask import Blueprint
from flask import flash
from flask import g
from flask import redirect
from flask import url_for
from flask import Flask, request, jsonify, render_template, send_file
from flask_login import LoginManager, current_user, login_user
from werkzeug.exceptions import abort
from sqlalchemy import or_, func

from flaskr import db
from flaskr.nscope.models import *

bp = Blueprint("nscope", __name__)


# Creating a simple index route (this will error because we currently dont have an index.thml"j
@bp.route("/index")
def index():
    return render_template("index.html")

# Sending simple json to the front end
@bp.route("/vuetest", methods=["GET"])
def vuetest():
    return jsonify({"Answer" : "This is a test", "Data" : [4.5123, 4.123, 9.123, 1.12309]})

@bp.route("/get_sequence/<id>", methods=["GET"])
def get_sequence(id):
    # get database entry
    seq = Sequence.get_seq_by_id(id)

    if seq == None:
        return f"Error Invalid sequence: {id}"

    id = seq.id
    name = seq.name
    vals = seq.first_100_entries
    print(id, name, vals)

    # jsonify the data
    data = jsonify({'id': id, 'name': name, 'values': vals})

    # return the data
    return data
