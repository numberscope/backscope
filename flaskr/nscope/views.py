"""
Views for nscope model
"""

# external imports
import base64 # for encoding response dumps
from flask import Blueprint, jsonify, current_app, render_template
from flask_executor import Executor
import os
import re
import requests
from requests_toolbelt.utils import dump
import structlog
import subprocess
from sympy import factorint
from tempfile import NamedTemporaryFile
import time
from urllib.parse import urlunparse

# internal imports
from flaskr import db
from flaskr.nscope.models import *

executor = Executor()
bp = Blueprint("nscope", __name__)

# Convert a number to an OEIS id:
def oeis_a_id(num):
    return 'A' + str(num).zfill(6)

# Creating a simple index route (this will error because we currently dont have an index.html"j
@bp.route("/index")
def index():
    return render_template("index.html")

def write_request_log(log, response, error=False):
    if isinstance(response, str):
        log = log.bind(response=response)
    else: # TODO: Need human readable errors!
        response_b64 = base64.b64encode(dump.dump_all(response)).decode('ascii')
        log = log.bind(response=response_b64)
        if error:
            log.error('request issue')
        else:
            log.warning('request issue')

def oeis_url(path=''):
  return urlunparse([
    current_app.config['oeis_scheme'],
    current_app.config['oeis_hostport'],
    path,
    '', # path parameters
    '', # query
    ''  # fragment
  ])

def oeis_get(path='', params=None, json=True, timeout=4):
  # start keeping track of what's going on
  log = current_app.structlogger.bind(tags=[])
  tags = structlog.get_context(log)['tags']
  warn = False

  # try request
  try:
    # Initialize response in case an exception occurs before response
    # can be set:
    url = oeis_url(path)
    response = f"... No response from ${url} with ${params} ..."
    # make request and check for history and bad status
    response = requests.get(url, params, timeout=timeout)
    if response.history:
      tags.append('history')
      warn = True
    response.raise_for_status() # raise an exception on 4xx and 5xx status codes

    # check content type. since the content type header can include charset and
    # boundary directives, we split at ';' to get just the media type
    actual_type = response.headers['content-type'].split(';')[0]
    expected_type = 'application/json' if json else 'text/plain'
    if actual_type != expected_type:
      tags.append('wrong content type')
      warn = True

    # decode response
    if json:
      content = response.json()
    else:
      content = response.text
  except requests.HTTPError as ex:
    tags.append('http error')
    write_request_log(log, response, error=True)
    return ex
  except requests.RequestException as ex:
    tags.append('request exception')
    write_request_log(log, response, error=True)
    return ex
  except requests.exceptions.JSONDecodeError as ex:
    tags.append('json decode error')
    write_request_log(log, response, error=True)
    return ex

  #-----------------------------------------------------------------------------
  # if we've gotten this far, it's going well enough to return response content
  #-----------------------------------------------------------------------------

  if warn:
    write_request_log(log, response)
  return content

def fetch_metadata(oeis_id):
    """ When called with a *valid* oeis id, makes sure the metadata has been
        obtained, and returns the corresponding Sequence object with valid
        metadata. The sequence's name and raw references should be written to
        the database almost immediately, but the function won't return until
        we also finish searching for backreferences, which can take several
        seconds.
    """
    seq = find_oeis_sequence(oeis_id)
    if seq.backrefs is not None:
        # We've cached all the metadata already, so we just return it
        return seq

    our_req_time = time.time_ns()
    last_req_time = seq.meta_req_time
    if last_req_time is not None:
        waited = (our_req_time - last_req_time) / 1e9
        stored_ref_count = seq.ref_count
        if stored_ref_count is None:
            max_wait = 2
        else:
            max_wait = 3 + stored_ref_count*(2e-3 + stored_ref_count*1e-4)
        if waited < max_wait:
            # Return the sequence's name and raw references if we've got them,
            # or an error message if we've got nothing
            if seq.raw_refs is not None:
                return seq
            else:
                return LookupError(
                    f"Metadata for {oeis_id} was already requested "
                    f"{waited:.1f} seconds ago. A new request can be made if "
                    f"the old one takes longer than {max_wait:.1f} seconds."
                )

    #---------------------------------------------------------------------------
    # if we've gotten this far, we don't have all the metadata in the database
    # yet, and we don't think any other thread is likely to come back with it
    #---------------------------------------------------------------------------

    # Record the time we set out to fetch the metadata, so later threads can
    # judge how likely we are to ever come back
    seq.meta_req_time = our_req_time
    db.session.commit()

    # Look up our sequence's name and raw references. The metadata file we're
    # parsing is written in the OEIS internal format, which is specified here:
    #
    #   https://oeis.org/eishelp1.html
    #
    short_id = seq.id[:4]
    oeis_data_path = os.path.join('oeisdata', 'seq')
    seq_file_path = os.path.join(oeis_data_path, short_id, seq.id + '.seq')
    prefix_len = 4 + len(seq.id)
    seq.raw_refs = ''
    for line in open(seq_file_path):
        if line.startswith('%N'):
            # the OEIS internal format specification says that only one %N line
            # can appear, so the line we just found must be the whole name
            seq.name = line[prefix_len:]
        elif line.startswith('%Y'):
            seq.raw_refs += line[prefix_len:]
    seq.name = seq.name.strip()
    seq.raw_refs = seq.raw_refs.strip()
    db.session.commit()

    # Find all the other sequences whose metadata mentions our sequence
    backref_search = subprocess.run(
        ['rg', seq.id, '--glob', f'!{seq.id}.seq', '--files-with-matches'],
        cwd=oeis_data_path,
        capture_output=True,
        encoding='utf8'
    )
    if backref_search.returncode:
        # ripgrep returned status code 1, which means it didn't find anything
        seq.backrefs = []
    else:
        # ripgrep returned status code 0, which means its output lists all the
        # sequence files that mention our sequence
        seq.backrefs = list(map(
            lambda name: os.path.splitext(os.path.basename(name))[0],
            backref_search.stdout.strip().split('\n')
        ))

    # Count the references to our sequence, including the sequence itself
    seq.ref_count = len(seq.backrefs) + 1

    # We write the backreferences we've found to the database in the following
    # situations:
    #
    # - No more recent thread has set out to fetch the same metadata
    #
    # - A more recent thread has set out to fetch the same metadata, but we got
    #   back before any other thread did
    #
    # This is equivalent to the condition in the `if` statement below because
    # the only way for `seq.meta_req_time == our_req_time` to be false is for a
    # more recent thread to have overwritten the request time
    if seq.meta_req_time == our_req_time or seq.backrefs is None:
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
    seq = find_oeis_sequence(oeis_id)
    if seq.values is not None:
        # We already have the values in the database, so we just return them
        return seq
    
    our_req_time = time.time_ns()
    last_req_time = seq.values_req_time
    if last_req_time is not None:
        # we chose `max_wait = 3` pretty haphazardly. it matches the minimum
        # `max_wait` for a metadata request that has some refs downloaded
        # already, and it's longer than the time it took to download the A000521
        # b-file on Glen's connection (two seconds for 4 MB)
        waited = (our_req_time - last_req_time) / 1e9
        max_wait = 3
        if waited < max_wait:
            return LookupError(
                f"Values for {oeis_id} were already requested {waited:.1f} "
                "seconds ago. A new request can be made if the old one takes "
                f"longer than {max_wait:.1f} seconds."
            )
    
    #---------------------------------------------------------------------------
    # if we've gotten this far, we don't have the values in the database yet,
    # and we don't think any other thread is likely to come back with them
    #---------------------------------------------------------------------------

    # Record the time we set out to fetch the values, so later threads can
    # judge how likely we are to ever come back
    seq.values_req_time = our_req_time
    db.session.commit()
    
    # Try to get the b-file from the OEIS:
    b_text = oeis_get(f'/{oeis_id}/b{oeis_id[1:]}.txt', json=False)
    # Test for 404 error. Hat tip StackOverflow user Lukasa
    #   https://stackoverflow.com/a/19343099
    if isinstance(b_text, Exception):
        if (
            isinstance(b_text, requests.HTTPError) and
            b_text.response.status_code == 404
        ):
            return LookupError(f"B-file for ID '{oeis_id}' not found in OEIS.")
        else:
            return b_text
    # Parse the b-file:
    first = float('inf')
    last = float('-inf')
    seq_vals = {}
    for line in b_text.split("\n"):
        if not line or line[0] == '#': continue
        column = line.split()
        if len(column) < 2: continue
        if not (column[0][0].isdigit() or column[0][0] == '-'):
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
        seq.name = placeholder_name(oeis_id)
    seq.shift = first
    
    # We write what we've found to the database in the following situations:
    #
    # - No more recent thread has set out to fetch the same metadata
    #
    # - A more recent thread has set out to fetch the same metadata, but we got
    #   back before any other thread did
    #
    # This is equivalent to the condition in the `if` statement below because
    # the only way for `seq.values_req_time == our_req_time` to be false is for
    # a more recent thread to have overwritten the request time
    if seq.values_req_time == our_req_time or seq.values is None:
        db.session.commit()
    
    return seq

def fetch_factors(oeis_id, num_elements = -1, timeout = 10):
    """ The first argument oeis_id must be a valid OEIS id that is already
        stored in the database **with all of its values**.
        The second argument num_elements gives the number of terms to factor,
        or the default -1 means to factor all known elements.
        The third argument timeout gives the maximum number of seconds
        to wait for Pari to factor large numbers encountered.

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
    USE_SYMPY_BELOW = 2**32 + 1 # Kate found 2**64 too big -- hits slow spots
    USE_PARI_BELOW = 2**512 + 1 # Arbitrary limit; is it needed with timeout?
    for_pari = []
    for i in range(len_factors, num_elements):
        val = int(seq.values[i])
        # the factorization of 1 is empty
        if val == 0:
            fac = '[0, 1]'
        elif val == 1:
            fac = '[]'
        elif abs(val) < USE_SYMPY_BELOW:
            symfac = factorint(val)
            facs = [f"{prime},{power}" for prime, power in symfac.items()]
            fac = f"[{';'.join(facs)}]"
        elif abs(val) < USE_PARI_BELOW:
            for_pari.append((val, len(factors)))
            fac = 'no_fac_yet'
        else:
            fac = 'no_fac'
        factors.append(fac)
    # Farm out the tough ones to pari:
    if len(for_pari):
        results = ''
        # Note delete should be changed to delete_on_close when we switch
        # to Python 3.12 or higher
        with NamedTemporaryFile(mode='w+t', delete=False) as temp:
            tempname = temp.name
            for item in for_pari:
                temp.write(f"print(factor({item[0]}))\n")
            temp.write("\\q\n")
            temp.close()
            try:
                results = subprocess.check_output(
                    ['gp', '-q', '-s', '256000000', tempname],
                    timeout=timeout)
            except subprocess.TimeoutExpired as te:
                results = te.output
        if results:
            lines = results.decode('utf-8').split("\n")[0:-1]
            for i in range(0, len(lines)):
                cyfac = lines[i]
                if cyfac[0:3] == 'Mat': cyfac = cyfac[4:-1]
                factors[for_pari[i][1]] = cyfac
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
    executor.submit(fetch_factors, valid_oeis_id, timeout=1000)
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
        seq_file_path = os.path.join('oeisdata', 'seq', seq.id[:4], seq.id + '.seq')
        for line in open(seq_file_path):
            if line.startswith('%N'):
                # the OEIS internal format specification says that only one %N line
                # can appear, so the line we just found must be the whole name
                prefix_len = 4 + len(seq.id)
                seq.name = line[prefix_len:].strip()
                db.session.commit()
                break
    executor.submit(fetch_factors, valid_oeis_id, timeout=1000)
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


@bp.route("/api/get_commit", methods=["GET"])
def get_git_commit():
    """ Returns the short git hash for the current build of backscope
        (as determined at startup in flaskr/__init__.py)
    """
    return jsonify({
        'short_commit_hash': current_app.config['git_revision_hash']
    })

@bp.route("/api/search_oeis/<search_term>", methods=["GET"])
def search_oeis(search_term):
    srch = Search.get_search_by_term(search_term)
    if not srch:
        srch = Search(term=search_term)
        db.session.add(srch)
        db.session.commit()
    if srch.ids is None:
        search_response = oeis_get('/search', {'q': search_term, 'fmt': 'json'})
        if isinstance(search_response, Exception):
            srch.ids=[]
            srch.names=[]
        else:
            ids = []
            names = []
            resultList = search_response
            if resultList is None:
                resultList = []
            for result in resultList:
                current = oeis_a_id(result['number'])
                ids.append(current)
                names.append(result['name'])
                seq = find_oeis_sequence(current)
                seq.name = result['name'] # might as well update
                db.session.commit()
            srch.ids = ids
            srch.names = names
            db.session.commit()
    return jsonify({
        'term': search_term,
        'results': [
            [srch.ids[i], srch.names[i]] for i in range(0, len(srch.ids))]})
