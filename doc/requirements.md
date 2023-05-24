Requirements
============

The `requirements.txt` file should only contain "top-level" requirements
for backscope. That is, if we explicitly want a requirement, we list it
in `requirements.txt`. If a requirement has dependencies, those are
listed in `requirements-freeze.txt`. To generate
`requirements-freeze.txt`, you can enter the following command if you
have the virtual environment activated in a Posix shell:

```
pip freeze > requirements-freeze.txt
```

Ideally, this file should be generated every time a "top-level"
dependency is installed.

The `requirements.txt` file is analogous to frontscope's `package.json`,
and the `requirements-freeze.txt` is analogous to frontscope's
`package-lock.json`.
