Running backscope
=================

To run the development server:

```
python manage.py runserver
```

(You should also be able to do this via

```bash
export FLASK_APP=flaskr
flask run
```

if you prefer.)

By enabling debug mode, the server will automatically reload if code
changes, and will show an interactive debugger in the browser if an
error occurs during a request. To run the development server in "debug"
mode:

```
python manage.py runserver --debug
```

In either of these modes, the command should print a serries of messages.
One of these messages should be the URL the server is running on, typically
`http://127.0.0.1:5000/`. To test that the server is working correctly,
try visiting `<URL>/api/get_oeis_values/A000030/50` (substitute in the server
URL for `<URL>`). This should display the first digits of the numbers from
0 through 49.
