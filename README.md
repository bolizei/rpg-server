# rpg-server
Launches a gameserver which listens for websocket connections. See [rpg-client](https://github.com/bolizei/rpg-client) for the client.

# Install
To install all dependencies, run `npm install`. After that, you can start the server with `node main.js`.

# Hot reload
If you want the server to reload when you change code, you can install the `nodemon` package:
`npm install nodemon`
and run the server with
`nodemon main.js`

# Database
You need to connect to a mysql/mariadb server. You can launch your own and specify the connection details in the settings.

# Settings
The default settings are in `settings/default.json` do not change them. Instead, create a `settings/user.json` and overwrite the settings you wish to change.
