// ==================================
// Modules
// ==================================

require("../config");
global.app = require('express')();
global.http = require('http').Server(app);
global.io = require('socket.io')(http);
global.Gamedig = require('gamedig');
global.hipchat = require('node-hipchat');
global._ =       require("lodash");
global.request = require("superagent");

// Local Modules
var logReader = require("./logReader");

// ==================================
// Variables
// ==================================

var lastState = {};
var state = {
  lastChecked: null,
  playersOnline: false,
  players: [],
  playersDead: []
};

var showPlayersOnlineMessage = {
  display: false,
  showed: false
};
var showPlayersOfflineMessage = {
  display: false,
  showed: false
};

var players = [];
var newOnlinePlayers = [];
var newOfflinePlayers = [];

// ==================================
// Routes
// ==================================

io.on('connection', function(socket) {

  // Iterate through the currently fetched state and let them know
  _.forEach(state.players, function(player) {
    broadcast("playerLoggedIn", player, socket);
  });
  if (state.playersOnline) {
    broadcast("playersOnline", null, socket);
  } else {
    broadcast("playersOffline", null, socket);
  }

});

app.get('/', function (req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify(state));
});

// ==================================
// Functionality
// ==================================

/**
 * Broadcast a message to the public or user connection
 *
 * @param  {string} type
 * @param  {string} message
 * @param  {obj} socket
 * @return {void}
 */
function broadcast(type, message, socket) {

  // Special logic for certain types of broadcasts
  switch (type) {

    case "playersOnline":
      showPlayersOnlineMessage.showed = true;
      break;

    case "playersOffline":
      showPlayersOfflineMessage.showed = true;
      break;
  }

  // Notify an individual vs all
  if (socket) {
    return socket.emit(type, message);
  }

  return io.sockets.emit(type, message);
}

/**
 * Get the status of the server (people online)
 * 
 * @param  {Function}
 * @return {void}
 */
function getStatus(callback) {
  Gamedig.query(
    {
      type: 'minecraftping',
      host: minecraftStatus.serverURL
    },
    function(newState) {
      if(!newState.error) {

        state.lastChecked = new Date().toString();

        // Don't do anything if it's not in a new state
        if (JSON.stringify(newState) === lastState) {
          setTimeout(getStatus, 500);
          return;
        }

        getOnlinePlayers(newState);
        updatePlayersStatus();
        notifyUsers();
        lastState = JSON.stringify(newState);
      }
      setTimeout(getStatus, 500);
    }
  );
}

/**
 * Get Server Log Status
 * 
 * @param  {Function}
 * @return {[type]}
 */
function getLogStatus(callback) {
  logReader.getStatus(function(status) {
    state.playersDead = status.playersDead;
    if (status.playersDead.length > 0) {
      _.forEach(status.playersDead, function(player) {
        broadcast("playerDied", player);
      });
    }
    setTimeout(getLogStatus, 500);
  });
}

/**
 * Get online players from the new state
 * 
 * @param {obj} newState
 * @return {void}
 */
function getOnlinePlayers(newState) {
  state.players = [];
  state.playersOnline = newState.players.length > 0;
  if (state.playersOnline) {
    newState.players.forEach(function(player) {
      state.players.push(player.name);
    });
  }
}

/**
 * Notify users when different events happen
 * 
 * @return {void}
 */
function notifyUsers() {

  // Notify the new online players
  _.each(newOnlinePlayers, function(player) {
    broadcast("playerLoggedIn", player);
  });

  // Notify of when a player goes offline
  _.each(newOfflinePlayers, function(player) {
    broadcast("playerLoggedOut", player);
  });

  // Notify when players are online
  if (showPlayersOnlineMessage.display && !showPlayersOnlineMessage.showed) {
    broadcast("playersOnline");
    showPlayersOnlineMessage.showed = true;
    showPlayersOfflineMessage.showed = false;
  }

  if (showPlayersOfflineMessage.display && !showPlayersOfflineMessage.showed) {
    broadcast("playersOffline");
    showPlayersOfflineMessage.showed = true;
    showPlayersOnlineMessage.showed = false;
  }
}

/**
 * Update all the players status based on who's logged in 
 * and who isn't
 * 
 * @return {void}
 */
function updatePlayersStatus() {
  var playerFound;
  newOfflinePlayers = [];
  newOnlinePlayers = [];

  _.each(players, function(player) {
    player.onlineChecked = false;
  });

  // Find the players who are currently online
  _.each(state.players, function(player) {
    playerFound = _.find(players, { name: player });
    if (!playerFound) {
      newOnlinePlayers.push(player);
      players.push({
        name: player,
        online: true,
        onlineChecked: true
      });
    } else {
      playerFound.onlineChecked = true;
      if (!playerFound.online) {
        playerFound.online = true;
        newOnlinePlayers.push(player);
      }
    }
  });

  // Get the players who are no longer online
  _.each(_.filter(players, {
    onlineChecked: false,
    online: true
  }), function(player) {
    newOfflinePlayers.push(player.name);
  });

  // Mark the users who weren't checked as offline
  _.each(_.filter(players, {
    onlineChecked: false
  }), function(player) {
    player.online = false;
  });

  // See if we need to broadcast an all players offline message
  if (!_.find(players, { online: true })) {
    if (!showPlayersOfflineMessage.showed) {
      showPlayersOfflineMessage.display = true;
      showPlayersOnlineMessage.display = false;
      showPlayersOnlineMessage.showed = false;
    }
  } else {
    if (!showPlayersOnlineMessage.showed) {
      showPlayersOnlineMessage.display = true;
      showPlayersOfflineMessage.display = false;
      showPlayersOfflineMessage.showed = false;
    }
  }

}

module.exports = {
  app: app,
  getStatus: getStatus,
  getLogStatus: getLogStatus
};