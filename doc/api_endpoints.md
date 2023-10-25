# API endpoints

As of 2022-11-01, this document might be outdated.

This documents all of the endpoints provided by the backscope server.
All of them return JSON data with the specified keys and values. Also, every
endpoint includes the key 'id' with value the OEIS id for the sake of verifying
that it is the data as requested. In case of an OEIS_ID that does not match
anything in the OEIS, an error string is returned. Note that the angle brackets
<> in the URLS indicate where subsitutions are made; they should not be present
in the URLs actually used.

Also note that if any of the requests are made for a given sequence, then the
back end will in the background obtain all of the data necessary to respond
to all of the endpoints for future requests concerning that sequence without
going back to the OEIS. Note that this background work may take an appreciable
amount of time, especially if the sequence has lots of references within the
OEIS.

### URL: `api/get_oeis_values/<OEIS_ID>/<COUNT>`

This is the most rapid endpoint, it makes at most one request to the OEIS server
(and only if the OEIS_ID has not previously been requested). If you are running
the server to test it on your local host, a full URL would be
`http://127.0.0.1:5000/api/get_oeis_values/A000030/50` which will return the
first digits of the numbers 0 through 49.

#### Key: name

A string giving the official name of the OEIS sequence with id OEIS_ID,
if already known to backscope, or a temporary name if not.

#### Key: values

An array of _strings_ (of digits) giving the first COUNT values of the sequence
with id OEIS_ID. Since some sequence values correspond to extremely large
numbers, strings are used to avoid the limitations of any particular numeric
datatype.

### URL: `api/get_oeis_name_and_values/<OEIS_ID>`

This one is potentially a bit slower than the above URL, as it may make
an extra request to ensure that the name is correct. If you are running
the server on your local host, a full URL would be
`http://127.0.0.1:5000/api/get_oeis_name_and_values/A003173`, which will
return the nine Heegner numbers and their full name as an OEIS
sequence (basically, the name describes what a Heegner number is).

#### Key: name

A string giving the official name of the OEIS sequence with id OEIS_ID.

#### Key: values

An array of strings (of digits) giving all values of the sequence with id
OEIS_ID known to the OEIS.

### URL: `api/get_hash`

Returns the most recent git hash of the currently running version of
backscope.  If you are running the server on your local
machine, a full URL would be
`http://127.0.0.1:5000/api/get_hash`

#### Key: git_hash

A string showing the short hash resulting from calling 

```
git rev-parse --short HEAD
```

### URL: `api/get_oeis_metadata/<OEIS_ID>`

A potentially very slow endpoint (if the sequence is unknown to the backscope);
may make hundreds of requests to the OEIS to generate all of the back
references to the sequence. If you are running the server on your local
machine, a full URL would be
`http://127.0.0.1:5000/api/get_oeis_metadata/A028444` which will show the full
name of the Busy Beaver sequence, the one text line of sequences it
references, and the IDs of the ten sequences that refer to it.

#### Key: name

A string giving the official name of the OEIS sequence with id OEIS_ID.

#### Key: xrefs

A string which is the concatenation (separated by newlines) of all of the
OEIS text "xref" records for the sequence with id OEIS_ID.

#### Key: backrefs

An array of strings giving all OEIS ids that mention the given OEIS_ID.

### URL: `api/get_oeis_factors/<OEIS_ID>/<COUNT>`

This could take a long time. It internally does everything that the endpoint
`get_oeis_metadata` does, and then once the result is stored in the database
it proceeds to factor the first `<COUNT>` terms of the sequence (or all of them
if there are not that many). If you are running the server to test it on your
local host, a full URL would be
`http://127.0.0.1:5000/api/get_oeis_factors/A006862/50` which will return the
factorizations of 1 + the product of the first n primes, for n < 50. The
first 42 terms will be factored and larger terms will return `no_fac` (since
they are deemed too large to factor in a reasonable time).

The factorization is performed by pari: `https://pari.math.u-bordeaux.fr/`.
Previous factorization requests are cached in the database for efficiency.
Returns the following data:

#### Key: name

A string giving the official name of the OEIS sequence with id OEIS_ID.

#### Key: factors

An array whose indices match the indices of the values of the sequence.
The format of each entry is a string of the form

`[[p,e],[q,f],...]`

where each entry `[p,e]` represents a factor of the prime p to the power e. If
an integer is negative, `[-1,1]` is included. If the integer is 1, the
factorization is `[]` (empty). If the integer is 0, the factorization
is `[[0,1]]`. Any successful factorization has the property that if you
multiply 1 times the product of `p^e` for all `[p,e]` in the array, you
obtain the original value. This format is essentially that supported by pari.
If the integer exceeds 2^200, the factorization is not attempted and
the factorization is stored as `no_fac`.
