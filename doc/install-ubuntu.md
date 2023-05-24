Installing backscope on Ubuntu
==============================

These instructions are for Ubuntu, a Linux distribution. If you are
trying to run backscope on a different Linux distribution or on a
different operating system, you will need to modify the commands and/or
the steps.

### Install Git

First, check if Git is installed:

```
which git
```

If you don't see any output:

```
sudo apt install git
```

### Clone backscope

If you are using HTTP:

```
git clone https://github.com/numberscope/backscope.git
```

If you are using SSH:

```
git clone git@github.com:numberscope/backscope.git
```

### Install pari-gp, required for cypari2

This is the actual PARI/GP package.

```
sudo apt install pari-gp
```

To verify that it was installed correctly, try to check the version of
`gp`:

```
gp --version
```

If you see some output about the version number, then you have likely
installed the package correctly.

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
sudo apt install build-essential
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

The output should be something like "Python 3.10.8". If you see a message about
not being able to find Python, or you don't see any output, you need to
troubleshoot your Python installation.

Depending on how you installed Python, the executable might be named `python3`.
In that case, issue the following command:

```shell
python3 --version
```

In all the remaining commands, substitute either `python` or `python3` for
`[PYEXEC]` depending on which of the above worked.

To check to see if you have a working `venv` module, issue the following
command:

```shell
[PYEXEC] -m venv -h
```

You should see help for the `venv` module.

Note that since you will (likely) be compiling the cypari2 Python
package, you will (likely) need a _full_ Python 3 installation, including
the "development header files." To check if these files are installed,
you can execute the following (very long) command:

```shell
[PYEXEC] -c "from distutils import sysconfig as s; from os.path import isfile; print(isfile(s.get_config_vars()['INCLUDEPY']+'/Python.h') and 'OK')"
```

If this command displays anything other than `OK` (such as `False` or an error
message) then your distribution is lacking these header files.

### Install python3-dev, required for cypari2

This is the Python development package. We need it to compile cypari2.

```
sudo apt install python3-dev
```

### Install the package that makes it so you can create a virtual environment

```
sudo apt install python3.xy-venv
```

`xy` is a version number, e.g. `python3.10-venv`.

### Create the virtual environment.

```
python3 -m venv venv
```

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

```
pip install -r requirements.txt
```