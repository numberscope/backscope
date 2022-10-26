import pytest
from flaskr import utils


def test_raises_type_error_for_non_strings():
    with pytest.raises(TypeError) as exc:
        utils.get_valid_oeis_id(1234567)
    assert str(exc.value) == "oeis_id not a string"


def test_raises_exception_for_incorrect_length():
    with pytest.raises(Exception) as exc:
        utils.get_valid_oeis_id("A23456")
    assert str(exc.value) == "oeis_id not 7 characters in length"


def test_capitalizes_lowercase_a():
    assert (utils.get_valid_oeis_id("a000041") == "A000041")


def test_already_capitalized_a():
    assert (utils.get_valid_oeis_id("A000040") == "A000040")
