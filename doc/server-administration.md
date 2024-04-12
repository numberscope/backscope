# Server administration

As of this writing, `backscope` is running on a server in CU's math
building. For info on the point of contact for the server, ask one of
Numberscope's maintainers.

## How `backscope` is set up

In the `/home` directory, there's a directory `scope` for the user
`scope`. Within the `scope` directory, there's a `repos` directory.
Within the repos directory, there's a checkout of `backscope`.

We can't simply clone `backscope`, install its dependencies, and run the
Flask development server. We need to set `backscope` up as a production
server. To do this, we need something called a Web Server Gateway
Interface (WSGI). A WSGI allows a web server like Nginx or Apache to
forward requests to a Python application. There are lots of different
Python libraries that implement a WSGI. We use one called Gunicorn
(Green Unicorn).

We also need to set up a `.env` file in the root directory of that backscope
clone. This is done as for a development instance of backscope, as
described in the [postgres documentation](./install-postgres.md).
However, the environment variable `APP_ENVIRONMENT` should be set to
`production` rather than `development`. Also, as of 2023 Nov 16, there was an
additional environment variable `APP_SETTINGS` set to
`config.DevelopmentConfig`, but it is not apparent whether or how that
difference actually has any effect. It may likely be that `APP_SETTINGS` is
unnecessary.

In the `production.sh` script in the `server` directory of `backscope`,
we tell Gunicorn to run `backscope`. In `/etc/systemd/system/` there's a
symlinked `numberscope.service` file that runs the `production.sh`
script. (The `/etc/systemd/system/` is a directory that houses systemd
(system daemon) files.)

### `numberscope` systemd commands

Note: We named the systemd file `numberscope.service` because it is
responsible for serving `frontscope`'s built files as well as forwarding
`/api` requests to `backscope`.

Check status of `numberscope`:
```sh
sudo systemctl status numberscope
```

Restart `numberscope`:
```sh
sudo systemctl restart numberscope
```

Start `numberscope`:
```sh
sudo systemctl start numberscope
```

Stop `numberscope`:
```sh
sudo systemctl stop numberscope
```

### Accessing `numberscope` logs

You can see the standard error output of the backscope process via
`sudo journalctl -u backscope`. However, most diagnostic output is directed to
backscope's own rotating log files, in the `~scope/repos/backscope/logs`
directory.

## Updating the server to a new version of backscope

There are two main cases. If the change in version of backscope does not
involve any changes to database schema or changes to the data that should
be stored for any previously-downloaded sequences, then updating the server
should consist of three simple steps:

1. Log into the server and `cd ~scope/repos/backscope`.

2. `sudo -u scope git pull`

3. `sudo systemctl restart numberscope`

You can then try `sudo systemctl status numberscope` to see if the service
thinks it is running correctly, and you can point your browser for example at
`https://numberscope.colorado.edu/api/get_commit` or
`https://numberscope.colorado.edu/api/get_oeis_values/A000040/128` for
a list of the first 2^7 primes.

On the other hand, if there are changes that affect the structure or contents
of the database, then a slightly more involved procedure is necessary to first
remove the prior contents of the database and/or update its structure. While
that procedure can probably be cobbled together from the instructions here and
the database resetting documentation, the explicit steps should be listed here.
Please whoever next does this procedure, record here what works.

## How Nginx is set up

As of this writing, our Nginx configuration is simple. We preserve the
default configuration we get from Nginx upon installation with two
exceptions:

1. We symlink a file to the `/etc/nginx/sites-available` directory
   called `numberscope.conf`. Within the
   `/etc/nginx/sites-available/numberscope.conf` file, we configure
   Nginx to serve `frontscope`'s built files and to forward `/api`
   requests to the WSGI we set up using Gunicorn.
2. We remove the `default` site from the `/etc/nginx/sites-enabled`
   directory.

## Note on HTTPS

We used Certbot to create SSL certificates so that we can access
numberscope.colorado.edu using HTTPS. In doing so, some of the Nginx
configuration files were modified. Certbot seems to insert a comment
when it modifies your configuration files, so it should be obvious what
the Certbot modifications are.

## Steps for using Certbot

These are the steps followed to create SSL certificates. They can be
found
[here](https://certbot.eff.org/instructions?ws=nginx&os=debianbuster).

1. SSH into the server

SSH into the server running your HTTP website as a user with sudo
privileges.

2. Install snapd

You'll need to install snapd and make sure you follow any instructions
to enable classic snap support.

Follow [these instructions](https://snapcraft.io/docs/installing-snapd/)
on snapcraft's site to install snapd.

3. Ensure that your version of snapd is up to date

Execute the following instructions on the command line on the machine to
ensure that you have the latest version of snapd.

```sh
sudo snap install core; sudo snap refresh core
```

4. Remove certbot-auto and any Certbot OS packages

If you have any Certbot packages installed using an OS package manager
like apt, dnf, or yum, you should remove them before installing the
Certbot snap to ensure that when you run the command certbot the snap is
used rather than the installation from your OS package manager. The
exact command to do this depends on your OS, but common examples are
`sudo apt-get remove certbot`, `sudo dnf remove certbot`, or `sudo yum
remove certbot`.

5. Install Certbot

Run this command on the command line on the machine to install Certbot.

```sh
sudo snap install --classic certbot
```

6. Prepare the Certbot command

Execute the following instruction on the command line on the machine to
ensure that the certbot command can be run.

```sh
sudo ln -s /snap/bin/certbot /usr/bin/certbot
```

7. Choose how you'd like to run Certbot

Run this command to get a certificate and have Certbot edit your nginx
configuration automatically to serve it, turning on HTTPS access in a
single step.

```sh
sudo certbot --nginx
```

8. Test automatic renewal

The Certbot packages on your system come with a cron job or systemd
timer that will renew your certificates automatically before they
expire. You will not need to run Certbot again, unless you change your
configuration. You can test automatic renewal for your certificates by
running this command:

```sh
sudo certbot renew --dry-run
```

The command to renew certbot is installed in one of the following
locations:

    /etc/crontab/
    /etc/cron.*/*
    systemctl list-timers

9. Confirm that Certbot worked

To confirm that your site is set up properly, visit
https://yourwebsite.com/ in your browser and look for the lock icon in
the URL bar.
