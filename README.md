# Numberscope - backscope

Copyright 2020-2022 Regents of the University of Colorado.

This project is licensed under the
[MIT License](https://opensource.org/licenses/MIT). See the text of the MIT
License in LICENSE.md.

## What is backscope?

backscope is [Numberscope's](https://numberscope.colorado.edu) back end. It is
responsible for getting sequences and other data from the
[On-Line Encyclopedia of Integer Sequences](https://oeis.org). It also
performs computationally intensive preprocessing on the sequences that have
been requested, such as generating the prime factorizations of the entries.
Such pre-computations are used in many of the front-end visualizers, but
disruptive and wastefully repetitive if performed in each visitor's browser.

## Quick start

(Note there are also much more detailed, step-by-step instructions for
[installing backscope on Ubuntu](doc/install-ubuntu.md), which can perhaps
also be tailored to other Linux distributions or other operating systems.)

1. Install Git if need be and clone this repo from
   `github.com/numberscope/backscope`. Switch to the top-level directory
   of the clone.
2. Install prerequisites:
   + Python 3 (>= version 3.9)
   + The Python 3 dev package
   + A Python 3 package for creating virtual environments
   + A full installation of pari-gp (including all metadata files — you might
     need to install a package like "libpari-dev" on Ubuntu)
   + The GNU multi-precision arithmetic dev package
   + A C compiler and C build tools.
   See also the detailed Ubuntu instructions linked above.
3. Create a virtual environment, e.g., `python -m venv .venv`.
4. Activate the virtual environment, e.g., `source .venv/bin/activate`.
5. Install Python dependencies: `sh tools/install-requirements.sh`.
6. Install and configure PostgreSQL, create an empty database, and create
   a dotenv (`.env`) file with the database credentials.
   + Some details necessary for this step are found in
     [configuring PostgreSQL](doc/install-postgres.md).
7. Run backscope: `flask run`
   + See also detailed instructions for
     [running backscope](doc/running-backscope.md).

## More info

If you plan on developing backscope, you might find some of these useful:

- [Resetting the database](doc/resetting-the-database.md)
- [Understanding our requirements files](doc/requirements.md)
- [API endpoints](doc/api_endpoints.md)
- [Directory descriptions](doc/directory_descriptions.md)
- [Logging events](doc/logging.md)
- [Writing and running tests](doc/tests.md)

If you are a maintainer, you might find some of these useful:

- [Updating frontscope on the CU server](doc/update-frontscope.md)
- [Updating backscope on the CU server](doc/update-backscope.md)
- [Finding and reading logs](doc/logging.md)
- [Administering our server](doc/server-administration.md)
- [Administering the database](doc/database-administration.md)
- [README file for the server](server/README.md)
