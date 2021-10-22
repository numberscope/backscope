# Updating Backscope on the Numberscope Server

Here are the steps I plan on following. I'm roughly following the steps in
[this tutorial](https://www.digitalocean.com/community/tutorials/how-to-serve-flask-applications-with-uswgi-and-nginx-on-ubuntu-18-04).
These steps are part of the "Next Steps" described in
https://github.com/numberscope/backscope/issues/15#issuecomment-949974106.

1. SSH to the Numberscope server.
2. `cd /srv`.
  * The previous students were serving the front end and the back end out of
    the `/home/nscope/prod` directory. I don't think this is idiomatic, and I
    don't have the password for the `nscope` user. My plan is to use the
    `/srv` directory for backscope and the `/var/www` directory for
    frontscope, as I think these are the most idiomatic directories.
3. `sudo git clone https://github.com/numberscope/backscope.git`.
4. Create a virtualenv using the commands in the README.
   ```sh
   $ virtualenv -p python3 .venv
   $ source .venv/bin/activate
   $ pip install -r requirements.txt
   ``` 
5. Copy NumberscopeFlask's `.env` file to `/srv/backscope`.
6. Use `pip` to install `uwsgi` and `flask` in our virtualenv.
7. Create a new systemd service unit file
   `/etc/systemd/system/backscope.service` based on the old one
   `/etc/systemd/system/numberscopeFlask.service`.
8. Make backups of files in `/etc/nginx/sites-available`.
9. Reconfigure Nginx to reverse proxy backscope. Instead of
   ```
   41         location /api {
   42                 include uwsgi_params;
   43                 uwsgi_pass unix:/home/tlincke/prod/NumberscopeFlask/project.sock;
   44         }
   ```
   in `/etc/nginx/sites-available/default` we'll have
   ```
   41         location /api {
   42                 include uwsgi_params;
   43                 uwsgi_pass unix:/srv/backscope/project.sock;
   44         }
   ```
   in `/etc/nginx/sites-available/default`.
10. Check for syntax errors: `sudo nginx -t`.
11. `sudo systemctl restart nginx` and
    `sudo systemctl start backscope.service`.
