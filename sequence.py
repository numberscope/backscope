"""
This module defines the Sequence class, and some functions that get data
for sequences. The Sequence class contains the database model for an
OEIS sequence. The Sequence class also defines a few methods.
"""

import os
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.exc import NoResultFound
import requests
import re
import cypari2
from cypari2.convert import gen_to_python

db = SQLAlchemy()


class Sequence(db.Model):
    """Define the DB model and methods for a sequence.

    This is class contains a model for the data we want to store in the
    database about an OEIS sequence. We use an object relational mapper
    called SQLAlchemy (the package is Flask SQLAlchemy) to describe the
    data we want to store in the database, and it does the heavy lifting
    of interacting with the database. Normally, you'd have to write SQL
    queries to insert and extract data from the database, but ORMs
    abstract that work away from the developer.

    This class also defines a few methods.
    """

    __tablename__ = "sequences"

    # TODO: Consider renaming OEIS ID to A-number: oeis_id->a_number.
    # We at Numberscope seem to have taken to calling A-numbers OEIS
    # IDs (because they function as IDs), but it might make sense to
    # use OEIS terminology. This would require a database migration.
    oeis_id = db.Column(db.String, unique=True, nullable=False, primary_key=True)
    name = db.Column(db.String, unique=False, nullable=True)
    oeis_offset = db.Column(db.Integer, unique=False, nullable=False, default=0)
    vals = db.Column(db.ARRAY(db.String), unique=False, nullable=True)
    values_requested = db.Column(db.Boolean, nullable=False, default=False)
    raw_refs = db.Column(db.String, unique=False, nullable=True)
    backrefs = db.Column(db.ARRAY(db.String), unique=False, nullable=True)
    metadata_requested = db.Column(db.Boolean, nullable=False, default=False)

    # Sadly, multidimensional arrays can't vary in dimension, so we
    # store factorization arrays as strings.
    factors = db.Column(db.ARRAY(db.String), unique=False, nullable=True)

    def as_dict(self):
        """Return a sequence object as a dictionary. Helper method.

        Taken from https://stackoverflow.com/a/11884806/15027348.

        :return: sequence object as a dictionary
        """
        return {c.name: getattr(self, c.name) for c in self.__table__.columns}

    @classmethod
    def get(cls, oeis_id):
        """Try to get a sequence object from the database.

        :param oeis_id: OEIS sequence ID, typically Annnnnn where n is a number
        :return: sequence object for given ID or None
        """
        try:
            valid_oeis_id = get_valid_oeis_id(oeis_id)
            return db.session.execute(
                db.select(Sequence).filter_by(oeis_id=valid_oeis_id)
            ).scalar_one()
        except NoResultFound:
            return None


# The following regular expression encodes the format of valid OEIS IDs.
# When that format eventually changes, this code will have to be updated.
oeis_validator = re.compile(r"^A\d{6}$")
oeis_valid_format = "Annnnnn, where n is a number"


def get_valid_oeis_id(oeis_id):
    """Return a capitalized, valid OEIS ID or raise a SyntaxError.

    :param oeis_id: invalid or valid OEIS sequence ID, possibly annnnnn
    :return: valid OEIS sequence ID, typically Annnnnn where n is a number
    """

    # Capitalize the first character.
    valid_id = oeis_id
    first_character = oeis_id[0]
    if first_character.islower():
        valid_id = first_character.upper() + valid_id[1:]

    # Check if the supplied ID matches the regular expression.
    if oeis_validator.match(valid_id):
        return valid_id
    else:
        raise SyntaxError(f"id {oeis_id} not of form {oeis_valid_format}")


def find_oeis_sequence(oeis_id):
    """Get the sequence object associated with the given OEIS ID.

    If the object associated with the given OEIS ID isn't in the
    database yet, this function adds a sequence to the database
    with no data other than the ID filled in.

    Finding a sequence doesn't schedule any filling in of the data.

    :param oeis_id: OEIS sequence ID, typically Annnnnn where n is a number
    :return: a sequence object, possibly one with just the ID filled in
    """
    valid_oeis_id = get_valid_oeis_id(oeis_id)
    seq = Sequence.get(valid_oeis_id)
    if seq:
        return seq

    # Note the sequence index might not correspond to an existing
    # sequence, but we just ignore that issue for the sake of returning
    # quickly.
    seq = Sequence(oeis_id=valid_oeis_id)
    db.session.add(seq)
    db.session.commit()
    return seq


def fetch_values(oeis_id):
    """Make an HTTP request to get sequence values from the OEIS.

    An OEIS b-file is a text file that contains the elements of an
    integer sequence. Each line of the text file has the index of
    an element followed by a space, followed by the value of the
    element at that index.

    :param oeis_id: OEIS sequence ID, typically Annnnnn where n is a number
    :return: dict of index->value for given OEIS sequence
    """

    seq = find_oeis_sequence(oeis_id)
    if seq.vals:
        return {(i + seq.oeis_offset): seq.vals[i] for i in range(len(seq.vals))}
    if seq.values_requested:
        raise LookupError(f"value fetching for {oeis_id} in progress")

    response = requests.get(f"{os.environ.get('OEIS_URL')}{oeis_id}/b{oeis_id[1:]}.txt")
    if response.status_code == 200:
        # If there are too many requests being made to the OEIS, we
        # might get a warning from the OEIS about crawling too fast.
        # Presumably such a warning would not have a 200 status code.
        # One would think the OEIS would use a 429 status code. If we
        # get something other than 200, we don't want to say value
        # fetching is in progress because the request might not have
        # succeeded.
        seq.values_requested = True
        db.session.commit()
    else:
        raise requests.exceptions.RequestException(
            f"response for {oeis_id} status: {response.status_code}"
        )

    vals = {}

    # Parse the b-file.
    first = float("inf")
    last = float("-inf")
    for line in response.text.split("\n"):
        # Sometimes lines are skipped or commented.
        if not line or line[0] == "#":
            continue

        # The first item in a line should be the index, followed
        # by a space, followed by the value at that index.
        index_and_value = line.split()
        if len(index_and_value) < 2:
            continue

        if not index_and_value[0][0].isdigit():
            raise LookupError(
                f"unable to parse b-file line for id: {oeis_id}, line: {line}"
            )

        # Handle the fact that not all sequences have the same
        # indexing scheme.
        index = int(index_and_value[0])
        if index < first:
            first = index
        if index > last:
            last = index
        vals[index] = index_and_value[1]

    if last < first:
        raise IndexError(f"no terms found for id: {oeis_id}")

    seq.vals = [vals[i] for i in range(first, last + 1)]
    db.session.commit()
    return vals


def fetch_metadata(oeis_id):
    """Get sequence metadata from the OEIS. Might take long time.

    We can use the search route on the OEIS website with the query
    parameter that specifies we want JSON to get metadata about
    a sequence. The field in the JSON response we are most concerned
    about is an array named results. This is the set of results that
    you would see if you were searching the OEIS using the web
    interface.

    This also crawls all backreferences, so it can take quite
    a long time for popular sequences (potentially hours).

    :param oeis_id: OEIS sequence ID, typically Annnnnn where n is a number
    :return: sequence object with populated metadata fields
    """
    valid_oeis_id = get_valid_oeis_id(oeis_id)
    seq = find_oeis_sequence(valid_oeis_id)

    # If we already got the metadata, return it. Otherwise, tell the
    # caller that the fetch is in progress.
    if seq.metadata_requested:
        if seq.raw_refs is None:
            raise LookupError(f"metadata fetching for {oeis_id} in progress")
        return seq

    query_url = f"https://oeis.org/search?q={seq.oeis_id}&fmt=json"
    response = requests.get(query_url).json()
    seq.metadata_requested = True
    db.session.commit()

    if response["results"] is not None:
        backrefs = []

        # Each results object has a number field, which is what we
        # refer to as the OEIS ID. For instance, the number for OEIS
        # ID A000001 is 1. The number for OEIS ID A12345 is 12345.
        target_number = int(seq.oeis_id[1:])

        # TODO: What is this count?
        # It's not the number of results. For instance, the number of
        # results for A000001 is 10, and the count for the A000001 query
        # is 160. As of this writing, the wiki page for the JSON format
        # doesn't say what the count is:
        # https://oeis.org/wiki/JSON_Format.
        matches = response["count"]
        saw = 0  # TODO: What are we "seeing" here?
        while saw < matches:
            for result in response["results"]:
                if result["number"] == target_number:
                    seq.name = result["name"]
                    seq.raw_refs = "\n".join(result["xref"])
                else:
                    # Concatenate the string "A" with the number with
                    # enough zeroes added at the beginning of it so that
                    # the number is six characters in length. Thus, we
                    # obtain what we call the OEIS ID. For instance, the
                    # number 1 is converted to A000001.
                    backrefs.append("A" + str(result["number"]).zfill(6))
                saw += 1

            # TODO: Explain this block of code.
            # I, Liam, am not sure what this block of code does. It
            # seems like the above loop is going to exhaust the results
            # for the given query, and I'm not sure what changing
            # the start does to the JSON response.
            if saw < matches:
                response = requests.get(query_url + f"&start={saw}").json()
                if response["results"] is None:
                    break
        seq.backrefs = backrefs
    db.session.commit()
    return seq


def fetch_factors(oeis_id):
    """Get the factors for each element in the sequence.

    :param oeis_id: OEIS sequence ID, typically Annnnnn where n is a number
    :return: a list containing list of factors for each element in the sequence
    """
    valid_oeis_id = get_valid_oeis_id(oeis_id)
    fetch_values(valid_oeis_id)  # Ensure the sequence object has values.
    seq = find_oeis_sequence(valid_oeis_id)
    factors = []
    if seq.vals:  # After fetching values, this should be redundant.
        pari = cypari2.Pari()
        for str_val in seq.vals:
            val = int(str_val)

            # 2^200 is an arbitrary limit; a timeout would be better.
            if val == 1:
                # The factorization of 1 is empty, so we leave 1's
                # val_fac array as an empty array.
                val_fac = []
            elif abs(val) <= 2**200:
                # Elements are arrays [p, e] for factor p^e including
                # [-1,1] for negative numbers and [0,1] for zero.
                val_fac = gen_to_python(pari(val).factor())
            else:
                val_fac = "no_fac"
            factors.append(str(val_fac).replace(" ", ""))

        # It seems like we need the shallow copy of factors when setting
        # a value for seq.factors.
        seq.factors = factors.copy()
        db.session.commit()

    # TODO: Return a dict with index+offset->factors.
    # Once we actually get the offset for a sequence, we need to use it
    # to create a dictionary where the keys are index+offset and the
    # values are the factor arrays for index+offset.
    return factors
