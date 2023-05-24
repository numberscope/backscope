Numberscope - backscope
=======================

Copyright 2020-2022 Regents of the University of Colorado.

This project is licensed under the
[MIT License](https://opensource.org/licenses/MIT). See the text of the
MIT License in LICENSE.md.

What is backscope?
------------------

backscope is [Numberscope's](https://numberscope.colorado.edu) back end.
It is responsible for getting sequences and other data from the
[On-Line Encyclopedia of Integer Sequences](https://oeis.org).

Quick start
-----------

1. Clone this repo.
2. Install prerequisites: Git, Python 3, Python 3 dev package,
   Python 3 package for creating virtual environments, full installation
   of pari-gp (including all metadata files — you might need to install
   a package like "libpari-dev"), GNU multi-precision arithmetic dev
   package, a C compiler, and C build tools.
   + For detailed instructions on installing backscope on Ubuntu, see
     [this doc](doc/install-ubuntu.md).
3. Create a virtual environment: `python -m venv venv`.
4. Activate the virtual environment: `source venv/bin/activate`.
5. Install deps: `pip install -r requirements.txt`.
6. Install and configure PostgreSQL and create an empty database.
   + For detailed instructions on installing and configuring PostgreSQL,
     see [ths doc](doc/install-postgres.md).
7. Run backscope: `flask run`
   + For detailed instructions on running backscope, see
     [this doc](doc/running-backscope.md).

More info
---------

If you plan on developing backscope, you might find one of these useful:

- [How to format, lint, and test your code](doc/format-lint-test.md)
- [How to install a pre-commit hook](doc/pre-commit-hook.md)
- [How to do database migrations](doc/db-migrations.md)
- [How to reset your database](doc/db-reset.md)
- [Understanding our requirements files](doc/requirements.md)

If you are a maintainer, you might find one of these useful:

- [How to update frontscope on the CU server](doc/server-update-frontscope.md)
- [How to update backscope on the CU server](doc/server-update-backscope.md)
- [How to administer our server](doc/server-admin.md)
- [How to administer our database](doc/db-admin.md)