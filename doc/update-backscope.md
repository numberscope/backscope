# How to update backscope

This assumes the latest changes have been thoroughly tested. When you
restart `backscope`, a script activates the virtual environment and
installs the latest dependencies.

1. Connect to the server: `ssh you@numberscope.colorado.edu`
2. Change user: `sudo -i -u scope`
3. Go to Git repo: `cd /home/scope/repos/backscope`
4. Get latest changes: `git pull origin main`
5. Restart: `sudo systemctl restart backscope`
