# Installing backscope on Ubuntu

These step-by-step instructions are for (a fresh installation of the latest)
Ubuntu, a Linux distribution. They assume no prior knowledge concerning
the software used here.

If you are trying to run backscope on a different Linux distribution or on a
different operating system, you will need to modify some of the commands and/or
steps. There are some comments on modifications you might need to make
within the steps below. You may need to become more familiar with the details
of the various software packages needed in order to do this.

Note that you will likely need at least 4GB of memory in order to build and
install backscope and its dependencies.

### Install Git

First, check if Git is installed:

```
which git
```

If you don't see any output, then execute:

```
sudo apt install git
```

### Clone backscope

If you are using HTTP:

```
git clone https://github.com/numberscope/backscope.git
```

If you are using SSH (generally only useful if you have write permission to
the official repository):

```
git clone git@github.com:numberscope/backscope.git
```

Enter the top-level directory of the backscope installation:

```
cd backscope
```

All later commands in the installation sequence assume that you are in this
directory.

### Install pari-gp, required for cypari2

This is the actual PARI/GP package. You need to have a full installation,
including the help facility.

```
sudo apt install pari-gp
```

To verify that it was installed correctly, try to check the version of
`gp` and also try to get help for a PARI function:

```
gp --version
gphelp -detex factorial
```

If in the first case you see some output about the version number, and in the
second you see information about the factorial function, then you have likely
installed the package correctly. If the first succeeds but the second fails,
for example on a non-Ubuntu distribution, check to see if your package
manager has separated documentation for PARI/GP into a separately-installable
package and if so, install that as well.

### Install libpari-dev, which contains a file needed to install cypari2

This is the PARI library development package. It contains a `pari.desc`
file which is crucial for cypari2.

```
sudo apt install libpari-dev
```

Ensure the file exists:

```
ls -al /usr/share/pari
```

You should see a `pari.desc` file in that directory.

### Install libgmp-dev, required for cypari2

This is the package for the GNU multi-precision arithmetic library
developer tools.

```
sudo apt install libgmp-dev
```

### Install essential build tools, required for cypari2.

Essential build tools are used when we compile cypari2. The tools that
are installed are gcc, g++, gdb, etc. — the generic C/C++ toolkit.

```
sudo apt install build-essential autoconf
```

### Install Python 3

You need a version of Python at least equal to 3.5. (If you don't have
Python, install the latest stable version.) By installing a version of
Python greater than or equal to 3.5, you should get the package
installer for Python (`pip`) and a working `venv` module for creating a
virtual environment.

To check to see your Python version, issue the following command:

```shell
python --version
```

The output should be something like "Python 3.10.8", but possibly with
different numbers after the "3.". If you see a message about
not being able to find Python, or if you don't see any output, you need to
troubleshoot your Python installation.

Depending on how you installed Python, the executable might be named `python3`.
In that case, issue the following command:

```shell
python3 --version
```

In all the remaining commands, substitute either `python` or `python3` for
`[PYEXEC]` depending on which of the above worked.


### Install python3-dev, required for cypari2

This is the Python development package. We need it to compile cypari2:

```
sudo apt install python3-dev
```

Note that since you will (likely) be compiling the cypari2 Python
package, you will (likely) need a _full_ Python 3 installation, including
the "development header files." They should have been installed via the
command just above. To make certain these files are installed,
you can execute the following (very long) command:

```shell
[PYEXEC] -c "from distutils import sysconfig as s; from os.path import isfile; print(isfile(s.get_config_vars()['INCLUDEPY']+'/Python.h') and 'OK')"
```

If this command displays anything other than `OK` (such as `False` or an error
message) then your distribution is lacking these header files. This sort of
error should not occur on Ubuntu 20 or Ubuntu 22 if the above installation
commands have all executed successfully.


### Install the package that makes it so you can create a virtual environment

To make sure you have a working `venv` module, issue the following
command:

```shell
[PYEXEC] -m venv -h
```

You should see help for the `venv` module. If not, run
```shell
[PYEXEC] --version
```

which should produce a message of the form `Python 3.[XX].[YY]` where
`[XX]` and `[YY]` represent one- or two-digit numbers. Then run

```
sudo apt install python3.[XX]-venv
```

to install the proper package for creating virtual environments. You can
then re-execute the first command in this step to check it worked.

### Create the virtual environment.

```
[PYEXEC] -m venv .venv
```

Note that on recent Ubuntu installations, even though the test for the
presence of venv succeeds, this command to create a virtual environment
may fail. If so, it should give you a command to fix the situation. (If not,
try the installation step just above.) Execute the provided command and
then re-try creating the virtual environment.

### Activate the virtual environment

If you are using Bash:

```
source .venv/bin/activate
```

(If you are using a shell other than Bash, there might be an activate
script in the `.venv/bin/` directory for your shell.)

All remaining instructions assume that you have this virtual environment
activated. So if, for example, you stop and log out and come back later
and pick up the process, make sure to re-activate the virtual environment
by re-issuing the `source .venv/bin/activate` command in the top-level
directory of your backscope clone. Note also that once the virtual
environment is activated, the `python` command will invoke the proper
version of `python`, so you no longer need to worry about whether you
need to call `python3` or `python`. Hence, the remaining instructions
all just use `python`.

### Install dependencies

This installs all of backscope's dependencies listed in
`requirements.txt`.

```shell
sh tools/install-requirements.sh
```

Expect the step that compiles `cypari2` to take a significant amount of time.
If it fails saying that a compile command was killed, you may not have
enough memory available; you probably need at least 4GB.

### Install and configure PostgreSQL

First, install the PostgreSQL package:

```shell
sudo apt install postgresql
```

Next, create a database user for the backscope system to use. You may
use any name for the user (except `postgres`) but make a note of your
choice; you will need that user name in subsequent steps.

```shell
sudo -u postgres createuser --interactive
```

Note that this program uses the word "role" for "user name." Do not make
the new user ("role") a superuser, but do allow it to create databases.
Don't allow it to create more new roles.

Next we need to set the password for the new user. Again, you can use whatever
password you like, but make a note of it as you will need it later. Fill in
your choice where you see `<database password>` below.

```shell
sudo -u postgres psql
psql (XX.YY [version number with more version info here])
Type "help" for help.

postgres=# ALTER USER <backscope database user> with encrypted password '<database password>';
ALTER ROLE
postgres=# \q

```

Now we must allow password authentication for the new user. For this you
must use an editor to change one of the postgres configuration files. The
example command below uses the `nano` editor, but you may use any editor
of your choice. The location of the file depends on the Postgres version,
which was displayed when you started `psql` above. Insert that major version
number where you see `<XX>` below.

```shell
sudo nano /etc/postgresql/<XX>/main/pg_hba.conf
```

Use the editor to insert the following line into the file
just before the line `local  all        all         peer` -- substituting
your chosen user name, of course:

```
local  all      <backscope database user>       scram-sha-256
```

Save the file and then restart the PostgreSQL server:

```shell
sudo systemctl restart postgresql.service
```

This should allow your new user to create a database. As with the other
choices you are making in this process, remember the database name since you
will need it later.

```shell
createdb -U <backscope database user> -W <database name>
```

Now you may continue from the "Set up your environment" section of the
[Postgres configuration instructions](install-postgres.md).
