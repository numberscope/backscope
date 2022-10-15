# How to update backscope

This assumes the latest changes have been thoroughly tested. When you
restart `backscope`, a script activates the virtual environment and
installs the latest dependencies.

1. Connect to the server: `ssh you@numberscope.colorado.edu`
2. Change user: `sudo -i -u scope`
3. Go to Git repo: `cd /home/scope/repos/backscope`
4. Get latest changes: `git pull origin main`
5. If you have modified the systemd `backscope.service` file or the
   Nginx `backscope` file, you need to remove the old copies and move
   the new copies into place. See
   [the server admin doc](./server-administration) for where these files
   should go on the server.
   - If you changed the Nginx backscope file:
     - Test Nginx's config: `sudo nginx -t`
     - Restart Nginx: `sudo systemctl restart nginx`
7. Restart: `sudo systemctl restart backscope`
