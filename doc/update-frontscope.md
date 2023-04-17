# How to update frontscope on the colorado.edu server

1. Connect to the server: `ssh you@numberscope.colorado.edu`
2. Change user: `sudo -i -u scope`
3. Go to Git repo: `cd /home/scope/repos/frontscope`
4. Get the latest changes: `git pull origin main`
5. Install dependencies: `npm install`
6. Build the web app: `npm run build`

Step 6 should output the built Numberscope web application (HTML, CSS,
bundled and minified JavaScript, images etc.) to the `dist` directory.

As of this writing, Nginx is configured to serve the `index.html` file
it finds in the `dist` directory for any `numberscope.colorado.edu` URL
except for those that match the `/api` pattern. (The `/api` pattern is
delegated to backscope.)

Unless you changed something in backscope, you shouldn't need to
restart the `numberscope` systemd service to update frontscope. You
might need to blow away your web browser's cache or open a private
browsing window in order to see the updated web app.