
var app = require('http').createServer();

app.listen(8900);

function Game() {
    console.log('Game()');
    this.io = require('socket.io')(app);

    // Define a referência da lista de todos os Sockets conectados. 
    // Esta lista é atualizada automaticamente pelo socket.io.
    this.connectedSockets = this.io.sockets.connected;

    // Define a referência da lista de todas as salas ativas.
    // Esta lista é atualizada automaticamente pelo socket.io
    this.allRooms = this.io.sockets.adapter.rooms;

    this.addHandlers();
}

function Player(game, socket) {

    // Evita retenção do Player dentro dos handlers.
    var player = this;

    // Definindo referências do Socket e Game para serem acessadas pelo Player.
    this.socket = socket;
    this.game = game;

    // Aqui são definidos os comportamentos de todos os handlers.
    // Não devem ser atribuidas muitas linhas de código para cada handler 
    // pois estas linhas são alocadas novamente para cada Socket conectado.

    // Cada socket.on é executado quando o Game recebe um evento do Socket.

    this.socket.on('createRoom', function () {
        console.log(socket.name + ' on createRoom ');
        player.createRoom();
    });

    this.socket.on('userDisplayInfo', function (userDisplayInfo) {

        // Definindo um nome para o Socket, somente para debug.
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

    // Foram definidos todos os handlers.
    // Aqui o Player não precisa fazer mais nada alem disso.
}

// Implemantação das funções do Player.

Player.prototype.leaveAllRooms = function () {

    // Sai de todas as salas em que estiver dentro
    for (var roomId in this.socket.adapter.sids[this.socket.id]) {
        this.leaveRoom(roomId);
    }
};

Player.prototype.leaveRoom = function (roomId) {

    // Avisa aos Sockets da sala que está saindo.
    this.socket.broadcast.to(roomId).emit('removePlayer', this.socket.id);
    console.log(this.socket.name + ' broadcast emit removePlayer ');

    // Saindo da sala
    this.socket.leave(roomId);
};

Player.prototype.createRoom = function () {

    // Criando e entrando em uma sala.
    this.socket.join(this.socket.id);

    //Definindo roomId no Socket para marcar a sala criada.
    this.socket.roomId = this.socket.id;

    // Respondendo ao Socket para que ele saiba o seu id.
    this.socket.emit('mySocketId', this.socket.id);
    console.log(this.socket.name + ' emit mySocketId ');
};

Player.prototype.setUserDisplayInfo = function (userDisplayInfo) {

    // Definindo userDisplayInfo para manter informaçõees basicas do player
    // de forma que possam ser acessadas diretamente pelo Socket.
    this.socket.userDisplayInfo = [this.socket.id, userDisplayInfo];
};

Player.prototype.setUserInfo = function (userInfo) {

    // Definindo userInfo para manter todas as informacoes do player
    // de forma que possam ser acessadas diretamente pelo Socket.
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

    // Buscando informações de todas as salas do Game.
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

    // Respondendo ao Socket com a informação de uma sala e Sockets da sala. 
    this.socket.emit('roomInfo', roomInfo);
    console.log(this.socket.name + ' emit roomInfo ');
};

Player.prototype.joinRoom = function (roomId) {

    // Sai de todas as salas antes de entrar.
    this.leaveAllRooms();

    // Avisa aos Sockets da sala que esta entrando e envia suas informações básicas.
    this.socket.broadcast.to(roomId).emit('addPlayer', this.socket.userDisplayInfo);
    console.log(this.socket.name + ' broadcast emit addPlayer ');

    // Entrando na sala
    this.socket.join(roomId);

    // Definindo id da sala atual.
    this.socket.roomId = roomId;

    this.getRoomInfo(roomId);
};

Player.prototype.disconnect = function () {

    //Executa leaveRoom ao ser desconectado para avisar aos outros Sockets que foi desconectado.
    this.leaveRoom(this.socket.roomId);
};

// Fim da implementacao das funções do Player.


// Adicionando handlers ao Game
Game.prototype.addHandlers = function () {
    console.log('setHandlers()');

    // Evita retenção do Game dentro dos handlers.
    var game = this;

    // Todo evento connection passa por aqui.
    // Depois disso o tratamento dos outros eventos é definido pelo Player.
    this.io.sockets.on("connection", function (socket) {

        // Define um nome ao Socket, somente para debug.
        socket.name = socket.id;

        console.log(socket.name + ' on connection ');
        new Player(game, socket);
    });
};

// Start the game server
var game = new Game();
