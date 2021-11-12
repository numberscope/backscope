# Updating Backscope on the Numberscope Server

Here are the steps I plan on following. I'm roughly following the steps in
[this tutorial](https://www.digitalocean.com/community/tutorials/how-to-serve-flask-applications-with-uswgi-and-nginx-on-ubuntu-18-04).
These steps are part of the "Next Steps" described in
https://github.com/numberscope/backscope/issues/15#issuecomment-949974106.

The purpose of this document is to document the way the server was set up when
we found it and the steps we plan on taking to update it. This will almost
certainly not be the final setup. Once the repos are updated, we'll at least 
want to set up a generic PostgreSQL user, and create a separate
Nginx file in the `sites-available` directory. (Right now, the
`sites-available/default` file is being used.) Once things are set up properly,
I will add documentation for server administration. 

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
5. Copy NumberscopeFlask's `.env` file to `/srv/backscope`. As of this writing,
   backscope uses python-dotenv to read key-value pairs from a `.env` file
   (whose location is typically the root directory of the Git repository) and
   load those key-value pairs into Python's environment variables. That is,
   you should be able to use `os.getenv("KEY")` to get the value for `KEY`.
   Right now, the keys being used on the server are:
     * `APP_SETTINGS="config.developmentConfig"`
     * `DATABASE_URL="postgresql://localhost/numberscope"`
     * `SECRET_KEY` (Omitted for obvious reasons. Can be found in
       `/home/tlincke/.env`.)
     * `POSTGRES_USER="tlincke"`
     * `POSTGRES_PASSWORD` (Omitted for obvious reasons. Can be found in
       `/home/tlincke/.env`.)
     * `POSTGRES_DB="numberscope"`
   As I pointed out in [this comment](https://github.com/numberscope/backscope/pull/20#discussion_r739409318),
   I'm not sure `APP_SETTINGS` is actually being used. I think the correct key
   is `APP_ENVIRONMENT`. We'll ultimately want to change the PostgreSQL user.
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

Right now, the `numberscopeFlask.service` file looks like this. The
`backsocpe.service` file will need to be the same, except we'll need
to specify different directories.

```
[Unit]                                                                          
Description=uWSGI Python container server                                       
After=network.target                                                            
                                                                                
[Service]                                                                       
User=tlincke                                                                    
Group=www-data                                                                  
WorkingDirectory=/home/tlincke/prod/NumberscopeFlask                            
Environment="PATH=/home/tlincke/prod/NumberscopeFlask/.venv/bin"                
ExecStart=/home/tlincke/prod/NumberscopeFlask/.venv/bin/uwsgi --ini flaskr.ini  
                                                                                
[Install]                                                                       
WantedBy=multi-user.target  
```