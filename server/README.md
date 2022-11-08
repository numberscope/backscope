# Numberscope Server Configuration

The files contained in this directory are configuration files for
Numberscope's server.

* `numberscope.conf` symlinked to `/etc/nginx/sites-available`, which is
  then symlinked to `/etc/nginx/sites-enabled`
* `numberscope.service` symlinked to `/etc/systemd/system`
* `production.sh` run by `numberscope.service`

See `create-symlinks.sh` for the actual symlink commands. To add the
`numberscope` systemd service, run `add-numberscope-servicee.sh`.
