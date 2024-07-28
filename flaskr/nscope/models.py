"""
Models Example
"""

from sqlalchemy.ext.hybrid import hybrid_property
from werkzeug.security import check_password_hash
from werkzeug.security import generate_password_hash

from flaskr import db


class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    first_name = db.Column(db.String, unique=False, nullable=False)
    last_name = db.Column(db.String, unique=False, nullable=False)
    email = db.Column(db.String, unique=True, nullable=False)
    _password = db.Column("password", db.String, nullable=False)

    @hybrid_property
    def password(self):
        return self._password

    @password.setter
    def password(self, value):
        """Store the password as a hash for security."""
        self._password = generate_password_hash(value)

    def check_password(self, value):
        return check_password_hash(self.password, value)

class Sequence(db.Model):
    __tablename__ = 'sequences'

    id = db.Column(db.String, unique=True, nullable=False, primary_key=True)
    name = db.Column(db.String, unique=False, nullable=True)
    # The following is called the "offset" in the OEIS, but that is a
    # Postgres reserved word, so we use a different name.
    shift = db.Column(db.Integer, unique=False, nullable=False, default=0)
    values = db.Column(db.ARRAY(db.String), unique=False, nullable=True)
    values_requested = db.Column(db.Boolean, nullable=False, default=False)
    raw_refs = db.Column(db.String, unique=False, nullable=True)
    backrefs = db.Column(db.ARRAY(db.String), unique=False, nullable=True)
    ref_count = db.Column(db.Integer, nullable=True, default=None)
    # The start time of the last attempt to fetch metadata, in nanoseconds since
    # the UNIX epoch. A PostgreSQL BigInteger is eight bytes, including sign, so
    # this should work until the early 2260s
    meta_req_time = db.Column(db.BigInteger, nullable=True, default=None)
    # Sadly, multidimensional arrays can't vary in dimension
    # so we store factorization arrays as strings
    factors = db.Column(db.ARRAY(db.String), unique=False, nullable=True)

    @classmethod
    def get_seq_by_id(self, id):
        ret = self.query.filter_by(id=id).first()
        return ret

class Search(db.Model):
    __tablename__ = 'searches'

    term = db.Column(db.String, unique=True, nullable=False, primary_key=True)
    ids = db.Column(db.ARRAY(db.String), unique=False, nullable=True)
    names = db.Column(db.ARRAY(db.String), unique=False, nullable=True)

    @classmethod
    def get_search_by_term(self, term):
        ret = self.query.filter_by(term=term).first()
        return ret
