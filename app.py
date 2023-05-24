"""
This is the entry point for backscope. It creates the Flask instance and
defines the functionality of the API.
"""

import logging
import os
import sys
from logging.handlers import RotatingFileHandler
from dotenv import load_dotenv
from flask import Flask, jsonify, abort
from flask_migrate import Migrate
from sequence import Sequence, fetch_values, fetch_metadata, fetch_factors
from sequence import db


def create_app():
    app = Flask(__name__)

    # Load environment variables from the .env file into os.environ.
    load_dotenv()

    # Set up file logging.
    file_handler = RotatingFileHandler(
        os.environ.get("LOG_FILE_NAME"), maxBytes=10000, backupCount=1
    )
    file_handler.setLevel(logging.INFO)
    app.logger.addHandler(file_handler)

    # Set up stdout logging.
    stdout_handler = logging.StreamHandler(sys.stdout)
    stdout_handler.setLevel(logging.DEBUG)
    app.logger.addHandler(stdout_handler)

    # Connect to the database.
    app.logger.info("attempting to connect to db")
    app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get("DB_URI")
    db.init_app(app)
    app.logger.info("connected to db")

    # Establish the migrate command for database migrations via CLI.
    migrate = Migrate()
    migrate.init_app(app, db)

    @app.route("/")
    def hello_world():
        """Dummy route. Should be removed once done developing.

        :return: string of HTML
        """
        app.logger.info(f"MY_FOO = {os.environ.get('MY_FOO')}")
        return "<p>Hello, World!</p>"

    @app.route("/api/get_oeis_sequence/<string:oeis_id>")
    def get_oeis_sequence(oeis_id):
        """A route for getting a whole, raw sequence object from the DB.

        This route is useful if you want to know what data is filled in
        for a given sequence object in the database. Hopefully it will
        be useful in development and debugging.

        :param oeis_id: OEIS sequence ID, typically Annnnnn where n is a number
        :return: JSON sequence dict, possibly empty
        """
        seq = Sequence.get(oeis_id)
        if seq:
            return jsonify(Sequence.as_dict(seq))
        else:
            return jsonify({})

    # Make providing the number of elements you want optional.
    # See https://stackoverflow.com/a/14032302/15027348.
    @app.route("/api/get_oeis_values/<string:oeis_id>", defaults={"num_elements": None})
    @app.route("/api/get_oeis_values/<string:oeis_id>/<int:num_elements>")
    def get_oeis_values(oeis_id, num_elements):
        """A route that gets a sequence's values from the DB or the OEIS.

        :param oeis_id: OEIS sequence ID, typically Annnnnn where n is a number
        :param num_elements: (optional) number of elements the caller wants
        :return: JSON object containing sequence's indices and values
        """
        try:
            vals = fetch_values(oeis_id)
            if num_elements and num_elements < len(vals.keys()):
                # Create a list of keys that the caller wants.
                # Taken from https://stackoverflow.com/a/16819250/15027348.
                wanted_keys = list(vals.keys())[0:num_elements]

                # Return a subset of the vals dict.
                # Taken from https://stackoverflow.com/a/5352630/15027348.
                return jsonify({k: vals[k] for k in wanted_keys})
            else:
                return jsonify(vals)

        except Exception as e:
            app.logger.error(e)
            abort(500)

    @app.route("/api/get_oeis_metadata/<string:oeis_id>")
    def get_oeis_metadata(oeis_id):
        """A route that gets a sequence's metadata from the DB or the OEIS.

        The response from this route might take a long time. Possibly
        hours, depending on the popularity of the sequence.

        :param oeis_id: OEIS sequence ID, typically Annnnnn where n is a number
        :return: dict containing metadata fields
        """
        try:
            seq = fetch_metadata(oeis_id)
            return jsonify(
                {"name": seq.name, "xrefs": seq.raw_refs, "backrefs": seq.backrefs}
            )
        except Exception as e:
            app.logger.error(e)
            abort(500)

    # Make providing the number of elements you want optional.
    # See https://stackoverflow.com/a/14032302/15027348.
    @app.route(
        "/api/get_oeis_factors/<string:oeis_id>", defaults={"num_elements": None}
    )
    @app.route("/api/get_oeis_factors/<string:oeis_id>/<int:num_elements>")
    def get_oeis_factors(oeis_id, num_elements):
        """A route for getting a sequence's factors.

        :param oeis_id: OEIS sequence ID, typically Annnnnn where n is a number
        :param num_elements: (optional) number of elements the caller wants
        :return: a list containing list of factors for each element in the sequence
        """
        try:
            factors = fetch_factors(oeis_id)
            if num_elements and num_elements < len(factors):
                return jsonify(factors[:num_elements])
            else:
                return jsonify(factors)

        except Exception as e:
            app.logger.error(e)
            abort(500)

    return app
