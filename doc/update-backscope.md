# How to update backscope on the colorado.edu server

This assumes the latest changes have been thoroughly tested. When you
restart `backscope`, a script activates the virtual environment and
installs the latest dependencies.

1. Connect to the server: `ssh you@numberscope.colorado.edu`
2. Change user: `sudo -i -u scope`
3. Go to Git repo: `cd /home/scope/repos/backscope`
4. Get latest changes: `git pull origin main`
5. If you did anything with the files in the server directory (e.g. you
   renamed them) you might have to fix the symlinks. See the server's
   [README file](../server/README.md) for more info on the symlinks.
6. If you changed the Nginx `numberscope.conf` file:
     - Test Nginx's config: `sudo nginx -t`
     - Restart Nginx: `sudo systemctl restart nginx`
7. Restart: `sudo systemctl restart numberscope`
