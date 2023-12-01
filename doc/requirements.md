# Requirements

The `requirements.txt` file should only contain "top-level" requirements
for backscope. That is, if we explicitly want a requirement, we list it
in `requirements.txt`. If a requirement has dependencies, those are
listed in `requirements-freeze.txt`. To generate
`requirements-freeze.txt`, you can enter the following command if you
have the virtual environment activated in a Posix shell:

```
pip freeze --all > requirements-freeze.txt
```

This file should be regenerated and updated every time a "top-level"
dependency is installed or updated.

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
sh tools/explain-requirements.sh
```
after activating the virtual environment. This script goes through the packages in `requirements-freeze.txt` and tells you what role each one plays in the current environment. For each package `FROZEN` in `requirements-freeze.txt`, you'll get one of the following outputs:
- `FROZEN [required by] PARENT_1, PARENT_2, PARENT_3...`
   
   The package is required by the packages `PARENT_1`, `PARENT_2`, `PARENT_3`… in the current environment. That might means it's a lower-level requirement. However, it could be a top-level requirement: the top level should include all of the packages Backscope imports, even if they currently happen to require each other.
- `FROZEN [not required]`
   
   The package isn't required by any other package in the current environment. That probably means it's a top-level requirement: see if it's listed in `requirements.txt`.
- `FROZEN [not used]`
   
   The package isn't even installed in the current environment. You might see this if you've created a fresh virtual environment by manually installing the packages in `requirements.txt`, but you haven't updated `requirements-freeze.txt` yet. If Backscope works in this environment, it should be safe to remove `FROZEN` from `requirements-freeze.txt`.