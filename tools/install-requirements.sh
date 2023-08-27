INVENV='import sys; exit(1) if sys.base_prefix == sys.prefix else 0;'
HASV="Installing backscope dependencies in virtual environment $VIRTUAL_ENV."
NOV='No Python virtual environment active, exiting...'
if python -c "$INVENV"; then echo "$HASV"; else echo "$NOV"; exit 1; fi

if ! pip install --upgrade pip; then echo "pip failed"; exit 1; fi
if ! (pip install wheel==0.41.2 && pip install Cython==0.29.36)
then echo "Install failure (wheel or Cython)"; exit 1
fi
if ! (pip install cysignals==1.11.2 && pip install cypari2==2.1.3)
then echo "Install failure (cysignals or cypari2)"; exit 1
fi 
if ! (pip install psycopg2-binary==2.9.7)
then echo "Failed to install psycopg2-binary"; exit 1
fi 
if ! pip install -r requirements-freeze.txt;
then echo "Failed to install remaining requirements"; exit 1
fi 
echo "Backscope dependencies successfully installed"
