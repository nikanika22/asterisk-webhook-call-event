# 📋 Chức Năng & Luồng Hoạt Động — CallCenter Node.js

> Tài liệu này liệt kê toàn bộ chức năng và luồng đi (flow) của ứng dụng. Xem chi tiết code tại [`phantichproject.md`](./phantichproject.md).

---

## 🗂️ DANH SÁCH CHỨC NĂNG

| # | Chức năng | Mô tả ngắn | Giao tiếp | File chính |
|---|-----------|------------|-----------|------------|
| 1 | **Click-to-Call** | Gọi điện từ Web/App bằng một click | HTTP POST → AMI | `callService.js`, `callSocket.js` |
| 2 | **Transfer Call** | Chuyển cuộc gọi đang diễn ra sang máy nhánh khác | AMI Action | `callService.js` |
| 3 | **Hold / Unhold** | Giữ máy / bỏ giữ máy | AMI Action | `callService.js` |
| 4 | **Mute Call** | Tắt tiếng một chiều | AMI Action | `callService.js` |
| 5 | **Hangup** | Cúp máy từ xa qua Web | AMI Action | `callService.js` |
| 6 | **Queue Login / Logout** | Tổng đài viên tham gia / rời hàng đợi cuộc gọi | Socket.IO → AMI | `queueSocket.js`, `queueService.js` |
| 7 | **Queue Pause** | Tạm dừng nhận cuộc gọi (trong hàng đợi) | AMI Action | `queueService.js` |
| 8 | **Queue Status** | Xem trạng thái tóm tắt và chi tiết hàng đợi | AMI → Socket.IO | `queueService.js` |
| 9 | **Extension Status** | Xem trạng thái máy nhánh: idle / busy / ringing / unavailable | AMI Event | `extensionService.js`, `extensionSocket.js` |
| 10 | **Blacklist** | Thêm / xóa số điện thoại vào danh sách chặn | HTTP POST → DB | `blacklistService.js` |
| 11 | **ChanSpy (Nghe lén)** | Giám sát viên nghe lén cuộc gọi, có thể thì thầm cho nhân viên | AMI Originate | `monitorSocket.js` |
| 12 | **Eavesdrop (Giám sát im lặng)** | Nghe lén cuộc gọi không phát âm thanh | AMI Originate | `monitorSocket.js` |
| 13 | **MeetMe (Hội nghị)** | Gộp nhiều đầu số vào cùng một phòng hội nghị | AMI Originate | `monitorSocket.js` |
| 14 | **Webhook Push (CRM Integration)** | Đẩy sự kiện cuộc gọi (ringing / answered / hangup / CDR) ra hệ thống ngoài qua HTTP POST | HTTP POST | `webhookService.js`, `callEventService.js` |
| 15 | **Real-time Events** | Đẩy mọi sự kiện Asterisk theo thời gian thực đến browser | Socket.IO | `asteriskService.js`, `socket.js` |
| 16 | **Call Recording** | Ghi âm cuộc gọi, ghép link file âm thanh vào CDR | AMI Event + File | `callEventService.js` |
| 17 | **CDR Report** | Báo cáo chi tiết cuộc gọi: thời lượng, thời gian nghe máy, trạng thái | Webhook / HTTP | `callEventService.js` |
| 18 | **PhoneBridge / Zoho CRM** | Tích hợp popup thông tin khách hàng khi có cuộc gọi đến | HTTP GET → DB | `phoneBridgeService.js` |
| 19 | **Reload Webhook Config** | Tải lại cấu hình webhook từ DB không cần restart server | HTTP GET | `webhookController.js` |
| 20 | **User Connected State** | Theo dõi danh sách tổng đài viên đang online theo socket | Socket.IO | `extensionSocket.js`, `store.js` |

---

## 🔄 CÁC LUỒNG CHÍNH

---

### 1️⃣ Luồng Khởi Động Server

```
node server.js
    │
    ├─ dotenv.config()           → Nạp biến môi trường từ .env
    ├─ http.createServer(app)    → Tạo HTTP server từ Express
    ├─ new SocketIO(server)      → Gắn Socket.IO vào cùng HTTP server
    ├─ socketService.setIO(io)   → Lưu instance Socket.IO toàn cục
    ├─ io.on('connection')       → Đăng ký 4 nhóm socket handler
    │       ├─ extensionSocket   (userConnect, disconnect, getStatusExtension)
    │       ├─ queueSocket       (loginQueue, logoutQueue, pauseQueue...)
    │       ├─ callSocket        (click2call, hangupCall, transferCall...)
    │       └─ monitorSocket     (chanspy, eavesDropCall, monitorAction...)
    │
    └─ server.listen(PORT)
            ├─ startAMI()        → Kết nối TCP tới Asterisk PBX (AMI)
            └─ setTimeout(getWebhookInfo, 2000)
                                 → 2 giây sau: load cấu hình webhook từ DB → RAM
```

---

### 2️⃣ Luồng Vòng Đời Cuộc Gọi (Outbound Extension)

```
[Tổng đài viên] Gọi ra từ IP Phone / Web
        │
        ▼
[Asterisk PBX] Xử lý dialplan, phát events qua AMI
        │
        ├──[Event: DialBegin]──────────────────────────────────────┐
        │   asteriskService.js nhận                                │
        │   → Kiểm tra: SIP/ channel + số nội bộ < 5 ký tự        │
        │   → Tìm webhook khớp extension trong arrWebhook          │
        │   → Lưu vào state.arrDialState[uniqueid]                 │
        │       { fromnumber, tonumber, extension, calltype,       │
        │         starttime, status: 'ringing', webhookurl... }    │
        │   → makeCallEventv2('ringing') → HTTP POST → CRM         │
        │   → socket.emit('dialbegin') → Browser                   │
        │                                                          │
        ├──[Event: DialState ANSWER]──────────────────────────────┤
        │   → state.arrDialState[linkedid].status = 'answered'     │
        │   → state.arrDialState[linkedid].answertime = Now        │
        │   → makeCallEventv2('answered') → HTTP POST → CRM        │
        │                                                          │
        ├──[Event: NEWEXTEN + MixMonitor (.WAV)]──────────────────┤
        │   → Ghi nhận tên file ghi âm                             │
        │   → state.arrRecordingFile[uniqueid] = { file, call_type }│
        │                                                          │
        └──[Event: Hangup]────────────────────────────────────────┘
            → socket.emit('hangup') → Browser
            → Tính duration = Now - starttime
            → Tính billsec = Now - answertime (hoặc 0 nếu nhỡ)
            → Lưu vào state.arrCompleteCall[uniqueid]
            → makeCallEventv2('hangup') → HTTP POST → CRM
            → setTimeout 2s → makeCallEventv2('cdr')
                    │
                    ▼
            [CDR] callEventService.js
            → Ghép link file ghi âm (Base64 encode path)
            → event = 'completed' (nghe máy) | 'misscall' (nhỡ)
            → sendPostRequestv2 → HTTP POST → CRM/Webhook
            → _cleanupAfterCall → Xóa uniqueid khỏi tất cả state RAM
```

---

### 3️⃣ Luồng Click-to-Call (Gọi từ Web)

```
[Browser/API Client]
    │  HTTP POST /api/click2call
    │  { channel: 'SIP/1001', callerid: '0987654321', context: '...' }
    ▼
[callController.js]
    │  Validate input
    ▼
[callService.click2call()]
    │  ami.action({ action: 'originate', channel, exten, callerid... })
    ▼
[Asterisk PBX]
    │  Gọi cho tổng đài viên trước (SIP/1001 đổ chuông)
    │  → Tổng đài viên nhấc máy
    │  → Asterisk kết nối đến số ngoài (0987654321)
    ▼
[Tiếp tục theo Luồng Vòng Đời Cuộc Gọi bên trên]
```

---

### 4️⃣ Luồng Socket.IO — Tổng Đài Viên Kết Nối

```
[Browser] Mở tab Web, Socket.IO auto-connect
    │
    ▼
[server.js] io.on('connection', socket => ...)
    │
    ├─ socket.emit('userConnect', { accountId, extension, queues... })
    │       ▼
    │  [extensionSocket.js]
    │  → Ghi vào state.listUserConnected[socket.id]
    │  → ami.action('ExtensionState') → Lấy trạng thái extension ngay lập tức
    │  → io.emit('deviceStatus', ...) → Trả trạng thái về cho browser
    │
    ├─ [Asterisk events liên tục emit về socket]
    │   dialbegin / hangup / queuememberstatus / devicestatechange...
    │
    └─ socket.on('disconnect')
            → delete state.listUserConnected[socket.id]
```

---

### 5️⃣ Luồng Webhook — Đẩy Sự Kiện Ra CRM

```
[Server Khởi Động + 2s]
    │
    ▼
getWebhookInfo()
    → groupModel.getActiveWebhooks(connectorServer)
    → SELECT groups JOIN group_hotline WHERE active = 1 AND connector_server = ?
    → Parse hl_exts_queues: 'ext1,ext2##queue1$$ext3##queue2'
        → extensions: ['1001', '1002', '1003']
        → queues:     ['sales', 'support']
        → did:        ['02812345678']
    → state.arrWebhook['webhook-{id}'] = { extensions, queues, webhook_url, ... }
    
─────────────────────────────────────────────

[Khi có sự kiện cuộc gọi]
    │
    ▼
asteriskService.js → makeCallEventv2(type, callid)
    │
    ▼
callEventService.js → sendPostRequestv2(url, params)
    │  params = { object: 'call', event: 'ringing|answered|hangup|completed|misscall',
    │             value: { fromnumber, tonumber, extension, starttime, ... } }
    ▼
HTTP POST → CRM / Zoho / Third-party System
    │
    └─ Sau khi gửi 'completed' hoặc 'misscall':
            → _cleanupAfterCall() → Giải phóng RAM
```

---

### 6️⃣ Luồng Queue — Quản Lý Hàng Đợi

```
[Browser] socket.emit('loginQueue', { queue: 'sales', extension: '1001' })
    ▼
[queueSocket.js]
    → ami.action({ action: 'QueueAdd', queue: 'sales', interface: 'SIP/1001' })
    ▼
[Asterisk] Thêm 1001 vào hàng đợi 'sales'
    ▼
[Event: QueueMemberAdded] → asteriskService
    → socket.emit('queueMemberAdded') → Cập nhật UI browser

─────────────────────────────────────────────

[Browser] socket.emit('logoutQueue', { queue: 'sales', extension: '1001' })
    ▼
[queueSocket.js]
    → ami.action({ action: 'QueueRemove', queue: 'sales', interface: 'SIP/1001' })
    ▼
[Event: QueueMemberRemoved] → socket.emit → Browser

─────────────────────────────────────────────

[Browser] socket.emit('pauseQueue', { queue: 'sales', paused: true })
    ▼
    → ami.action({ action: 'QueuePause', paused: true, ... })
```

---

### 7️⃣ Luồng Giám Sát (Monitor / ChanSpy)

```
[Giám sát viên] socket.emit('chanspy', { spyExten: '1001' })
    ▼
[monitorSocket.js]
    → ami.action({
        action: 'originate',
        application: 'chanspy',
        data: 'SIP/1001,qw'   // q=quiet, w=whisper
      })
    ▼
[Asterisk] Kết nối điện thoại giám sát viên vào channel của 1001
    → Giám sát viên nghe được cuộc gọi
    → Có thể thì thầm cho 1001 (caller không nghe thấy)
```

---

### 8️⃣ Luồng Blacklist

```
[API Client] POST /api/addBlacklist { phone: '0987654321' }
    ▼
[blacklistController.js] → [blacklistService.js]
    → INSERT INTO blacklist (phone) VALUES (?)
    → ami.action({ action: 'DatabasePut', family: 'blacklist', key: '0987654321', val: 'YES' })
    ▼
[Asterisk] Ghi vào AstDB — số này bị chặn ở dialplan

─────────────────────────────────────────────

[API Client] POST /api/removeBlacklist { phone: '0987654321' }
    ▼
    → DELETE FROM blacklist WHERE phone = ?
    → ami.action({ action: 'DatabaseDel', family: 'blacklist', key: '0987654321' })
```

---

## 🧠 SƠ ĐỒ LUỒNG DỮ LIỆU TỔNG QUAN

```
                    ┌─────────────────────┐
                    │    Asterisk PBX      │
                    │  (Tổng đài IP)       │
                    └─────────┬───────────┘
                              │ AMI Events (TCP)
                              ▼
                    ┌─────────────────────┐
                    │  asteriskService.js  │
                    │  (Event Bus / Hub)   │
                    └──┬──────────┬───────┘
                       │          │
           ┌───────────▼─┐    ┌───▼──────────────┐
           │ Socket.IO   │    │ callEventService   │
           │ Emit → FE   │    │ makeCallEventv2()  │
           └─────────────┘    └────────┬───────────┘
                                       │
                              ┌────────▼──────────┐
                              │  webhookService    │
                              │ sendPostRequestv2  │
                              └────────┬───────────┘
                                       │ HTTP POST
                                       ▼
                              CRM / Zoho / Third-party

    ┌──────────────┐                ┌─────────────┐
    │  Web Browser │ ←──Socket.IO──▶│  socket.js  │
    │  (React/JS)  │                │  getIO()    │
    └──────┬───────┘                └─────────────┘
           │ HTTP REST
           ▼
    ┌──────────────────────────────────────────────┐
    │  Express Routes → Controllers → Services     │
    │  /click2call  /hangup  /transfer  /hold ...  │
    └──────────────────────────┬───────────────────┘
                               │ AMI Action
                               ▼
                    ┌─────────────────────┐
                    │    Asterisk PBX      │
                    └─────────────────────┘
```

---

## 📌 TÓM TẮT NHANH

| Giao tiếp | Hướng đi | Mục đích |
|-----------|----------|----------|
| **AMI (TCP)** | Asterisk → Node.js | Nhận events (dialbegin, hangup, queuememberstatus...) |
| **AMI (TCP)** | Node.js → Asterisk | Gửi lệnh (originate, queue add/remove, hangup...) |
| **Socket.IO** | Node.js → Browser | Push trạng thái thời gian thực đến UI |
| **Socket.IO** | Browser → Node.js | Tổng đài viên điều khiển (click2call, chanspy...) |
| **HTTP REST** | Client → Node.js | API điều khiển từ hệ thống ngoài (CRM gọi click2call...) |
| **HTTP POST** | Node.js → CRM | Webhook push sự kiện cuộc gọi (ringing, answered, CDR...) |
| **MySQL** | Node.js ↔ DB | Đọc cấu hình webhook, blacklist, zoho config... |
