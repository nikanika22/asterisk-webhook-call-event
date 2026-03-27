# 📘 Phân Tích Toàn Bộ Project: CallCenter Node.js

> **Mục tiêu tài liệu:** Giải thích từng dòng code, mối quan hệ giữa các file, từ điểm khởi đầu là `server.js` xuyên suốt toàn bộ 32 file JS trong project. Dành cho người lần đầu tiếp cận công nghệ Node.js + Asterisk PBX.

---

## 🗺️ SƠ ĐỒ KIẾN TRÚC TỔNG QUAN

```mermaid
graph TB
    subgraph ENTRY["📦 Entry Point"]
        ENV[".env<br/>(biến môi trường)"]
        ENVJS["src/env.js<br/>(export config)"]
        SERVER["server.js<br/>(điểm khởi động)"]
        ENV -->|dotenv.config()| ENVJS
        ENVJS -->|import config| SERVER
    end

    subgraph CORE["⚙️ Core Infrastructure"]
        APP["src/app.js<br/>(Express app)"]
        DB["src/config/database.js<br/>(MySQL Connection Pool)"]
        AMI_CFG["src/config/asterisk.js<br/>(AMI Connection)"]
        SOCKET_CFG["src/config/socket.js<br/>(Socket.IO manager)"]
    end

    subgraph STATE["🧠 In-Memory State"]
        STORE["src/utils/store.js<br/>(arrDialState, arrWebhook, listUserConnected...)"]
    end

    subgraph MIDDLEWARE["🔧 Middlewares"]
        LOGGER["requestLogger.js"]
        ERROR_H["errorHandler.js"]
    end

    subgraph ROUTES["🛤️ Routes & Controllers"]
        ROUTES_API["src/routes/api.js"]
        CTRL_QUEUE["queueController.js"]
        CTRL_CALL["callController.js"]
        CTRL_EXT["extensionController.js"]
        CTRL_BLACK["blacklistController.js"]
        CTRL_WEBHOOK["webhookController.js"]
        CTRL_PB["phoneBridgeController.js"]
    end

    subgraph SERVICES["⚡ Business Services"]
        SVC_ASTERISK["asteriskService.js<br/>(Event Bus - Trung tâm)"]
        SVC_CALL["callService.js"]
        SVC_QUEUE["queueService.js"]
        SVC_WEBHOOK["webhookService.js"]
        SVC_EXT["extensionService.js"]
        SVC_BLACK["blacklistService.js"]
        SVC_PB["phoneBridgeService.js"]
        SVC_CALLEVENT["callEventService.js"]
    end

    subgraph SOCKET_HANDLERS["📡 Socket.IO Handlers"]
        SK_CALL["callSocket.js"]
        SK_QUEUE["queueSocket.js"]
        SK_EXT["extensionSocket.js"]
        SK_MONITOR["monitorSocket.js"]
    end

    subgraph MODELS["🗄️ Database Models"]
        BASE_MODEL["baseModel.js"]
        GROUP_MODEL["groupModel.js"]
    end

    subgraph UTILS["🧰 Utilities"]
        ENCODER["encoder.js<br/>(Base64)"]
        DATE_H["dateHelper.js<br/>(Timestamp)"]
        CHAN_H["channelHelper.js<br/>(Cắt chuỗi Channel)"]
    end

    subgraph EXTERNAL["🌐 External"]
        PBX["Asterisk PBX<br/>(Tổng đài điện thoại)"]
        MYSQL["MySQL Database"]
        WEBHOOKS["Third-party Webhooks<br/>(CRM, Zoho...)"]
        CLIENTS["Web Clients<br/>(React/Browser)"]
    end

    SERVER --> APP
    SERVER --> AMI_CFG
    SERVER --> SOCKET_CFG
    SERVER --> SVC_ASTERISK
    APP --> MIDDLEWARE
    APP --> ROUTES_API
    ROUTES_API --> CTRL_QUEUE & CTRL_CALL & CTRL_EXT & CTRL_BLACK & CTRL_WEBHOOK & CTRL_PB
    CTRL_QUEUE --> SVC_QUEUE
    CTRL_CALL --> SVC_CALL
    CTRL_EXT --> SVC_EXT
    CTRL_BLACK --> SVC_BLACK
    CTRL_WEBHOOK --> SVC_WEBHOOK
    CTRL_PB --> SVC_PB
    SVC_ASTERISK -->|emit events| SK_CALL & SK_QUEUE & SK_EXT & SK_MONITOR
    SVC_ASTERISK --> SVC_CALLEVENT
    SVC_CALLEVENT --> SVC_WEBHOOK
    AMI_CFG <-->|TCP Protocol| PBX
    DB <-->|SQL Queries| MYSQL
    GROUP_MODEL --> BASE_MODEL --> DB
    SVC_WEBHOOK --> GROUP_MODEL
    SOCKET_CFG -->|Socket.IO emit| CLIENTS
    SVC_WEBHOOK -->|HTTP POST| WEBHOOKS
```

---

## 📂 CẤU TRÚC THƯ MỤC

```
Project_Intern/
├── server.js              ← Điểm khởi động duy nhất
├── .env                   ← Biến môi trường (bí mật, không commit git)
└── src/
    ├── app.js             ← Cấu hình Express
    ├── env.js             ← Export config từ .env
    ├── config/
    │   ├── asterisk.js    ← Kết nối AMI tới Asterisk PBX
    │   ├── database.js    ← Kết nối MySQL connection pool
    │   └── socket.js      ← Quản lý Socket.IO instance
    ├── middlewares/
    │   ├── requestLogger.js   ← Log mọi HTTP request
    │   └── errorHandler.js    ← Bắt lỗi toàn cục
    ├── routes/
    │   └── api.js         ← Map URL → Controller
    ├── controllers/       ← Nhận HTTP request, trả response
    │   ├── queueController.js
    │   ├── callController.js
    │   ├── extensionController.js
    │   ├── blacklistController.js
    │   ├── webhookController.js
    │   └── phoneBridgeController.js
    ├── services/          ← Logic nghiệp vụ chính
    │   ├── asteriskService.js  ← ⭐ Trung tâm xử lý event PBX
    │   ├── callService.js
    │   ├── callEventService.js
    │   ├── queueService.js
    │   ├── webhookService.js
    │   ├── extensionService.js
    │   ├── blacklistService.js
    │   ├── phoneBridgeService.js
    │   ├── callSocket.js       ← Socket handler cuộc gọi
    │   ├── queueSocket.js      ← Socket handler hàng đợi
    │   ├── extensionSocket.js  ← Socket handler đăng nhập/trạng thái
    │   └── monitorSocket.js    ← Socket handler giám sát
    ├── models/            ← Tương tác Database
    │   ├── baseModel.js
    │   └── groupModel.js
    └── utils/             ← Hàm tiện ích dùng chung
        ├── store.js       ← State in-memory toàn cục
        ├── encoder.js     ← Mã hóa Base64
        ├── dateHelper.js  ← Xử lý thời gian
        └── channelHelper.js ← Phân tích chuỗi kênh Asterisk
```

---

## 1️⃣ `server.js` — Điểm Khởi Động

**Đường dẫn:** [`server.js`](file:///d:/STU/Intern/Project_Intern/server.js)

Đây là file đầu tiên được Node.js chạy khi bạn gõ `node server.js`. Nó là "bộ não" điều phối, khởi động mọi thứ theo đúng thứ tự.

```javascript
// Dòng 1: Load thư viện dotenv để đọc file .env vào process.env
require('dotenv').config();

// Dòng 2-3: Import module http gốc của Node.js và Socket.IO
const http = require('http');
const { Server: SocketIO } = require('socket.io');

// Dòng 5: Import app Express đã được cấu hình sẵn từ src/app.js
const app = require('./src/app');
// Dòng 6: Import hàm startAMI từ asteriskService (bắt đầu kết nối tổng đài)
const { startAMI } = require('./src/services/asteriskService');
// Dòng 7: Import module quản lý Socket.IO
const socketService = require('./src/config/socket');
// Dòng 8: Import hàm load cấu hình webhook từ Database
const { getWebhookInfo } = require('./src/services/webhookService');

// Dòng 11-14: Import 4 nhóm xử lý sự kiện từ Socket.IO client
const { registerQueueSocketHandlers } = require('./src/services/queueSocket');
const { registerCallSocketHandlers } = require('./src/services/callSocket');
const { registerExtensionSocketHandlers } = require('./src/services/extensionSocket');
const { registerMonitorSocketHandlers } = require('./src/services/monitorSocket');

// Dòng 16: Lấy port từ .env, mặc định 3000 nếu không có
const PORT = process.env.SOCKET_PORT || 3000;

// Dòng 18: Tạo HTTP server từ Express app
// ⚠️ Không dùng app.listen() trực tiếp vì Socket.IO cần share cùng HTTP server
const server = http.createServer(app);

// Dòng 19: Khởi tạo Socket.IO, gắn vào HTTP server
// pingTimeout: 60s = chờ 60 giây trước khi coi client bị ngắt kết nối
// allowEIO3: true = cho phép client dùng Socket.IO v2 cũ kết nối được
const io = new SocketIO(server, { pingTimeout: 60000, allowEIO3: true });

// Dòng 21: Lưu instance Socket.IO vào module socket.js để các file khác dùng
socketService.setIO(io);

// Dòng 23-29: Lắng nghe sự kiện "connection" - khi có Browser/Client kết nối WebSocket
io.on('connection', (socket) => {
    console.log(`[Socket.IO] Client connected: ${socket.id}`);
    // Đăng ký các event listeners cho từng nhóm chức năng
    registerExtensionSocketHandlers(socket, io); // Handles: userConnect, getStatusExtension, disconnect
    registerQueueSocketHandlers(socket, io);      // Handles: loginQueue, logoutQueue, pauseQueue...
    registerCallSocketHandlers(socket, io);       // Handles: click2call, hangupCall, transferCall...
    registerMonitorSocketHandlers(socket, io);    // Handles: chanspy, eavesDropCall, monitorAction...
});

// Dòng 31-36: Bắt đầu lắng nghe HTTP
server.listen(PORT, () => {
    console.log(`[Server] Listening on port ${PORT}`);
    startAMI();                    // ← Bắt đầu kết nối Asterisk PBX (SAU KHI server đã sẵn sàng)
    setTimeout(getWebhookInfo, 2000); // ← 2 giây sau mới load webhook config từ DB
    // ⚠️ Lý do setTimeout: Cho DB connection pool có thời gian khởi động
});

// Dòng 38-45: Xử lý tín hiệu tắt server (Ctrl+C hoặc kill process)
process.on('SIGTERM', () => { server.close(() => process.exit(0)); });
process.on('SIGINT', () => { server.close(() => process.exit(0)); });
```

**Mối quan hệ:** `server.js` phụ thuộc vào → `src/app.js`, `src/services/asteriskService.js`, `src/config/socket.js`, `src/services/webhookService.js`, và 4 socket handler files.

---

## 2️⃣ `src/env.js` — Cầu Nối Giữa `.env` và Code

**Đường dẫn:** [`src/env.js`](file:///d:/STU/Intern/Project_Intern/src/env.js)

```javascript
// Dòng 1: Gọi dotenv để nạp nội dung file .env vào process.env (biến toàn cục của Node)
require('dotenv').config();

// Dòng 3-19: Export một object có cấu trúc gọn, dễ dùng ở bất kỳ đâu
module.exports = {
    db: {
        host: process.env.DB_HOST || '127.0.0.1',  // Nếu không có trong .env thì dùng giá trị mặc định
        port: parseInt(process.env.DB_PORT) || 3306, // parseInt vì process.env luôn là string
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASS || '',
        database: process.env.DB_NAME || 'db_contactpopup',
    },
    ami: { // Thông tin kết nối Asterisk Manager Interface
        host: process.env.AMI_HOST || '127.0.0.1',
        port: parseInt(process.env.AMI_PORT) || 5038,
        user: process.env.AMI_USER || 'admin',
        password: process.env.AMI_PASS || 'admin',
    },
    socketPort: parseInt(process.env.SOCKET_PORT) || 3000, // Port cho cả HTTP và Socket.IO
    connectorServer: process.env.CONNECTOR_SERVER || 'voice_server_49', // Tên định danh server này
};
```

**Luồng dữ liệu:** `.env` → (qua `dotenv`) → `process.env` → `env.js` export → các file khác import.

---

## 3️⃣ `src/app.js` — Cấu Hình Express

**Đường dẫn:** [`src/app.js`](file:///d:/STU/Intern/Project_Intern/src/app.js)

```javascript
const express = require('express'); // Framework web
const bodyParser = require('body-parser'); // Parse JSON/form data từ request body

// Import các middleware và routes
const requestLogger = require('./middlewares/requestLogger');
const errorHandler = require('./middlewares/errorHandler');
const apiRoutes = require('./routes/api');

const app = express(); // Tạo ứng dụng Express

// Gắn middleware - chạy theo thứ tự từ trên xuống với MỌI request
app.use(requestLogger);                          // 1. Log request ra console
app.use(bodyParser.json({ limit: '10mb' }));     // 2. Parse JSON body (tối đa 10MB)
app.use(bodyParser.urlencoded({ extended: true })); // 3. Parse form URL-encoded

// Health check endpoint - trả về JSON khi truy cập /
app.get('/', (req, res) => res.json({ code: 200, message: 'CallCenter API running' }));

// Gắn toàn bộ routes vào 2 prefix (để tương thích cả cũ lẫn mới)
app.use('/api', apiRoutes); // http://host:3000/api/click2call
app.use('/', apiRoutes);    // http://host:3000/click2call (tương thích code cũ)

app.use(errorHandler); // Gắn error handler CUỐI CÙNG (Express quy định 4 tham số = error handler)
module.exports = app;
```

---

## 4️⃣ `src/config/asterisk.js` — Kết Nối Asterisk PBX

**Đường dẫn:** [`src/config/asterisk.js`](file:///d:/STU/Intern/Project_Intern/src/config/asterisk.js)

```javascript
const AsteriskManager = require('asterisk-manager'); // Thư viện npm kết nối Asterisk qua AMI protocol
const { ami: amiConfig } = require('../env'); // Lấy thông tin host/port/user/pass từ env.js

let amiInstance = null; // Biến singleton - chỉ tạo 1 kết nối duy nhất

function getAMI() {
    if (amiInstance) return amiInstance; // Nếu đã tạo rồi thì trả về luôn (tránh tạo 2 lần)

    // Khởi tạo kết nối AMI với thông tin từ .env
    // Tham số: port, host, user, password, keepEvents=true(nhận tất cả events)
    amiInstance = new AsteriskManager(
        amiConfig.port, amiConfig.host, amiConfig.user, amiConfig.password,
        true  // true = yêu cầu Asterisk gửi tất cả events về
    );

    amiInstance.keepConnected(); // Tự động reconnect khi mất kết nối TCP

    // Lắng nghe lỗi kết nối
    amiInstance.on('error', (err) => console.error('[AMI] Connection error:', err.message));
    amiInstance.on('close', () => console.warn('[AMI] Connection closed — will reconnect...'));

    return amiInstance;
}

module.exports = { getAMI }; // Export hàm getAMI, không export instance trực tiếp
```

**Mối quan hệ:** Được import bởi `asteriskService.js`, `callService.js`, `queueService.js`, `blacklistService.js`, `extensionService.js`, `callSocket.js`, `queueSocket.js`, `extensionSocket.js`, `monitorSocket.js` — gần như tất cả file cần điều khiển tổng đài.

---

## 5️⃣ `src/config/socket.js` — Quản Lý Socket.IO

**Đường dẫn:** [`src/config/socket.js`](file:///d:/STU/Intern/Project_Intern/src/config/socket.js)

```javascript
let ioInstance = null; // Singleton Socket.IO instance

function setIO(io) { ioInstance = io; }  // server.js gọi hàm này sau khi tạo io
function getIO() { return ioInstance; }   // Các file khác gọi getIO() để emit socket

// Gửi đến 1 user cụ thể theo extension của họ
function emitData(extension, data, type) {
    // Duyệt tất cả user đang kết nối, tìm người có extension khớp
    Object.keys(state.listUserConnected).forEach((index) => {
        if (state.listUserConnected[index]['extension'] === extension) {
            // Emit đến channel riêng của user đó: event = type + accountId
            ioInstance.sockets.emit(type + state.listUserConnected[index]['accountId'], data);
        }
    });
}

// Gửi đến tất cả user subscribe queue/extension cụ thể
function emitData2(event, data, type, check) {
    for (const key in state.listUserConnected) {
        if (state.listUserConnected[key][type] && state.listUserConnected[key][type].indexOf(check) > -1) {
            // Lấy socket cụ thể của user đó (theo socket.id)
            const socket = ioInstance.sockets.sockets.get(key);
            if (socket) socket.emit(event, encodeDataToClient(data)); // Emit chỉ đến socket đó
        }
    }
}
```

---

## 6️⃣ `src/config/database.js` — Kết Nối MySQL

**Đường dẫn:** [`src/config/database.js`](file:///d:/STU/Intern/Project_Intern/src/config/database.js)

```javascript
const mysql = require('mysql');
const { db } = require('../env'); // Lấy thông tin DB từ env.js

// createPool thay vì createConnection:
// Pool = duy trì sẵn nhiều kết nối (tối đa 10), tái sử dụng chúng
// Không phải mở/đóng connection mỗi lần query → nhanh hơn, ổn định hơn
const pool = mysql.createPool({
    host: db.host, port: db.port, user: db.user,
    password: db.password, database: db.database,
    connectionLimit: 10,  // Tối đa 10 kết nối đồng thời
    connectTimeout: 10000, // Timeout 10 giây
});

pool.on('error', (err) => console.error('[DB] Pool error:', err.message));
module.exports = pool; // Export pool để baseModel.js dùng
```

---

## 7️⃣ `src/utils/store.js` — Bộ Nhớ Tạm Toàn Cục (State)

**Đường dẫn:** [`src/utils/store.js`](file:///d:/STU/Intern/Project_Intern/src/utils/store.js)

> **Vì sao cần file này?** Asterisk PBX gửi hàng trăm events/giây. Nếu mỗi event phải query DB thì DB sẽ bị quá tải. Giải pháp: lưu tất cả dữ liệu "đang hoạt động" vào RAM (in-memory), chỉ đọc/ghi DB khi thực sự cần.

```javascript
const state = {
    // Trạng thái cuộc gọi đang diễn ra: key = uniqueid (mã định danh cuộc gọi từ Asterisk)
    arrDialState: {},
    // { '1710123456.123': { fromnumber: '1001', tonumber: '0987654321', status: 'ringing', starttime: '2025-03-19 21:00:00', ... } }

    // Dữ liệu cuộc gọi đã kết thúc (CDR - Call Detail Record)
    arrCompleteCall: {},
    // { '1710123456.123': { duration: 120, billableseconds: 90 } }

    // Map file ghi âm: key = uniqueid hoặc linkedid
    arrRecordingFile: {},
    // { '1710123456.123': { recordingfile: '/callrec/20250319_210000.WAV', call_type: 'in' } }

    // Thông tin queue của cuộc gọi
    arrQueue: {},
    // { '1710123456.123': { queue: 'sales', did: '0987654321' } }

    // Thông tin chanspy (nghe lén cuộc gọi)
    arrChanspy: {},

    // Cấu hình webhook, được load từ DB lúc khởi động, key = 'webhook-{id}'
    arrWebhook: {},
    // { 'webhook-42': { extensions: ['1001','1002'], queues: ['sales'], webhook_url: {...}, ... } }

    // User đang kết nối Socket.IO, key = socket.id
    listUserConnected: {},
    // { 'abc123xyz': { accountId: 'U001', extension: '1001', queues: ['sales'], ... } }
};
module.exports = state; // Export object tham chiếu → tất cả import đều dùng CÙNG 1 object
```

---

## 8️⃣ `src/middlewares/` — Middleware HTTP

### `requestLogger.js` ([xem file](file:///d:/STU/Intern/Project_Intern/src/middlewares/requestLogger.js))
```javascript
function requestLogger(req, res, next) {
    console.log(`[2025-03-19T21:00:00Z] POST /api/click2call`); // In timestamp + method + path
    next(); // ← QUAN TRỌNG: Phải gọi next() để Express tiếp tục xử lý
}
```

### `errorHandler.js` ([xem file](file:///d:/STU/Intern/Project_Intern/src/middlewares/errorHandler.js))
```javascript
// 4 tham số = Express nhận diện đây là Error Handler
function errorHandler(err, req, res, next) {
    console.error('[ERROR]', err);
    res.status(500).json({ code: 500, message: 'Internal server error', error: err.message });
}
```

---

## 9️⃣ `src/routes/api.js` — Bản Đồ API

**Đường dẫn:** [`src/routes/api.js`](file:///d:/STU/Intern/Project_Intern/src/routes/api.js)

File này không chứa logic. Nó chỉ khai báo "URL nào → hàm nào xử lý":

| URL | Method | Controller | Chức năng |
|-----|--------|-----------|-----------|
| `/addMemberToQueue` | POST | queueController.addMemberToQueue | Thêm tổng đài viên vào hàng đợi |
| `/removeMemberInQueue` | POST | queueController.removeMemberInQueue | Xóa tổng đài viên khỏi hàng đợi |
| `/pauseQueueAgent` | POST | queueController.pauseQueueAgent | Tạm dừng tổng đài viên |
| `/queueStatus` | POST | queueController.getQueueStatus | Xem trạng thái hàng đợi |
| `/getExtensionInQueue` | POST | queueController.getExtensionInQueue | Xem danh sách tổng đài viên trong queue |
| `/click2call` | POST | callController.click2call | Gọi điện từ Web/App (Click-to-Call) |
| `/transferCall` | POST | callController.transferCall | Chuyển cuộc gọi |
| `/muteCall` | POST | callController.muteCall | Tắt tiếng |
| `/hangup` | POST | callController.hangup | Cúp máy từ xa |
| `/holdCall` | POST | callController.holdCall | Giữ máy / bỏ giữ |
| `/getstatus` | GET/POST | extensionController.getStatus | Trạng thái máy nhánh |
| `/addBlacklist` | POST | blacklistController.addBlacklist | Thêm số vào blacklist |
| `/removeBlacklist` | POST | blacklistController.removeBlacklist | Xóa số khỏi blacklist |
| `/restartWebhook` | GET | webhookController.restartWebhook | Reload cấu hình webhook |
| `/updateConfigPhoneBridge` | GET | phoneBridgeController.updateConfigPhoneBridge | Reload config PhoneBridge |
| `/getZohoConfig` | GET | phoneBridgeController.getZohoConfig | Lấy config Zoho CRM |

---

## 🔟 `src/services/asteriskService.js` ⭐ — TRUNG TÂM XỬ LÝ

**Đường dẫn:** [`src/services/asteriskService.js`](file:///d:/STU/Intern/Project_Intern/src/services/asteriskService.js)

Đây là file quan trọng nhất. Hoạt động như một "trạm phân phối" — đón tất cả events từ Asterisk PBX rồi điều phối cho đúng nơi xử lý.

### Khởi tạo Event Bus

```javascript
// EventEmitter là lớp built-in của Node.js cho phép phát/lắng nghe sự kiện bất đồng bộ
const EventEmitter = require('events');
class AMIEventBus extends EventEmitter {} // Tạo lớp con kế thừa EventEmitter

// asteriskService là 1 object có thể:
// .emit('tenSuKien', data) → phát sự kiện
// .on('tenSuKien', fn) → lắng nghe sự kiện
const asteriskService = new AMIEventBus();
```

### Hàm `startAMI()` ([dòng 14-50](file:///d:/STU/Intern/Project_Intern/src/services/asteriskService.js#L14-L50))

```javascript
function startAMI() {
    if (isStarted) return; // Guard: chạy 1 lần duy nhất
    isStarted = true;
    const ami = getAMI(); // Lấy kết nối AMI từ config/asterisk.js

    // Khi TCP kết nối thành công với Asterisk
    ami.on('connect', () => {
        ami.action({ action: 'Events', eventmask: 'all' }, ...);
        // ↑ Lệnh AMI: "Tôi muốn nhận TẤT CẢ events (gọi, queue, extension...)"
    });

    // Đây là "họng nhận" chính — MỌI event từ Asterisk đều đi qua đây
    ami.on('managerevent', (evt) => {
        asteriskService.emit('managerevent', evt); // Phát lại cho handler catch-all

        const eventName = (evt.event || '').toLowerCase(); // VD: 'DialBegin' → 'dialbegin'
        if (eventName) {
            asteriskService.emit(eventName, evt); // Kích hoạt handler cụ thể cho event đó
        }
    });
}
```

### Vòng đời một cuộc gọi qua các events ([dòng 159-254](file:///d:/STU/Intern/Project_Intern/src/services/asteriskService.js#L159-L254))

#### Event `dialbegin` — Bắt đầu gọi ([dòng 160-186](file:///d:/STU/Intern/Project_Intern/src/services/asteriskService.js#L160-L186))
```javascript
asteriskService.on('dialbegin', (data) => {
    const channel = data.channel || '';          // VD: 'SIP/1001-0000a1b2'
    const destchannel = data.destchannel || '';   // VD: 'Local/0987654321@from-internal'
    const calleridnum = data.calleridnum || '';   // Số người gọi (nội bộ: '1001')
    const connectedlinenum = data.connectedlinenum || ''; // Số người nhận

    // Xác định đây là cuộc gọi outbound từ extension nội bộ ra ngoài
    if (channel.indexOf('SIP/') > -1 &&           // Channel bắt đầu bằng SIP/ (điện thoại IP)
        destchannel.indexOf('Local/') > -1 &&      // Đích là Local channel
        calleridnum.length < 5 &&                  // Số người gọi < 5 ký tự = số nội bộ (1001, 105...)
        connectedlinenum.length < 5) {             // Số nhận cũng < 5 ký tự
        
        const ext = checkExtension(channel); // Cắt 'SIP/1001-0000a1b2' → '1001'
        
        // Tìm webhook nào đang theo dõi extension này
        let webhook_select = null;
        for (const e in state.arrWebhook) {
            if (state.arrWebhook[e].extensions.indexOf(ext) > -1) {
                webhook_select = state.arrWebhook[e];
                break;
            }
        }

        if (webhook_select) {
            // Lưu trạng thái cuộc gọi vào RAM (store.js)
            state.arrDialState[data.uniqueid] = {
                fromnumber: calleridnum, tonumber: connectedlinenum,
                extension: ext, calltype: 'OutboundExtension',
                starttime: getTimeFormat(), status: 'ringing',
                callrefid: data.uniqueid, linkedid: data.linkedid,
                webhookurl: webhook_select['webhook_url']['callcenter'],
            };
            makeCallEventv2('ringing', data.uniqueid); // Gửi webhook "đang đổ chuông"
        }
    }
    // Luôn emit socket cho client dù là loại gọi nào
    socketService.getIO() && socketService.getIO().sockets.emit('dialbegin', encodeDataToClient(data));
});
```

#### Event `dialstate: ANSWER` — Nhấc máy ([dòng 192-198](file:///d:/STU/Intern/Project_Intern/src/services/asteriskService.js#L192-L198))
```javascript
asteriskService.on('dialstate', (data) => {
    if (data.dialstatus === 'ANSWER' && state.arrDialState[data.linkedid]) {
        state.arrDialState[data.linkedid].status = 'answered'; // Cập nhật trạng thái
        state.arrDialState[data.linkedid].answertime = getTimeFormat(); // Ghi nhận thời điểm bắt đầu nói
        makeCallEventv2('answered', data.linkedid); // Gửi webhook "đã nghe máy"
    }
});
```

#### Event `hangup` — Cúp máy ([dòng 201-215](file:///d:/STU/Intern/Project_Intern/src/services/asteriskService.js#L201-L215))
```javascript
asteriskService.on('hangup', (data) => {
    socketService.getIO().sockets.emit('hangup', encodeDataToClient(data)); // Thông báo client

    const uniqueid = data.uniqueid;
    if (state.arrDialState[uniqueid]) {
        if (!state.arrCompleteCall[uniqueid]) {
            state.arrCompleteCall[uniqueid] = {
                // Tổng thời gian cuộc gọi = Hiện tại - Thời điểm bắt đầu
                duration: getDurationTime(getTimeFormat(), state.arrDialState[uniqueid].starttime),
                // Thời gian nói chuyện thực (billsec). Nếu chưa nghe máy thì = 0
                billableseconds: state.arrDialState[uniqueid].status === 'answered'
                    ? getDurationTime(getTimeFormat(), state.arrDialState[uniqueid].answertime)
                    : 0,
            };
        }
        makeCallEventv2('hangup', uniqueid); // Gửi webhook "đã cúp máy"
        // Đợi 2 giây rồi mới gửi CDR (chờ Asterisk chốt xong số liệu)
        setTimeout(() => { makeCallEventv2('cdr', uniqueid); }, 2000);
    }
});
```

#### Event `managerevent` catch-all — Bắt các event đặc biệt ([dòng 218-254](file:///d:/STU/Intern/Project_Intern/src/services/asteriskService.js#L218-L254))

```javascript
asteriskService.on('managerevent', (data) => {
    const event = (data.event || '').toUpperCase();

    // Xử lý NEWEXTEN: Khi Asterisk thực thi dialplan và gặp lệnh MixMonitor/AGI
    // Đây là lúc có thể lấy tên file ghi âm
    if (event === 'NEWEXTEN' && data.appdata && data.appdata.match('.WAV')) {
        // Xác định loại cuộc gọi
        if (curContext === 'sub-record-check' || curContext === 'agentqueue') {
            resCallInfo.call_type = 'in'; // Cuộc gọi vào
        } else if (curContext === 'macro-hangupcall') {
            resCallInfo.call_type = 'out'; // Cuộc gọi ra
        }
        // Lưu tên file ghi âm vào store để sau khi CDR thì ghép link
        state.arrRecordingFile[...] = resCallInfo;
    }

    // DEVICESTATECHANGE: Trạng thái thiết bị thay đổi (online/offline/busy)
    if (event === 'DEVICESTATECHANGE') {
        const ext = (data.device || '').split('/').pop(); // 'SIP/1001' → '1001'
        // Tìm webhook theo dõi extension này và gửi thông báo AgentStatus
        for (const key in state.arrWebhook) {
            if (state.arrWebhook[key].extensions.indexOf(ext) > -1) {
                const params = { object: 'call', event: 'AgentStatus', value: { extension: ext, status: data.state.toLowerCase() } };
                sendPostRequestv2(state.arrWebhook[key]['webhook_url']['callcenter'], params);
            }
        }
    }
});
```

---

## 1️⃣1️⃣ `src/services/callEventService.js` — Tổng Hợp Dữ Liệu Cuộc Gọi

**Đường dẫn:** [`src/services/callEventService.js`](file:///d:/STU/Intern/Project_Intern/src/services/callEventService.js)

Có 2 phiên bản hàm:
- `makeCallEvent()` → Gửi qua **Socket.IO** (dùng cho hệ thống cũ)
- `makeCallEventv2()` → Gửi qua **HTTP Webhook POST** (dùng cho hệ thống mới, được gọi bởi asteriskService)

```javascript
function makeCallEventv2(type, callid) {
    if (!state.arrDialState[callid]) return; // Bảo vệ: không làm gì nếu không có dữ liệu

    const params = { object: 'call', event: type, value: {} };
    // Deep clone để tránh mutate object gốc
    const data = JSON.parse(JSON.stringify(state.arrDialState[callid]));

    switch (type) {
        case 'answered':  // Ghi nhận thời điểm nghe máy
            data.answertime = getTimeFormat();
            state.arrDialState[callid].answertime = getTimeFormat();
            state.arrDialState[callid].status = 'answered';
            break;

        case 'hangup':    // Tính thời gian cuộc gọi
            params.value.duration = getDurationTime(getTimeFormat(), state.arrDialState[callid].starttime);
            params.value.billsec = (data.status === 'answered')
                ? getDurationTime(getTimeFormat(), state.arrDialState[callid].answertime)
                : 0; // Nếu không nghe máy thì billsec = 0 (cuộc gọi nhỡ)
            break;

        case 'cdr':       // Chốt cuộc gọi — ghép link file ghi âm
            if (data.status === 'answered') {
                params.event = 'completed'; // Đổi event name thành 'completed'
                params.value.duration = state.arrCompleteCall[callid].duration;
                params.value.billsec = state.arrCompleteCall[callid].billableseconds;
                // Tìm file ghi âm và tạo URL có thể truy cập
                if (state.arrRecordingFile[callid]) {
                    const recFile = state.arrRecordingFile[callid].recordingfile.substr(1);
                    // Encode tên file thành Base64 để giấu đường dẫn thật
                    params.value.recording_file = data.recordingurl + 'cvf.php?f=' + encodeDataToBase(recFile);
                }
            } else {
                params.event = 'misscall'; // Cuộc gọi nhỡ
            }
            break;
    }

    const url = params.value.webhookurl; // Lấy URL webhook
    // Xóa thông tin nhạy cảm trước khi gửi ra ngoài
    delete params.value.webhookurl;
    delete params.value.recordingurl;

    sendPostRequestv2(url, params); // Gửi HTTP POST đến webhook
}
```

---

## 1️⃣2️⃣ `src/services/webhookService.js` — Bộ Điều Phối Webhook

**Đường dẫn:** [`src/services/webhookService.js`](file:///d:/STU/Intern/Project_Intern/src/services/webhookService.js)

### `getWebhookInfo()` — Load cấu hình từ DB vào RAM ([dòng 19-54](file:///d:/STU/Intern/Project_Intern/src/services/webhookService.js#L19-L54))
```javascript
function getWebhookInfo() {
    state.arrWebhook = {}; // Reset trước khi load lại
    groupModel.getActiveWebhooks(connectorServer).then((rows) => {
        rows.forEach((item) => {
            // Phân tích chuỗi 'ext1,ext2##queue1,queue2$$ext3##queue3'
            // '$$' ngăn cách các nhóm hotline
            const hlExtsQueues = item.hl_exts_queues.split('$$');
            hlExtsQueues.forEach((hlInfo) => {
                hlInfo = hlInfo.split('##');       // Tách extensions và queues
                const extTmp = hlInfo[0].split(','); // VD: '1001,1002' → ['1001', '1002']
                extTmp.forEach((ext) => {
                    if (ext.length < 6) extensions.push(ext); // < 6 ký tự = số nội bộ (1001)
                    else if (ext.length > 7) did.push(ext);   // > 7 ký tự = số DID (0987654321)
                });
                const queueTmp = hlInfo[1].split(','); // VD: 'sales,support' → ['sales', 'support']
            });

            // Parse JSON strings thành object: webhook_url, webhook_info, webhook_type
            item.webhook_url = item.webhook_url ? JSON.parse(item.webhook_url) : {};
            item.webhook_info = item.webhook_info ? JSON.parse(item.webhook_info) : {};
            state.arrWebhook['webhook-' + item.id] = item; // Lưu vào RAM
        });
    });
}
```

### `sendPostRequestv2()` — Gửi HTTP POST đến Webhook ([dòng 83-129](file:///d:/STU/Intern/Project_Intern/src/services/webhookService.js#L83-L129))
```javascript
function sendPostRequestv2(url, params) {
    if (!checkPostRequest(params)) return; // Kiểm tra xem sự kiện này có được cấu hình gửi không

    // Gửi HTTP POST đến URL webhook
    const opts = { method: 'POST', body: params, json: true, url, rejectUnauthorized: false };
    request(opts, (err, res, body) => {
        if (err) { console.log(err); return; }
        _cleanupAfterCall(params); // Sau khi gửi xong CDR/misscall → xóa data khỏi RAM
    });
}

// Dọn dẹp RAM sau khi cuộc gọi hoàn tất
function _cleanupAfterCall(params) {
    const id = params.value.callrefid;
    if (['completed', 'misscall'].indexOf(params.event) > -1) {
        if (state.arrDialState[id]) delete state.arrDialState[id]; // Xóa trạng thái cuộc gọi
        if (state.arrQueue[id]) delete state.arrQueue[id];
        if (state.flagEvent[id]) delete state.flagEvent[id];
    }
}
```

---

## 1️⃣3️⃣ `src/services/callService.js` — Điều Khiển Cuộc Gọi Qua AMI

**Đường dẫn:** [`src/services/callService.js`](file:///d:/STU/Intern/Project_Intern/src/services/callService.js)

```javascript
// click2call: Gọi ra từ API HTTP request (Web bấm gọi)
async function click2call(data) {
    return new Promise((resolve, reject) => {
        const callInfo = {
            action: 'originate',        // Lệnh AMI để khởi tạo cuộc gọi
            channel: data.channel,       // Kênh của tổng đài viên (VD: 'SIP/1001')
            context: data.context,       // Dialplan context
            callerid: '1' + data.callerid, // Thêm '1' vào đầu để nhận dạng click2call
            exten: data.callerid,        // Số cần gọi đến
            priority: 1, async: true,
        };
        ami.action(callInfo, (err, response) => {
            if (err) return reject(err);
            resolve(response);
        });
    });
}

// Khởi tạo lại dữ liệu hiển thị khi user kết nối
function callActionInitUserConnect() {
    ami.action({ action: 'QueueSummary' }, () => {});  // Lấy tóm tắt tất cả hàng đợi
    ami.action({ action: 'QueueStatus' }, () => {});   // Lấy chi tiết thành viên trong queue
    ami.action({ action: 'ExtensionStateList' }, () => {}); // Trạng thái tất cả extensions
    ami.action({ action: 'CoreShowChannels' }, () => {}); // Các kênh đang hoạt động
}
```

---

## 1️⃣4️⃣ Socket Handlers — Xử Lý Lệnh Từ Browser

### `extensionSocket.js` — Đăng Nhập & Trạng Thái ([xem file](file:///d:/STU/Intern/Project_Intern/src/services/extensionSocket.js))

```javascript
// Khi Browser kết nối Socket.IO và gửi event 'userConnect'
socket.on('userConnect', (clientConnect) => {
    // clientConnect = { accountId: 'U001', extension: '1001', queues: ['sales'], ... }
    clientConnect.socketId = socket.id;
    clientConnect.channel = `Local/${clientConnect.extension}@from-queue/n`; // Channel AMI

    // Truy vấn Asterisk trạng thái extension ngay lúc kết nối
    ami.action({ action: 'ExtensionState', exten: clientConnect.extension, Context: 'ext-local' }, 
        (err, res) => { io.sockets.emit('deviceStatus', ...); }
    );

    // Lưu thông tin user vào RAM (store.js)
    state.listUserConnected[socket.id] = clientConnect;
});

// Khi browser đóng tab / mất kết nối
socket.on('disconnect', () => {
    delete state.listUserConnected[socket.id]; // Xóa user khỏi danh sách đang kết nối
});
```

### `callSocket.js` — Lệnh Gọi Từ Browser ([xem file](file:///d:/STU/Intern/Project_Intern/src/services/callSocket.js))

```javascript
socket.on('click2call', (req) => {
    // req = { called: '0987654321', ... }
    const data = state.listUserConnected[socket.id]; // Lấy thông tin user từ RAM
    const callInfo = { action: 'originate', channel: data.channelOut, exten: req.called, ... };
    ami.action(callInfo, (err, res) => { ... }); // Gửi lệnh gọi đến Asterisk
});
```

### `monitorSocket.js` — Giám Sát Cuộc Gọi ([xem file](file:///d:/STU/Intern/Project_Intern/src/services/monitorSocket.js))

```javascript
socket.on('chanspy', (data) => {
    // Nghe lén cuộc gọi: gọi originate với application 'chanspy'
    // 'qw': q=quiet, w=whisper (có thể nói chuyện với tổng đài viên mà caller không nghe thấy)
    const callInfo = { action: 'originate', application: 'chanspy',
        data: `SIP/${data.spyExten},qw`, ... };
    ami.action(callInfo, ...);
});
```

---

## 1️⃣5️⃣ Models — Tương Tác Database

### `baseModel.js` ([xem file](file:///d:/STU/Intern/Project_Intern/src/models/baseModel.js))

```javascript
class BaseModel {
    constructor(tableName) { this.tableName = tableName; }

    // Wrapper cho pool.query(), trả về Promise thay vì callback
    query(sql, params = []) {
        return new Promise((resolve, reject) => {
            pool.query(sql, params, (error, results) => {
                if (error) return reject(error);
                resolve(results);
            });
        });
    }

    // CRUD generics
    findAll(conditions = {}) { /* SELECT * FROM {table} WHERE ... */ }
    findById(id) { /* SELECT * FROM {table} WHERE id = ? LIMIT 1 */ }
    create(data) { /* INSERT INTO {table} SET ? */ }
    update(id, data) { /* UPDATE {table} SET ? WHERE id = ? */ }
    delete(id) { /* DELETE FROM {table} WHERE id = ? */ }
}
```

### `groupModel.js` ([xem file](file:///d:/STU/Intern/Project_Intern/src/models/groupModel.js))

Kế thừa `BaseModel` và thêm các query phức tạp:
- `getActiveWebhooks(connectorServer)` — JOIN `groups` + `group_hotline`, lấy cấu hình webhook active
- `getBySecret(secret)` — Xác thực secret key
- `getZohoConfigs()` — JOIN `groups` + `zoho_config`, dùng cho PhoneBridge

---

## 1️⃣6️⃣ Utilities — Hàm Tiện Ích

### `encoder.js` ([xem file](file:///d:/STU/Intern/Project_Intern/src/utils/encoder.js))
```javascript
// Mã hóa object thành Base64 string trước khi gửi lên Socket.IO client
function encodeDataToClient(data) {
    return Buffer.from(JSON.stringify(data)).toString('base64');
    // {foo: 'bar'} → '{"foo":"bar"}' → 'eyJmb28iOiJiYXIifQ=='
}
```

### `dateHelper.js` ([xem file](file:///d:/STU/Intern/Project_Intern/src/utils/dateHelper.js))
```javascript
function getTimeFormat() { /* → '2025-03-19 21:00:00' */ }
function getDurationTime(endTime, startTime) {
    const t1 = new Date(endTime), t2 = new Date(startTime);
    return (t1.getTime() - t2.getTime()) / 1000; // → Trả về số giây
}
```

### `channelHelper.js` ([xem file](file:///d:/STU/Intern/Project_Intern/src/utils/channelHelper.js))
```javascript
function checkExtension(channel) {
    // 'SIP/1001-0000a1b2' → cắt từ 'SIP/' + 4 đến trước '-' → '1001'
    if (channel.match('SIP/') != null) {
        return channel.substring(channel.lastIndexOf('SIP/') + 4, channel.lastIndexOf('-'));
    }
    // 'Local/sales@from-queue' → cắt từ 'Local/' + 6 đến trước '@' → 'sales'
    else if (channel.match('Local/') != null) {
        return channel.substring(channel.lastIndexOf('Local/') + 6, channel.lastIndexOf('@'));
    }
}
```

---

## 🔄 TOÀN BỘ VÒNG ĐỜI MỘT CUỘC GỌI

```
1. Tổng đài viên bấm gọi từ IP Phone / Browser
      ↓
2. Asterisk PBX xử lý cuộc gọi
      ↓
3. [Event: DialBegin] → asteriskService.js nhận
   → Lưu vào state.arrDialState[uniqueid]
   → makeCallEventv2('ringing') → webhookService → HTTP POST → CRM
   → socket.emit('dialbegin') → Browser Client
      ↓
4. [Event: DialState ANSWER] → asteriskService.js
   → state.arrDialState[uniqueid].status = 'answered'
   → state.arrDialState[uniqueid].answertime = Timestamp
   → makeCallEventv2('answered') → webhook → CRM
      ↓
5. [Event: NEWEXTEN + MixMonitor] → managerevent handler
   → Ghi nhận tên file ghi âm vào state.arrRecordingFile
      ↓
6. [Event: Hangup] → asteriskService.js
   → Tính duration = Now - starttime
   → Tính billsec = Now - answertime (hoặc 0 nếu nhỡ)
   → makeCallEventv2('hangup') → webhook → CRM
   → setTimeout 2s → makeCallEventv2('cdr')
      ↓
7. [CDR] → callEventService.js
   → Ghép link file ghi âm từ state.arrRecordingFile
   → event = 'completed' (đã nghe) hoặc 'misscall' (nhỡ)
   → sendPostRequestv2 → HTTP POST → CRM/Webhook
   → _cleanupAfterCall → Xóa uniqueid khỏi tất cả state
```

---

## 📊 TỔNG KẾT CÁC TÍNH NĂNG PROJECT

| # | Tính năng | File chính |
|---|-----------|-----------|
| 1 | **Click-to-Call**: Gọi điện từ Web | `callService.click2call`, `callSocket.js` |
| 2 | **Transfer Call**: Chuyển cuộc gọi | `callService.transferCall` |
| 3 | **Hold/Unhold**: Giữ máy | `callService.holdCall` |
| 4 | **Mute**: Tắt tiếng | `callService.muteCall` |
| 5 | **Hangup**: Cúp máy từ xa | `callService.hangupCall` |
| 6 | **Queue Login/Logout**: Vào/Rời hàng đợi | `queueSocket.js`, `queueService.js` |
| 7 | **Queue Pause**: Tạm dừng nhận gọi | `queueService.pauseMember` |
| 8 | **Queue Status**: Xem trạng thái hàng đợi | `queueService.queueStatus` |
| 9 | **Extension Status**: Trạng thái máy nhánh (idle/busy/ringing) | `extensionService.js` |
| 10 | **Blacklist**: Chặn số điện thoại | `blacklistService.js` |
| 11 | **ChanSpy**: Nghe lén cuộc gọi (giám sát) | `monitorSocket.js` |
| 12 | **Eavesdrop**: Giám sát im lặng | `monitorSocket.js` |
| 13 | **MeetMe**: Hội nghị điện thoại | `monitorSocket.js` |
| 14 | **Webhook Push**: Đẩy events gọi điện ra CRM | `webhookService.sendPostRequestv2` |
| 15 | **Real-time Events**: Đẩy trạng thái thời gian thực | `asteriskService + socket.js` |
| 16 | **Call Recording**: Ghi âm cuộc gọi + link tải | `callEventService.js` (NEWEXTEN handler) |
| 17 | **PhoneBridge (Zoho)**: Tích hợp Zoho CRM | `phoneBridgeService.js` |
| 18 | **CDR Report**: Báo cáo chi tiết cuộc gọi | `callEventService.makeCallEventv2 (cdr)` |
