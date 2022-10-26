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
import cypari2
from cypari2.convert import gen_to_python
from flaskr import utils

from flaskr import db
from flaskr.nscope.models import *

executor = Executor()
bp = Blueprint("nscope", __name__)


# Creating a simple index route (this will error because we currently dont have an index.html"j
@bp.route("/index")
def index():
    return render_template("index.html")

def save_oeis_sequence(seq, detail = ''):
    """ The first argument is a Sequence object which has had its values
        filled in. This function grabs its metadata and incorporates that
        information, adds the resulting sequence to the database, and
        returns it. Unless the optional second argument ends with 'nofactor'
        it then initiates factoring the sequence.
    """
    # NOTE however that nothing currently prevents two requests
    # for the same newly-encountered sequence ending up both getting to this
    # code at roughly the same time (if the second comes in before the first
    # has had a chance to fill in the database). In that case, all of the
    # lookup work will be duplicated, although Postgres should ensure that when
    # all is said and done, the database is left in an OK state.
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
                    seq.raw_refs = "\n".join(result.get('xref', []))
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
    if not detail.endswith('nofactor'):
        executor.submit(factor_oeis_sequence, seq, len(seq.values))
    return seq

def find_oeis_sequence(oeis_id, detail = ''):
    """ Returns either a Sequence object, or an Error object if ID invalid, etc.
        Note it _returns_ the Error object, rather than throwing it.
        The optional second argument is a string with special values:
        'name' means to make an extra request to get the official name,
        'full_nofactor' and 'full' mean to wait to get all of the sequence
        data from the OEIS server; otherwise it only retrieves the values
        and leaves extraction of other information to a background task.
        Factoring is always left to a background task unless 'full_nofactor'
        is specified, in which case factoring is not initiated at all.
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
    if detail.startswith('full'):
        # Get all of the data and make sure it's in the database synchronously
        # as requested
        return save_oeis_sequence(seq, detail)
    # Otherwise, schedule the database interaction so we can respond to the
    # request immediately:
    executor.submit(save_oeis_sequence, seq, detail)
    return seq


def factor_oeis_sequence(seq, num_elements):
    """ The first argument seq must be a Sequence object already stored
        in the database with all of its metadata.
        The second argument num_elements gives the number of terms to factor.
        This function factors the first num_elements terms (if they aren't
        already) and adds them to the database.
        Returns seq object if requested factors existed or were added
        to the table; otherwise returns an error.
        Note it _returns_ the Error object, rather than throwing it.
        It will return the minimum of the number of requested factors
        or the number of terms available from OEIS.
        Terms too big to factor will store a factorization of 'no_fac'.
        The factoring format otherwise is essentially that of pari,
        stored as a string (since flask doesn't allow multidimensional
        arrays with varying sizes).
    """
    # The hardcoded integer size limit below can be pushed
    # further once we are doing factoring tasks on a background queue.

    # It appears that we are obliged to re-fetch the sequence from the database
    # for the updates to occur through Flask magic:
    seq = Sequence.get_seq_by_id(seq.id)
    if len(seq.values) < num_elements:
        num_elements = len(seq.values)
    # Load from database how much has been factored already
    if not seq.factors:
        factors = []
    else:
        # this copy appears to be required for the sequence update to work
        factors = seq.factors.copy()
    len_factors = len(factors)
    if len_factors >= num_elements:
        return seq
    # Factor whatever else is requested, within reason.
    pari = cypari2.Pari()
    for i in range(len_factors, num_elements):
        val = int(seq.values[i])
        # the factorization of 1 is empty
        if val == 1:
            fac = []
        elif abs(val) <= 2**200: # term size limit
            fac = []
            # elements are arrays [p, e] for factor p^e
            # including [-1,1] for negative numbers
            # and [0,1] for zero
            fac = gen_to_python(pari(val).factor())
        else:
            fac = 'no_fac'
        factors.append(str(fac).replace(" ",""));
    # And further it seems that we are obliged to actually modify the identity
    # of seq.factors in order for the database to update. It is hard to believe
    # that both the .copy() above and this copy() are required, yet testing
    # appeared to confirm that.
    seq.factors = factors.copy()
    db.session.commit()
    return seq


@bp.route("/api/get_oeis_values/<oeis_id>/<num_elements>", methods=["GET"])
def get_oeis_values(oeis_id, num_elements):
    valid_oeis_id = utils.get_valid_oeis_id(oeis_id)
    seq = find_oeis_sequence(valid_oeis_id)
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
    valid_oeis_id = utils.get_valid_oeis_id(oeis_id)
    seq = find_oeis_sequence(valid_oeis_id, 'name')
    if isinstance(seq, Exception):
        return f"Error: {seq}"
    vals = {(i + seq.shift): seq.values[i] for i in range(len(seq.values))}
    return jsonify({'id': seq.id, 'name': seq.name, 'values': vals})

@bp.route("/api/get_oeis_metadata/<oeis_id>", methods=["GET"])
def get_oeis_metadata(oeis_id):
    valid_oeis_id = utils.get_valid_oeis_id(oeis_id)
    seq = find_oeis_sequence(valid_oeis_id, 'full')
    if isinstance(seq, Exception):
        return f"Error: {seq}"
    return jsonify({
        'id': seq.id,
        'name': seq.name,
        'xrefs': seq.raw_refs,
        'backrefs': seq.backrefs
    })

@bp.route("/api/get_oeis_factors/<oeis_id>/<num_elements>", methods=["GET"])
def get_oeis_factors(oeis_id, num_elements):
    valid_oeis_id = utils.get_valid_oeis_id(oeis_id)
    seq = find_oeis_sequence(valid_oeis_id, 'full_nofactor') # we're about to do it...
    if isinstance(seq, Exception):
        return f"Error: {seq}"
    wants = int(num_elements)
    seq = factor_oeis_sequence(seq, wants)
    if isinstance(seq, Exception):
        return f"Error: Factorization failed: {result}"
    raw_fac = seq.factors
    if wants and wants < len(raw_fac):
        raw_fac = raw_fac[0:wants]
    facs = {(i+seq.shift):raw_fac[i] for i in range(len(raw_fac))}
    return jsonify({
        'id': seq.id,
        'name': seq.name,
        'factors': facs
    })
