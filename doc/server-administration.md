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

In the `prod.sh` script in the root of `backscope`, we tell Gunicorn to
run `backscope`. In `/etc/systemd/system/` there's a `backscope.service`
file that runs the `prod.sh` script. (The `/etc/systemd/system/` is a
directory that houses systemd (system daemon) files.)

## `backscope` systemd commands

Check status of `backscope`:
```sh
sudo systemctl status backscope
```

Restart `backscope`:
```sh
sudo systemctl restart backscope
```

Start `backscope`:
```sh
sudo systemctl start backscope
```

Stop `backscope`:
```sh
sudo systemctl stop backscope
```

## How Nginx is set up

As of this writing, our Nginx configuration is simple. We preserve the
default configuration we get from Nginx upon installation with two
exceptions:

1. We add a file to the `/etc/nginx/sites-available` directory called
   `backscope`. Within the `/etc/nginx/sites-available/backscope` file,
   we configure Nginx to forward requests to the WSGI we set up using
   Gunicorn.
2. We remove the `default` site from the `/etc/nginx/sites-enabled`
   directory.

## Note on HTTPS

We used Certbot to create SSL certificates so that we can access
numberscope.colorado.edu using HTTPS. In doing so, some of the Nginx
configuration files were modified. Certbot seems to insert a comment
when it modifies your configuration files, so it should be obvious what
the Certbot modifications are.

## How the PostgreSQL database is set up

When you install Postgres, there's typically a default `postgres` user
and a default `postgres` database. We have maintained this setup. We
added a `scope` user and `scope` database. That way, if you are the
`scope` user on the CU server, and you issue the command `psql`, you
will be in the Postgres shell as the Postgres user `scope`, connected to
the `scope` database.

In `backscope`, we use SQLAlchemy, which provides an object relational
mapper (ORM). An ORM is a piece of software that looks at the objects
you define in your code and configures a relational database to store
those objects. Managing the tables, columns, etc. in the `scope`
database should be done (as much as possible) by SQLAlchemy.

## PostgreSQL commands

Figure out who you are:
```sh
you@numberscope:~$ whoami
```

Change to the `scope` user:
```
you@numberscope:~$ sudo -i -u scope
```

Enter the Postgres shell:
```
scope@numberscope:~$ psql
```

List relations:
```
scope=# \dt
```

List roles:
```
scope=# \du
```

Get help:
```
scope=# \?
```

Get even more help:
```
scope=# \h
```

Exit the Postgres shell:
```
scope=# \q
```
