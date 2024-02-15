# Requirements

The `requirements.txt` file should only contain the "top-level" requirements
for backscope. That is, if we explicitly want a requirement, we list it
in `requirements.txt`. Once you've activated the virtual environment, you can
install the top-level requirements by calling
```
pip install -r requirements.txt
```

The full list of requirements, including both the top-level requirements and
their dependencies, is kept in `requirements-freeze.txt`. Once you've installed
the top-level requirements in the virtual environment, you can generate
`requirements-freeze.txt` by running the following command in a Posix shell:
```
pip freeze --all > requirements-freeze.txt
```
You should regenerate and update this file every time you install or update a
top-level requirement.

The `requirements.txt` file is analogous to frontscope's `package.json`,
and the `requirements-freeze.txt` is analogous to frontscope's
`package-lock.json`.

## Updating dependencies

Note the effect of installing from `requirements-freeze.txt` is to dictate the
exact version of each package that backscope depends on, directly or indirectly.
When it's time to update one of these packages, say 'Werkzeug', you can issue
a direct `pip install --upgrade Werkzeug`, make sure that the desired version
is installed, test the resulting backscope system, regenerate
`requirements-freeze.txt` as above, and finally submit a pull request
including the result.

When there is a new top-level requirement, or on occasion to check whether
there are new indirect dependencies or indirect dependencies that are no longer
needed, one can make fresh installation of backscope with an entirely new
virtual environment, and perform the initial installation of dependencies
directly from `requirements.txt` rather than from `requirements-freeze.txt`.
(Note you may likely need to perform the steps in
`tools/install-requirements.sh` by hand, with the desired version of each
of the packages listed there.)

If the new installation works properly, you can then execute the
`pip freeze --all` command (without overwriting `requirements-freeze.txt`) and
compare the results with the existing `requirements-freeze.txt`. If there
are differences that appear appropriate to use going forward, you can then
replace `requirements-freeze.txt` with the newly generated one and submit
the new version as (possibly part of) a pull request.

The above process is somewhat complicated by virtue of the fact that certain of
the dependencies must be installed in the proper order by the
`tools/install-requirements.sh` script. When there is a need to update any
of the packages explicitly listed in `tools/install-requirements.sh`, the
version number of that package must be updated in that script as well.

## Understanding dependencies

To help understand the dependency graph, you can call
```
bash tools/explain-requirements
```
after activating the virtual environment. This script classifies the packages in
`requirements-freeze.txt` by the roles they play in the current environment.

| Role | Meaning |
| --- | --- |
| Not installed | Not installed in the current environment. You might see packages in this category if you've created a fresh virtual environment by installing the packages in `requirements.txt`, but you haven't updated `requirements-freeze.txt` yet. If Backscope works in this environment, it should be safe to remove these packages from `requirements-freeze.txt`. |
| Not required | Installed, but neither required by a package in the current environment nor listed in `requirements.txt`. |
| Indirectly required | Installed, and required by a package in the current environment, but not listed in `requirements.txt`. Each package shown in this category is followed by the names of the packages that require it. |
| Directly required | Installed, and listed in `requirements.txt`. |