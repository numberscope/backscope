# `pre-commit` Hook

The `pre-commit` Git hook is a Bash script that runs before you make
a Git commit. It lives in the `tools` directory. You should install
it before you start developing `backscope`. To do so:

```
chmod +x tools/pre-commit
cp tools/pre-commit .git/hooks/
```