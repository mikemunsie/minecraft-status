var lastFileReadContent = "";
var lastDateOnFileRead = 0;
var contents = "";
var iterations = 0;
var diedMessages = [
  "shot",
  "death",
  "escape",
  "drowned",
  "blew",
  "blown",
  "hit the ground",
  "fell from",
  "fell off",
  "squashed",
  "went up",
  "burnt",
  "into a fire",
  "swim in lava",
  "struck by",
  "slain by",
  "finished off",
  "fireballed",
  "fell out",
  "withered away",
  "pummeled by"
];

function getStatus(callback) {
  var results = {
    playersDead: []
  };
  iterations++;

  // Update the lastFileRead before we get the next
  var contentsLength = extractLines(lastFileReadContent).length;
  if (contentsLength > 1) {
    lastLine = extractLines(lastFileReadContent)[contentsLength-2];
    lastDateOnFileRead = extractDateFromLine(lastLine);
  }

  getContents(function(contents) {
    if (contents.toString() === lastFileReadContent.toString()) {
      return callback.call(this, results);
    }
    lastFileReadContent = contents;
    //if (iterations > 1) {
      results.playersDead = determineWhoDied(contents);
    //}
    callback.call(this, results);
  });
}

function extractDateFromLine(line) {
  var matches = line.match(/\[.*?\]/g);
  if (!matches) {
    return 0;
  }
  return parseInt(line.match(/\[.*?\]/g)[0].replace(/:|\[|\]/g,""));
}

function extractLines(contents) {
  return contents.split(/\r\n|\r|\n/);
}

function determineWhoDied(contents) {
  var playersDead = [];
  var usernameExp = /\: (.*)? /;
  var matches = [];
  var player = "";
  extractLines(contents).forEach(function(line) {
    if (extractDateFromLine(line) > lastDateOnFileRead) {
      diedMessages.forEach(function(diedMessage) {
        if (line.indexOf(diedMessage) > -1) {
          matches = usernameExp.exec(line);
          if (matches[1]) {
            playersDead.push(matches[1]);
          }
        }
      })
    }
  });
  return playersDead;
}

function getContents(callback) {
   request
    .get(minecraftStatus.latestLogFileURL)
    .buffer(true)
    .end(function(err, res) {
      if (callback) { 
        callback.call(this, res.text);
      }
    });
}

module.exports = {
  getStatus: getStatus
};