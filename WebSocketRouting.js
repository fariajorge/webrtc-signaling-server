const WebSocket = require('ws');
const PORT = 5000;

const wsServer = new WebSocket.Server({
    port: PORT
});

const clients = new Map();  // Stores clients with their unique IDs

// Function to generate unique client IDs
function generateUniqueID() {
    return 'client_' + Math.random().toString(36).substr(2, 9);
}

// Function to create a message in the format 'MessageType!Content'
function createMessage(type, content) {
    return `${type}!${content}`;
}

wsServer.on('connection', function (socket) {
    // Generate a unique client ID and add it to the clients map
    const clientID = generateUniqueID();
    clients.set(clientID, socket);

    // Some feedback on the console
    console.log(`A client just connected with ID: ${clientID}`);

    // Send client ID to the newly connected client
    socket.send(createMessage('CLIENTID', clientID));

    // Notify all clients about the new peer connection
    const connectedClients = JSON.stringify(Array.from(clients.keys()));
    const peerConnectedMessage = createMessage('PEERCONNECTED', connectedClients);
    wsServer.clients.forEach(function (client) {
        if (client.readyState === WebSocket.OPEN) {
            client.send(peerConnectedMessage);
        }
    });

    // Event: Message received from a client
    socket.on('message', function (msg) {
        console.log(`Received message from client ${clientID}: ${msg}`);

        // Forward the message to all other connected clients except the sender
        clients.forEach(function (client, id) {
            if (id !== clientID && client.readyState === WebSocket.OPEN) {
                client.send(msg);
            }
        });
    });

    // Event: Client disconnected
    socket.on('close', function () {
        clients.delete(clientID);
        console.log(`Client disconnected with ID: ${clientID}`);

        // Notify all clients about the disconnection
        const peerDisconnectedMessage = createMessage('PEERDISCONNECTED', clientID);
        wsServer.clients.forEach(function (client) {
            if (client.readyState === WebSocket.OPEN) {
                client.send(peerDisconnectedMessage);
            }
        });
    });
});
