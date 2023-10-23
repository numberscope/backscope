INVENV='import sys; exit(1) if sys.base_prefix == sys.prefix else 0;'
HASV="Installing backscope dependencies in virtual environment $VIRTUAL_ENV."
NOV='No Python virtual environment active, exiting...'
if python -c "$INVENV"; then echo "$HASV"; else echo "$NOV"; exit 1; fi

if ! pip install --upgrade pip; then echo "pip failed"; exit 1; fi
if ! pip install -r requirements-freeze.txt;
then echo "Failed to install remaining requirements"; exit 1
fi 
echo "Backscope dependencies successfully installed"
