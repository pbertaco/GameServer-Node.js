
var app = require('http').createServer(function(request, response) {
    response.writeHead(200, {"Content-Type": "text/plain"});
    response.end("Server running at " + app.address().address + ":" + port);
});

app.listen(process.env.PORT || 8900);

function Game() {
    console.log('Game()');
    this.io = require('socket.io')(app);

    // Defines the list reference of all connected Sockets.
    // This list is updated automatically by socket.io.
    this.connectedSockets = this.io.sockets.connected;

    // Defines the list reference of all active rooms.
    // This list is updated automatically by socket.io
    this.allRooms = this.io.sockets.adapter.rooms;

    this.addHandlers();
}

function Player(game, socket) {

    // Prevents player retention within handlers.
    var player = this;

    // Defining Socket and Game references to be accessed by the Player.
    this.socket = socket;
    this.game = game;

    // Here the behaviors of all the handlers are defined.
    // Do not assign too many lines of code to each handler
    // because these lines are allocated again for each connected Socket.

    // Each socket.on is executed when the Game receives a Socket event.

    this.socket.on('createRoom', function () {
        console.log(socket.name + ' on createRoom ');
        player.createRoom();
    });

    this.socket.on('userDisplayInfo', function (userDisplayInfo) {

        // Defining a name for the Socket, only for debugging.
        socket.name = userDisplayInfo;

        console.log(socket.name + ' on userDisplayInfo ');
        player.setUserDisplayInfo(userDisplayInfo);
    });

    this.socket.on('userInfo', function (userInfo) {
        console.log(socket.name + ' on userInfo ');
        player.setUserInfo(userInfo);
    });

    this.socket.on('update', function (data) {
        console.log(socket.name + ' on update ');
        player.update(data);
    });

    this.socket.on('someData', function (data) {
        console.log(socket.name + ' on someData ');
        player.someData(data);
    });

    this.socket.on('leaveAllRooms', function () {
        console.log(socket.name + ' on leaveAllRooms ');
        player.leaveAllRooms();
    });

    this.socket.on('getAllRooms', function () {
        console.log(socket.name + ' on getAllRooms ');
        player.getAllRooms();
    });

    this.socket.on('getRoomInfo', function (roomId) {
        console.log(socket.name + ' on getRoomInfo ');
        player.getRoomInfo(roomId);
    });

    this.socket.on('joinRoom', function (roomId) {
        console.log(socket.name + ' on joinRoom ');
        player.joinRoom(roomId);
    });

    this.socket.on('disconnect', function () {
        console.log(socket.name + ' on disconnect ');
        player.disconnect();
    });

    // All handlers defined.
    // Here the Player does not have to do anything else besides that.
}

// Implemantação das funções do Player.

Player.prototype.leaveAllRooms = function () {

    // Leave all the rooms you are in
    for (var roomId in this.socket.adapter.sids[this.socket.id]) {
        this.leaveRoom(roomId);
    }
};

Player.prototype.leaveRoom = function (roomId) {

    // Tell the Sockets in the room that they are leaving.
    this.socket.broadcast.to(roomId).emit('removePlayer', this.socket.id);
    console.log(this.socket.name + ' broadcast emit removePlayer ');

    // Leaving the room
    this.socket.leave(roomId);
};

Player.prototype.createRoom = function () {

    // Creating and entering a room.
    this.socket.join(this.socket.id);

    // Defining roomId on the Socket to mark the created room.
    this.socket.roomId = this.socket.id;

    // Replying to Socket so that it knows its id.
    this.socket.emit('mySocketId', this.socket.id);
    console.log(this.socket.name + ' emit mySocketId ');
};

Player.prototype.setUserDisplayInfo = function (userDisplayInfo) {

    // Setting userDisplayInfo to keep basic player information
    // so that they can be accessed directly by the Socket.
    this.socket.userDisplayInfo = [this.socket.id, userDisplayInfo];
};

Player.prototype.setUserInfo = function (userInfo) {

    // Defining userInfo to keep all player information
    // so that they can be accessed directly by the Socket.
    this.socket.userInfo = userInfo;
};

Player.prototype.update = function (data) {
    for (var roomId in this.socket.adapter.sids[this.socket.id]) {
        this.socket.broadcast.to(roomId).emit('update', data);
        console.log(this.socket.name + ' broadcast emit update ');
    }
};

Player.prototype.someData = function (data) {
    for (var roomId in this.socket.adapter.sids[this.socket.id]) {
        this.socket.broadcast.to(roomId).emit('someData', data);
        console.log(this.socket.name + ' broadcast emit someData ');
    }
};

Player.prototype.getAllRooms = function () {

    // Seeking information from all rooms of the Game.
    for (var roomId in this.game.allRooms) {
        this.getRoomInfo(roomId);
    }
};

Player.prototype.getRoomInfo = function (roomId) {
    var room = this.game.allRooms[roomId];
    var roomInfo = {};
    roomInfo.roomId = roomId;
    roomInfo.usersDisplayInfo = [];
    for (var socketId in room.sockets) {
        var someSocket = this.game.connectedSockets[socketId];
        roomInfo.usersDisplayInfo.push(someSocket.userDisplayInfo);
    }

    // Responding to the Socket with the information of a room and Sockets of the room. 
    this.socket.emit('roomInfo', roomInfo);
    console.log(this.socket.name + ' emit roomInfo ');
};

Player.prototype.joinRoom = function (roomId) {

    // Leave all rooms before entering.
    this.leaveAllRooms();

    // Tell Sockets in the room that you are entering and send basic information.
    this.socket.broadcast.to(roomId).emit('addPlayer', this.socket.userDisplayInfo);
    console.log(this.socket.name + ' broadcast emit addPlayer ');

    // Entering the room
    this.socket.join(roomId);

    // Defining id of the current room.
    this.socket.roomId = roomId;

    this.getRoomInfo(roomId);
};

Player.prototype.disconnect = function () {

    // Performs leaveRoom when disconnected to notify the other Sockets that it has been disconnected.
    this.leaveRoom(this.socket.roomId);
};

// Fim da implementacao das funções do Player.


// Adding handlers to the game
Game.prototype.addHandlers = function () {
    console.log('setHandlers()');

    // Avoid game retention within handlers.
    var game = this;

    // Every connection event goes through here.
    // After that, the treatment of the other events is defined by the Player.
    this.io.sockets.on("connection", function (socket) {

        // Defines a name for the Socket, only for debugging.
        socket.name = socket.id;

        console.log(socket.name + ' on connection ');
        new Player(game, socket);
    });
};

// Start the game server
var game = new Game();
