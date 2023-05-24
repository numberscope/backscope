Database administration
=======================

How the PostgreSQL database is set up
-------------------------------------

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

PostgreSQL commands
-------------------

Figure out who you are:
```sh
you@numberscope:~$ whoami
```

Change to the `scope` user:
```sh
you@numberscope:~$ sudo -i -u scope
```

Enter the Postgres shell:
```sh
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