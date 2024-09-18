import unittest
import flaskr.nscope.test.abstract_endpoint_test as abstract_endpoint_test

a93178 = {str(i): str(1 if i%2 == 0 else i) for i in range(1024)}

class TestGetOEISChunkSmallZero(abstract_endpoint_test.AbstractEndpointTest):
  endpoint = 'http://localhost:5000/api/get_oeis_chunk/A093178/0'
  
  # we choose A093178 because:
  # - it has zero shift, to make sure that is in chunk 0
  # - it currently has small values and few references, which speeds up the
  #   background work triggered by the request
  # - it is one for even indices and i for odd indices, so easy to compute the
  #   (long) expected value
  expected_response = {
    'id': 'A093178',
    'name': 'A093178 [name not yet loaded]',
    'values': a93178
  }

class TestGetOEISChunkSmallOne(abstract_endpoint_test.AbstractEndpointTest):
  endpoint = 'http://localhost:5000/api/get_oeis_chunk/A160480/0'
  
  # we choose A160480 because:
  # - it has a positive shift, so we can make sure that chunk 0 starts at
  #   positive index
  # - it currently has small values and few references, which speeds up the
  #   background work triggered by the request
  expected_response = {
    'id': 'A160480',
    'name': ' A160480 (b-file synthesized from sequence entry)',
    'values': {
      '2': '-1',
      '3': '-11',
      '4': '1',
      '5': '-299',
      '6': '36',
      '7': '-1',
      '8': '-15371',
      '9': '2063',
      '10': '-85',
      '11': '1',
      '12': '-1285371',
      '13': '182474',
      '14': '-8948',
      '15': '166',
      '16': '-1',
      '17': '-159158691',
      '18': '23364725',
      '19': '-1265182',
      '20': '29034',
      '21': '-287',
      '22': '1',
      '23': '-27376820379',
      '24': '4107797216',
      '25': '-237180483',
      '26': '6171928',
      '27': '-77537',
      '28': '456',
      '29': '-1'
    }
  }

class TestGetOEISChunkNegative(abstract_endpoint_test.AbstractEndpointTest):
  endpoint = 'http://localhost:5000/api/get_oeis_chunk/A078302/-1'

  # we choose A078302 because:
  # - it has a negative shift, so we can make sure the values come out in
  #   chunk -1
  # - it currently has small values and few references, which speeds up the
  #   background work triggered by the request
  expected_response = {
    'id': 'A078302',
    'name': ' A078302 (b-file synthesized from sequence entry)',
    'values': {
      '-43': '5',
      '-42': '3',
      '-41': '9',
      '-40': '1'
    }
  }

class TestGetOEISChunkNegEmpty(abstract_endpoint_test.AbstractEndpointTest):
  endpoint = 'http://localhost:5000/api/get_oeis_chunk/A078302/0'

  # we choose A078302 because:
  # - it has a negative shift, and no values with positive indices, so
  #   we can make sure that chunk 0 is empty
  # - it currently has small values and few references, which speeds up the
  #   background work triggered by the request
  expected_response = {
    'id': 'A078302',
    'name': ' A078302 (b-file synthesized from sequence entry)',
    'values': {}
  }

class TestGetOEISChunkBig(abstract_endpoint_test.AbstractEndpointTest):
  endpoint = 'http://localhost:5000/api/get_oeis_chunk/A241298/361028'

  # we choose A241298 because:
  # - it has a large positive shift, so we can make sure that the values show
  #   up in the correct chunk
  # - it currently has small values and few references, which speeds up the
  #   background work triggered by the request
  expected_response = {
    'id': 'A241298',
    'name': ' A241298 (b-file synthesized from sequence entry)',
    'values': {
      '369693100': '4',
      '369693101': '2',
      '369693102': '8',
      '369693103': '1',
      '369693104': '2',
      '369693105': '4',
      '369693106': '7',
      '369693107': '7',
      '369693108': '3',
      '369693109': '1',
      '369693110': '7',
      '369693111': '5',
      '369693112': '7',
      '369693113': '4',
      '369693114': '7',
      '369693115': '0',
      '369693116': '4',
      '369693117': '8',
      '369693118': '0',
      '369693119': '3',
      '369693120': '6',
      '369693121': '9',
      '369693122': '8',
      '369693123': '7',
      '369693124': '1',
      '369693125': '1',
      '369693126': '5',
      '369693127': '9',
      '369693128': '3',
      '369693129': '0',
      '369693130': '5',
      '369693131': '6',
      '369693132': '3',
      '369693133': '5',
      '369693134': '2',
      '369693135': '1',
      '369693136': '3',
      '369693137': '3',
      '369693138': '9',
      '369693139': '0',
      '369693140': '5',
      '369693141': '5',
      '369693142': '4',
      '369693143': '8',
      '369693144': '2',
      '369693145': '2',
      '369693146': '4',
      '369693147': '1',
      '369693148': '4',
      '369693149': '4',
      '369693150': '3',
      '369693151': '5',
      '369693152': '1',
      '369693153': '4',
      '369693154': '1',
      '369693155': '7',
      '369693156': '4',
      '369693157': '7',
      '369693158': '5',
      '369693159': '3',
      '369693160': '7',
      '369693161': '2',
      '369693162': '3',
      '369693163': '0',
      '369693164': '5',
      '369693165': '3',
      '369693166': '5',
      '369693167': '2',
      '369693168': '3',
      '369693169': '8',
      '369693170': '8',
      '369693171': '7',
      '369693172': '4',
      '369693173': '7',
      '369693174': '1',
      '369693175': '7',
      '369693176': '3',
      '369693177': '5',
      '369693178': '0',
      '369693179': '4',
      '369693180': '8',
      '369693181': '3',
      '369693182': '5',
      '369693183': '3',
      '369693184': '1',
      '369693185': '9',
      '369693186': '3',
      '369693187': '6',
      '369693188': '6',
      '369693189': '5',
      '369693190': '2',
      '369693191': '9',
      '369693192': '9',
      '369693193': '4',
      '369693194': '3',
      '369693195': '2',
      '369693196': '0',
      '369693197': '3',
      '369693198': '3',
      '369693199': '3',
      '369693200': '7',
      '369693201': '5',
      '369693202': '0',
      '369693203': '6',
      '369693204': '0'
    }
  }

class TestGetOEISChunkBigWrong(abstract_endpoint_test.AbstractEndpointTest):
  endpoint = 'http://localhost:5000/api/get_oeis_chunk/A241298/17'

  # we choose A241298 because:
  # - it has a large positive shift, so we can make sure that the values show
  #   up in the correct chunk (and nowhere else)
  # - it currently has small values and few references, which speeds up the
  #   background work triggered by the request
  expected_response = {
    'id': 'A241298',
    'name': ' A241298 (b-file synthesized from sequence entry)',
    'values': {}
  }

class TestGetOEISChunkHugeFirst(abstract_endpoint_test.AbstractEndpointTest):
  endpoint = 'http://localhost:5000/api/get_oeis_chunk/A241292/3553061171'

  # we choose A241292 because:
  # - it has a positive shift larger than JavaScript's MAX_SAFE_INTEGER, so
  #   we can make sure that the values still show up in the correct chunk
  # - its values are by fortune split across two chunks
  # - it currently has small values and few references, which speeds up the
  #   background work triggered by the request
  expected_response = {
    'id': 'A241292',
    'name': ' A241292 (b-file synthesized from sequence entry)',
    'values': {
      '3638334640025': '1',
      '3638334640026': '2',
      '3638334640027': '5',
      '3638334640028': '8',
      '3638334640029': '0',
      '3638334640030': '1',
      '3638334640031': '4',
      '3638334640032': '2',
      '3638334640033': '9',
      '3638334640034': '0',
      '3638334640035': '6',
      '3638334640036': '2',
      '3638334640037': '7',
      '3638334640038': '4',
      '3638334640039': '9',
      '3638334640040': '1',
      '3638334640041': '3',
      '3638334640042': '1',
      '3638334640043': '7',
      '3638334640044': '8',
      '3638334640045': '6',
      '3638334640046': '0',
      '3638334640047': '3',
      '3638334640048': '9',
      '3638334640049': '0',
      '3638334640050': '6',
      '3638334640051': '9',
      '3638334640052': '8',
      '3638334640053': '2',
      '3638334640054': '0',
      '3638334640055': '3',
      '3638334640056': '2',
      '3638334640057': '8',
      '3638334640058': '1',
      '3638334640059': '2',
      '3638334640060': '1',
      '3638334640061': '5',
      '3638334640062': '5',
      '3638334640063': '1',
      '3638334640064': '8',
      '3638334640065': '0',
      '3638334640066': '4',
      '3638334640067': '6',
      '3638334640068': '7',
      '3638334640069': '1',
      '3638334640070': '4',
      '3638334640071': '3',
      '3638334640072': '1',
      '3638334640073': '6',
      '3638334640074': '5',
      '3638334640075': '9',
      '3638334640076': '6',
      '3638334640077': '0',
      '3638334640078': '1',
      '3638334640079': '5',
      '3638334640080': '1',
      '3638334640081': '8',
      '3638334640082': '9',
      '3638334640083': '6',
      '3638334640084': '7',
      '3638334640085': '4',
      '3638334640086': '9',
      '3638334640087': '4',
      '3638334640088': '4',
      '3638334640089': '3',
      '3638334640090': '8',
      '3638334640091': '1',
      '3638334640092': '2',
      '3638334640093': '1',
      '3638334640094': '1',
      '3638334640095': '0',
      '3638334640096': '1',
      '3638334640097': '1',
      '3638334640098': '3',
      '3638334640099': '0',
      '3638334640100': '0',
      '3638334640101': '0',
      '3638334640102': '1',
      '3638334640103': '7',
      '3638334640104': '7',
      '3638334640105': '8',
      '3638334640106': '5',
      '3638334640107': '3',
      '3638334640108': '1',
      '3638334640109': '0',
      '3638334640110': '8',
      '3638334640111': '0',
      '3638334640112': '3',
      '3638334640113': '9',
      '3638334640114': '0',
      '3638334640115': '3',
      '3638334640116': '2',
      '3638334640117': '9',
      '3638334640118': '6',
      '3638334640119': '2',
      '3638334640120': '4',
      '3638334640121': '0',
      '3638334640122': '1',
      '3638334640123': '1',
      '3638334640124': '5',
      '3638334640125': '6',
      '3638334640126': '9',
      '3638334640127': '5'
    }
  }

class TestGetOEISChunkHugeRest(abstract_endpoint_test.AbstractEndpointTest):
  endpoint = 'http://localhost:5000/api/get_oeis_chunk/A241292/3553061172'

  # we choose A241292 because:
  # - it has a positive shift larger than JavaScript's MAX_SAFE_INTEGER, so
  #   we can make sure that the values still show up in the correct chunk
  # - its values are by fortune split across two chunks
  # - it currently has small values and few references, which speeds up the
  #   background work triggered by the request
  expected_response = {
    'id': 'A241292',
    'name': ' A241292 (b-file synthesized from sequence entry)',
    'values': {  
      '3638334640128': '8',
      '3638334640129': '5'
    }
  }

if __name__ == "__main__":
    unittest.main()
