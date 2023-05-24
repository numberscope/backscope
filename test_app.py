""""
This module is responsible for testing backscope's API routes.
"""

import json
import pytest
from app import create_app


@pytest.fixture()
def app():
    app = create_app()
    app.config.update(
        {
            "TESTING": True,
        }
    )
    yield app


@pytest.fixture()
def client(app):
    return app.test_client()


def test_root(client):
    """Ensure we can get a "Hello, World!" via the API. (Super important!)

    :param client: Flask test client
    """
    response = client.get("/")
    assert b"<p>Hello, World!</p>" in response.data


def test_get_oeis_sequence(client):
    """Ensure we can get a sequence object via the API.

    This test depends on the names of the Sequence class keys. If they
    change, this test will need to change.

    This test also depends on the values of sequence A000001. If the
    values change or if the OEIS ID changes, this test will need to
    change.

    :param client: Flask test client
    """
    response = client.get("/api/get_oeis_sequence/A000001")
    seq_dict = json.loads(response.data)

    # Assert each key is present.
    assert "oeis_id" in seq_dict
    assert "name" in seq_dict
    assert "oeis_offset" in seq_dict
    assert "vals" in seq_dict
    assert "values_requested" in seq_dict
    assert "raw_refs" in seq_dict
    assert "backrefs" in seq_dict
    assert "metadata_requested" in seq_dict

    # Check to see if a value is present in the values list. Index 160
    # has the value 238 for A000001.
    assert "238" in seq_dict["vals"]


def test_get_oeis_values(client):
    """Ensure we can get values via the API.

    This test depends on the values of sequence A000001. If the values
    change or if the OEIS ID changes, this test will need to change.

    :param client: Flask test client
    """
    response = client.get("/api/get_oeis_values/A000001")
    values_dict = json.loads(response.data)

    # Assert values has keys 0 to 2047.
    for i in range(2048):
        assert str(i) in values_dict

    # Check to see if a value is present. Index 64 has the value 267 for
    # A000001.
    assert values_dict["64"] == "267"


def test_get_oeis_metadata(client):
    """Ensure we can get metadata via the API.

    This test depends on the values of sequence A000001. If the metadata
    associated with A000001 changes, this test will need to change.

    :param client: Flask test client
    """
    response = client.get("/api/get_oeis_metadata/A000001")
    metadata_dict = json.loads(response.data)

    # Assert metadata keys are present.
    assert "name" in metadata_dict
    assert "xrefs" in metadata_dict
    assert "backrefs" in metadata_dict

    # Assert some of the values are present.
    assert metadata_dict["name"] == "Number of groups of order n."
    assert "A000679" in metadata_dict["xrefs"]
    assert "A003277" in metadata_dict["backrefs"]


def test_get_oeis_factors(client):
    """Ensure we can get factors via the API.

    :param client: Flask test client
    """
    response = client.get("/api/get_oeis_factors/A000001")
    factors_list = json.loads(response.data)

    # TODO: Change this when we return a dict from get_oeis_factors.
    assert factors_list[0] == "[[0,1]]"
