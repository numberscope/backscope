def get_valid_oeis_id(oeis_id):
    valid_id = oeis_id
    if isinstance(oeis_id, str):
        if len(oeis_id) != 7:
            raise Exception('oeis_id not 7 characters in length')
        else:
            first_character = oeis_id[0]
            if first_character.islower():
                # TODO: This should be logged. See
                # https://github.com/numberscope/backscope/issues/57.
                print('info: first character in oeis_id is lowercase')
                print('info: making first character in oeis_id uppercase')
                valid_id = first_character.upper()
                valid_id += oeis_id.partition(first_character)[2]
    else:
        raise TypeError('oeis_id not a string')
    return valid_id
