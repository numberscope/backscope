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
    # When we arrive here, we have a Sequence object seq which has had its
    # values filled in. We grab its metadata and incorporate that, and then
    # add it to the database, and return the fleshed-out sequence
    match_url = f"https://oeis.org/search?q={seq.id}&fmt=json"
    r = requests.get(match_url).json()
    if r['results'] != None: # Found some metadata
        backrefs = []
        target_number = int(seq.id[1:])
        matches = r['count']
        saw = 0
        while (saw < matches):
            for result in r['results']:
                if result['number'] == target_number:
                    seq.name = result['name']
                    seq.raw_refs = "\n".join(result['xref'])
                else:
                    backrefs.append('A' + str(result['number']).zfill(6))
                saw += 1
            if saw < matches:
                r = requests.get(match_url + f"&start={saw}").json()
                if r['results'] == None:
                    break
        seq.backrefs = backrefs
    db.session.add(seq)
    db.session.commit()
    return seq

def find_oeis_sequence(oeis_id, detail = ''):
    """ Returns either a Sequence object, or an Error object if ID invalid, etc.
        Note it _returns_ the Error object, rather than throwing it.
        If the optional second argument is a string with special values:
        'name' means to make an extra request to get the official name, and
        'full' means to wait to get all of the sequence data from the OEIS
        server; otherwise it only retrieves the values and leaves extraction
        of other information to a background task.
    """
    # First check if it is in the database
    seq = Sequence.get_seq_by_id(oeis_id)
    if seq: return seq
    # Try to get it from the OEIS:
    domain = 'https://oeis.org/'
    r = requests.get(f"{domain}{oeis_id}/b{oeis_id[1:]}.txt")
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
        if not column[0][0].isdigit():
            return LookupError(
                f"Unparseable b-file line for ID '{oeis_id}': {line}")
        index = int(column[0])
        if index < first: first = index
        if index > last:  last  = index
        seq_vals[index] = column[1]
    if last < first:
        return IndexError(f"No terms found for ID '{oeis_id}'.")
    vals = [seq_vals[i] for i in range(first,last+1)]

    if detail == 'name':
        r = requests.get(f"{domain}search?q=id:{oeis_id}&fmt=json").json()
        if r['results'] != None:
            name = r['results'][0]['name']

    # If need be, fill in a placeholder until we look up the real name.
    if not name: name = f"{oeis_id} [name not yet loaded]"

    seq = Sequence(id=oeis_id, name=name, shift=first, values=vals)
    if detail == 'full':
        # Get all of the data and make sure it's in the database synchronously
        # as requested
        return save_oeis_sequence(seq)
    # Otherwise, schedule the database interaction so we can respond to the
    # request immediately:
    executor.submit(save_oeis_sequence, seq)
    return seq

@bp.route("/api/get_oeis_values/<oeis_id>/<num_elements>", methods=["GET"])
def get_oeis_values(oeis_id, num_elements):
    seq = find_oeis_sequence(oeis_id)
    if isinstance(seq, Exception):
        return f"Error: {seq}"
    raw_vals = seq.values
    wants = int(num_elements)
    if wants and wants < len(raw_vals):
        raw_vals = raw_vals[0:wants]
    vals = {(i+seq.shift):raw_vals[i] for i in range(len(raw_vals))}

    return jsonify({'id': seq.id, 'name': seq.name, 'values': vals})

@bp.route("/api/get_oeis_name_and_values/<oeis_id>", methods=["GET"])
def get_oeis_name_and_values(oeis_id):
    seq = find_oeis_sequence(oeis_id, 'name')
    if isinstance(seq, Exception):
        return f"Error: {seq}"
    vals = {(i + seq.shift): seq.values[i] for i in range(len(seq.values))}
    return jsonify({'id': seq.id, 'name': seq.name, 'values': vals})

@bp.route("/api/get_oeis_metadata/<oeis_id>", methods=["GET"])
def get_oeis_metadata(oeis_id):
    seq = find_oeis_sequence(oeis_id, 'full')
    if isinstance(seq, Exception):
        return f"Error: {seq}"
    return jsonify({
        'id': seq.id,
        'name': seq.name,
        'xrefs': seq.raw_refs,
        'backrefs': seq.backrefs
    })
