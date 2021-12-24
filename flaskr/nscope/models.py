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
    offset = db.Column(db.Integer, unique=False, nullable=False, default=0)
    values = db.Column(db.ARRAY(db.String), unique=False, nullable=False)
    raw_refs = db.Column(db.String, unique=False, nullable=True)

    @classmethod
    def get_seq_by_id(self, id):
        ret = self.query.filter_by(id=id).first()
        return ret







