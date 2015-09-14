# minecraft-status
Exposes a restful service + Websocket to your Minecraft Server using NodeJS.

How to install:

**Step 1: Get NodeJS.**

https://docs.npmjs.com/getting-started/installing-node

**Step 2:**

Run the following command.
```
npm install
```

**Step 3:**

Configure your Minecraft Server and Log URL in the config.js

**Step 4:**

Run the application.

```
node app/bin/www
```

Your app should now be running on localhost:9000 or the port you defined in the config.js. There are two modes of retreiving the data: the restful service, or the websocket on the port the app is running on. For full effect, use the websocket ;) 

Note: Not all servers will display the player names. You will need to configure your server to display the names of the users who are on that server. Make sure enable-query is true in your server.properties file.

Read more about server props @ http://minecraft.gamepedia.com/Server.properties.

Enjoy!