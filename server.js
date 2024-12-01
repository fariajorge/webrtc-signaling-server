import { WebSocketServer } from 'ws';
import fetch from 'node-fetch';

// URL for fetching server configuration
const CONFIG_URL = 'https://pastebin.com/raw/Hg7wb80z';

// Map to store connected clients
const sockets = new Map(); // Stores clients with unique IDs

// Function to generate unique client IDs
function generateUniqueID() {
    return 'client_' + Math.random().toString(36).substr(2, 9);
}

// Function to create a message in the format 'MessageType!Content'
function createMessage(type, content) {
    return `${type}!${content}`;
}


// Function to initialize the WebSocket server
async function initializeServer() {
    try {
        // Fetch server configuration from Pastebin
        const response = await fetch(CONFIG_URL);
        const config = await response.json();

        // Extract IP and port from the configuration
        const serverIp = config.server.ip;
        const serverPort = process.env.PORT || config.server.port;

        // Create and start the WebSocket server
        const wss = new WebSocketServer({ host: serverIp, port: serverPort });
        console.log(`WebRTC: WebSocket server started on ws://${serverIp}:${serverPort}/Signaling`);

        // Handle incoming connections
        wss.on('connection', (socket) => {
            const clientID = generateUniqueID(); // Assign a unique ID to the client
            sockets.set(clientID, socket); // Store the client in the map

            console.log(`Client connected with ID: ${clientID}`);
            socket.send(createMessage('CLIENTID', clientID)); // Send client ID to the connected client

            // Notify all clients about the new peer connection
            const connectedClients = JSON.stringify(Array.from(sockets.keys()));
            const peerConnectedMessage = createMessage('PEERCONNECTED', connectedClients);
            console.log(`--->${peerConnectedMessage}`);

            sockets.forEach((socket) => {
                if (socket.readyState === WebSocket.OPEN) {
                    socket.send(peerConnectedMessage);
                }
            });

            // Handle incoming messages from the client
            socket.on('message', (message) => {
                console.log(`Message from ${clientID}: ${message}`);

                // Broadcast the message to all other clients
                sockets.forEach((socket, id) => {
                    console.log(`Looking at : will send ${message}`);
                    // console.log('Type of message:', typeof message);


                    if (id !== clientID && socket.readyState === WebSocket.OPEN) {
                        socket.send(message.toString());
                    }
                });


            });

            // Handle client disconnection
            socket.on('close', () => {
                console.log(`Client disconnected: ${clientID}`);

                // Notify all remaining clients about the disconnection
                const peerDisconnectedMessage = createMessage('PEERDISCONNECTED', clientID);
                sockets.forEach((client) => {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(peerDisconnectedMessage);
                    }
                });

                // Remove the client from the map
                sockets.delete(clientID);
            });
        });
    } catch (error) {
        console.error('Error initializing server:', error);
    }
}

// Start the server
initializeServer();
