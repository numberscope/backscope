"""
Views for nscope model
"""

from flask import Blueprint
from flask import flash
from flask import g
from flask import redirect
from flask import url_for
from flask import Flask, request, jsonify, render_template, send_file
from flask_executor import Executor
from flask_login import LoginManager, current_user, login_user
from flaskr import db

from werkzeug.exceptions import abort
from sqlalchemy import or_, func
import numpy as np
import requests
import os
import sys


from flaskr import db
from flaskr.nscope.models import *

executor = Executor()
bp = Blueprint("nscope", __name__)


# Creating a simple index route (this will error because we currently dont have an index.html"j
@bp.route("/index")
def index():
    return render_template("index.html")

def save_oeis_sequence(seq):
    db.session.add(seq)
    db.session.commit()

def find_oeis_sequence(oeis_id):
    """ Returns either a Sequence object, or an Error object if ID invalid, etc.
        Note it _returns_ the Error object, rather than throwing it.
    """
    # First check if it is in the database
    seq = Sequence.get_seq_by_id(oeis_id)
    if seq: return seq
    # Try to get it from the OEIS:
    seq_addr = "https://oeis.org/{}/b{}.txt".format(oeis_id, oeis_id[1:])
    r = requests.get(seq_addr)
    if r.status_code == 404:
        return LookupError(f"B-file for ID '{oeis_id}' not found in OEIS.")
    # Parse the b-file:
    first = float('inf')
    last = float('-inf')
    name = ''
    seq_vals = {}
    for line in r.text.split("\n"):
        if not line: continue
        if line[0] == '#':
            # Some sequences have info in first comment that we can use as a
            # stopgap until the real name is obtained.
            if not name: name = line[1:]
            continue
        column = line.split()
        if len(column) < 2: continue
        index = int(column[0])
        if index < first: first = index
        if index > last:  last  = index
        seq_vals[index] = column[1]
    if last < first:
        return IndexError(f"No terms found for ID '{oeis_id}'.")
    vals = [seq_vals[i] for i in range(first,last+1)]
    # Fill in some placeholder until we look up the real name.
    # Should we flag this in some way so it can be filtered from display?
    if not name: name = f"{oeis_id} [name not yet loaded]"
    seq = Sequence(id=oeis_id, name=name, shift=first, values=vals)
    # Schedule the database interaction so we can respond to the
    # request immediately:
    executor.submit(save_oeis_sequence, seq)
    return seq

@bp.route("/api/oeis_values/<oeis_id>/<num_elements>", methods=["GET"])
def oeis_values(oeis_id, num_elements):
    seq = find_oeis_sequence(oeis_id)
    if isinstance(seq, Exception):
        return f"Error: {seq}"
    raw_vals = seq.values
    wants = int(num_elements)
    if wants and wants < len(raw_vals):
        raw_vals = raw_vals[0:wants]
    vals = {(i+seq.shift):raw_vals[i] for i in range(len(raw_vals))}

    return jsonify({'id': seq.id, 'name': seq.name, 'values': vals})

def ensure_oeis_file(oeis_id):
    """Obtains the oeis b-file data in a file and returns the filename"""
    if not os.path.exists("temp"):
        os.makedirs('temp')
    oeis_filename = "temp/b{}.txt".format(oeis_id[1:])
    if not os.path.exists(oeis_filename):
        with open(oeis_filename, 'w') as seq_file:
            seq_addr = "https://oeis.org/{}/b{}.txt".format(oeis_id, oeis_id[1:])
            r = requests.get(seq_addr)
            if r.status_code == 404:
                return "Error invalid OEIS ID: {}".format(oeis_id)
            seq_file.write(r.text)
    return oeis_filename

@bp.route("/api/get_oeis_values/<oeis_id>/<num_elements>", methods=["GET"])
def get_oeis_values(oeis_id, num_elements):
    oeis_filename = ensure_oeis_file(oeis_id)
    sequence = {}
    elements = 0
    num_elements = int(num_elements)
    with open(oeis_filename, 'r') as seq_file:
        for line in seq_file:
            if elements >= num_elements: break
            if line[0] == '#': continue
            column = line.split()
            if len(column) < 2: continue
            sequence[int(column[0])] = column[1]
            elements += 1

    response = {'id': oeis_id,
                'name': f"OEIS Sequence {oeis_id}",
                'values': sequence}
    return jsonify(response)
