"""
Views for nscope model
"""

from urllib.parse import urlunparse

from flask import Blueprint, jsonify, current_app, render_template
from flask_executor import Executor
from flaskr import db
from flaskr.nscope.models import *

import cypari2
from cypari2.convert import gen_to_python
import re
import requests
import logging ## LOGBAD


executor = Executor()
bp = Blueprint("nscope", __name__)


# Creating a simple index route (this will error because we currently dont have an index.html"j
@bp.route("/index")
def index():
    return render_template("index.html")

def oeis_url(path='', query=''):
  return urlunparse([
    current_app.config['oeis_scheme'],
    current_app.config['oeis_hostport'],
    path,
    '', # path parameters
    query,
    ''  # fragment
  ])

def fetch_metadata(oeis_id):
    """ When called with a *valid* oeis id, makes sure the metadata has been
        obtained, and returns the corresponding Sequence object with valid
        metadata.

        Note that this also crawls all backreferences, so it can take quite
        a long time for popular sequences (potentially hours).
    """
    seq = find_oeis_sequence(oeis_id)
    if seq.meta_requested:
        if seq.raw_refs is None:
            return LookupError(f"Metadata fetching for {oeis_id} in progress")
        return seq
    seq.meta_requested = True
    db.session.commit()
    # Now grab the data
    match_url = oeis_url('/search', f'q={seq.id}&fmt=json')
    ##r = requests.get(match_url).json()  ## LOGBAD - commented out
    response = requests.get(match_url, timeout=4)    ## LOGBAD
    r = response.json()                   ## LOGBAD
    if not (response.status_code == 200): ## LOGBAD
        logging.warning(response.text)    ## LOGBAD
        print(f'Bad response for {oeis_id}') ## LOGBAD
    else:                                 ## LOGBAD
        logging.info(oeis_id)             ## LOGBAD
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
                ##r = requests.get(match_url + f"&start={saw}").json() ## LOGBAD - commented out
                response = requests.get(match_url + f"&start={saw}", timeout=4) ## LOGBAD
                r = response.json()                   ## LOGBAD
                if not (response.status_code == 200): ## LOGBAD
                    logging.warning(response.text)    ## LOGBAD
                    print(f'Bad response for {oeis_id}') ## LOGBAD
                else:                                 ## LOGBAD
                    logging.info(oeis_id)             ## LOGBAD
                if r['results'] == None:
                    break
        seq.backrefs = backrefs
    db.session.commit()
    return seq

def find_oeis_sequence(oeis_id):
    """ Returns a Sequence object associated with the given valid OEIS ID.
        Only call this with a non-Exception return value of
        get_valid_oeis_id().

        If the oeis_id is not yet in the database, simply creates
        a dummy Sequence entry and adds it to the database with no data.
        So the returned Sequence object may not have any data.

        Note further that just finding a sequence does not schedule any
        filling in of its data. That needs to be done judiciously by the
        requests.
    """
    seq = Sequence.get_seq_by_id(oeis_id)
    if seq: return seq
    # Note the sequence index might not correspond to an existing sequence
    # but we just ignore that issue for the sake of returning quickly
    seq = Sequence(id=oeis_id)
    db.session.add(seq)
    db.session.commit()
    return seq

def placeholder_name(oeis_id):
    return f"{oeis_id} [name not yet loaded]"

def fetch_values(oeis_id):
    """
        When called with a valid oeis id, fetches the b-file from the
        OEIS (if it has not already been), and returns a Sequence object
        with the values filled in.
    """
    # First check if it is in the database
    seq = find_oeis_sequence(oeis_id)
    # See if we already have the values:
    if seq.values is not None: return seq
    # See if getting them is in progress:
    if seq.values_requested:
        return LookupError("Value fetching for {oeis_id} in progress.")
    seq.values_requested = True
    db.session.commit()
    # Now try to get it from the OEIS:
    r = requests.get(oeis_url(f'/{oeis_id}/b{oeis_id[1:]}.txt'), timeout=4)
    if r.status_code == 404:
        return LookupError(f"B-file for ID '{oeis_id}' not found in OEIS.")
    if not (r.status_code == 200): ## LOGBAD
        logging.warning(r.text)    ## LOGBAD
        print(f'Bad response for {oeis_id}') ## LOGBAD
    else:                          ## LOGBAD
        logging.info(oeis_id)      ## LOGBAD
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
    seq.values = [seq_vals[i] for i in range(first,last+1)]
    if not seq.name:
        seq.name = name or placeholder_name(oeis_id)
    db.session.commit()
    return seq

def fetch_factors(oeis_id, num_elements = -1):
    """ The first argument oeis_id must be a valid OEIS id that is already
        stored in the database **with all of its values**.
        The second argument num_elements gives the number of terms to factor,
        or the default -1 means to factor all known elements.

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
    seq = find_oeis_sequence(oeis_id)

    if num_elements < 0 or len(seq.values) < num_elements:
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
        elif abs(val) <= 2**200: # Arbitrary limit; a timeout would be better
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

def fetch_values_and_factors(oeis_id):
    """ Convenience sequencing function for get_oeis_metadata """
    seq = fetch_values(oeis_id)
    if isinstance(seq, Exception): return seq
    return fetch_factors(oeis_id)

# The following regexp encodes the format of valid OEIS IDs. NOTE: when
# that format eventually changes, this code will have to be updated.
oeis_validator = re.compile(r'^A\d{6}$')
oeis_valid_format = 'Annnnnn'

def get_valid_oeis_id(oeis_id):
    """ Takes a string and returns either the associated valid OEIS id
        or an Exception indicating the difficulty with the input id.
        Note it does not raise the exception, just returns it.
    """

    if not isinstance(oeis_id, str):
        return TypeError('Supplied oeis_id is not a string')
    if len(oeis_id) != 7:
        return SyntaxError(f"ID {oeis_id} is not 7 characters long")
    valid_id = oeis_id
    first_character = oeis_id[0]
    if first_character.islower():
        """ If we can configure logging levels, e.g. info, warn,
            error, debug, verbose, etc., then the following print
            statements should be (verbose?) logs.

            TODO:
            https://github.com/numberscope/backscope/issues/57
        """
        print('verbose: first character in oeis_id is lowercase')
        print('verbose: making first character in oeis_id uppercase')
        valid_id = first_character.upper() + valid_id[1:]
    # The normal case:
    if oeis_validator.match(valid_id): return valid_id
    # Report appropriate error:
    if oeis_id == valid_id:
        return SyntaxError(f"ID {oeis_id} not of form {oeis_valid_format}")
    return SyntaxError(
        f"Neither {oeis_id} nor {valid_id} of form {oeis_valid_format}")

@bp.route("/api/get_oeis_values/<oeis_id>/<num_elements>", methods=["GET"])
def get_oeis_values(oeis_id, num_elements):
    valid_oeis_id = get_valid_oeis_id(oeis_id)
    if isinstance(valid_oeis_id, Exception):
        return f"Error: {valid_oeis_id}"
    seq = fetch_values(valid_oeis_id)
    if isinstance(seq, Exception):
        return f"Error: {seq}"
    # OK, got valid sequence, so schedule grabbing of metadata and factors:
    executor.submit(fetch_metadata, valid_oeis_id)
    executor.submit(fetch_factors, valid_oeis_id)
    # Finally, trim return sequence as requested:
    raw_vals = seq.values
    wants = int(num_elements)
    if wants and wants < len(raw_vals):
        raw_vals = raw_vals[0:wants]
    vals = {(i+seq.shift):raw_vals[i] for i in range(len(raw_vals))}

    return jsonify({'id': seq.id, 'name': seq.name, 'values': vals})

@bp.route("/api/get_oeis_name_and_values/<oeis_id>", methods=["GET"])
def get_oeis_name_and_values(oeis_id):
    valid_oeis_id = get_valid_oeis_id(oeis_id)
    if isinstance(valid_oeis_id, Exception):
        return f"Error: {valid_oeis_id}"
    seq = fetch_values(valid_oeis_id)
    if isinstance(seq, Exception):
        return f"Error: {seq}"
    raw_vals = seq.values
    vals = {(i + seq.shift): raw_vals[i] for i in range(len(raw_vals))}
    # Now get the name
    seq = find_oeis_sequence(valid_oeis_id)
    if not seq.name or seq.name == placeholder_name(oeis_id):
        ## r = requests.get(oeis_url('/search', f'q=id:{oeis_id}&fmt=json'), timeout=4).json() ## LOGBAD - commented out
        response = requests.get(oeis_url('/search', f'q=id:{oeis_id}&fmt=json'), timeout=4) ## LOGBAD
        r = response.json()                   ## LOGBAD
        if not (response.status_code == 200): ## LOGBAD
            logging.warning(response.text)    ## LOGBAD
            print(f'Bad response for {oeis_id}') ## LOGBAD
        else:                                 ## LOGBAD
            logging.info(oeis_id)             ## LOGBAD
        if r['results'] != None:
            seq.name = r['results'][0]['name']
            db.session.commit()
    executor.submit(fetch_factors, valid_oeis_id)
    return jsonify({'id': seq.id, 'name': seq.name, 'values': vals})

@bp.route("/api/get_oeis_metadata/<oeis_id>", methods=["GET"])
def get_oeis_metadata(oeis_id):
    valid_oeis_id = get_valid_oeis_id(oeis_id)
    if isinstance(valid_oeis_id, Exception):
        return f"Error: {valid_oeis_id}"
    seq = fetch_metadata(valid_oeis_id)
    if isinstance(seq, Exception):
        return f"Error: {seq}"
    executor.submit(fetch_values_and_factors, valid_oeis_id)
    return jsonify({
        'id': seq.id,
        'name': seq.name,
        'xrefs': seq.raw_refs,
        'backrefs': seq.backrefs
    })

@bp.route("/api/get_oeis_factors/<oeis_id>/<num_elements>", methods=["GET"])
def get_oeis_factors(oeis_id, num_elements):
    valid_oeis_id = get_valid_oeis_id(oeis_id)
    if isinstance(valid_oeis_id, Exception):
        return f"Error: {valid_oeis_id}"
    raw_vals = fetch_values(valid_oeis_id)
    if isinstance(raw_vals, Exception):
        return f"Error: {raw_vals}"
    wants = int(num_elements)
    seq = fetch_factors(valid_oeis_id, wants)
    if isinstance(seq, Exception):
        return f"Error: {seq}"
    raw_fac = seq.factors
    if wants and wants < len(raw_fac):
        raw_fac = raw_fac[0:wants]
    facs = {(i+seq.shift):raw_fac[i] for i in range(len(raw_fac))}
    executor.submit(fetch_metadata, valid_oeis_id)
    return jsonify({
        'id': seq.id,
        'name': seq.name,
        'factors': facs
    })
