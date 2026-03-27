require('dotenv').config();
const http = require('http');
const {
    Server: SocketIO
} = require('socket.io');

const app = require('./src/app');
const {
    startAMI
} = require('./src/services/asteriskService');
const socketService = require('./src/config/socket');
const {
    getWebhookInfo
} = require('./src/services/webhookService');

// Socket.IO event handlers
const {
    registerQueueSocketHandlers
} = require('./src/services/queueSocket');
const {
    registerCallSocketHandlers
} = require('./src/services/callSocket');
const {
    registerExtensionSocketHandlers
} = require('./src/services/extensionSocket');
const {
    registerMonitorSocketHandlers
} = require('./src/services/monitorSocket');
const PORT = process.env.SOCKET_PORT || 3000;

const server = http.createServer(app);
const io = new SocketIO(server, {
    pingTimeout: 60000,
    allowEIO3: true
});

socketService.setIO(io);

io.on('connection', (socket) => {
    console.log(`[Socket.IO] Client connected: ${socket.id}`);
    registerExtensionSocketHandlers(socket, io);
    registerQueueSocketHandlers(socket, io);
    registerCallSocketHandlers(socket, io);
    registerMonitorSocketHandlers(socket, io);
});




server.listen(PORT, () => {
    console.log(`[Server] Listening on port ${PORT}`);
    // Khởi động AMI và load webhook SAU KHI server đã sẵn sàng
    startAMI();
    setTimeout(getWebhookInfo, 2000);
});

process.on('SIGTERM', () => {
    console.log('[Server] SIGTERM received, shutting down...');
    server.close(() => process.exit(0));
});
process.on('SIGINT', () => {
    console.log('[Server] SIGINT received, shutting down...');
    server.close(() => process.exit(0));
});