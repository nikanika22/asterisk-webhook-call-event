# CallCenter AMI Server

Hệ thống tích hợp tổng đài Asterisk PBX, xây dựng bằng **NestJS** (TypeScript), hỗ trợ quản lý cuộc gọi, hàng đợi ACD, webhook và thông báo thời gian thực qua Socket.IO.

---

## Yêu cầu hệ thống

| Công cụ      | Phiên bản tối thiểu  |
| ------------ | -------------------- |
| Node.js      | >= 18.x              |
| npm          | >= 9.x               |
| MariaDB      | >= 10.4              |
| Asterisk PBX | Đang chạy và bật AMI |

---

## Cài đặt

### 1. Clone repository

```bash
git clone https://github.com/nikanika22/asterisk-webhook-call-event.git
cd <thu-muc-vua-clone>
npm install
copy .env.example .env
npm run dev
```

### 2. Cấu hình môi trường

Mở file `.env` và chỉnh sửa các biến sau:

```env
# ── Database ──────────────────────────────────────────
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASS=your_password
DB_NAME=your_db_name

# ── Asterisk AMI (PBX thứ 1) ──────────────────────────
AMI_HOST_01=your_pbx_ip
AMI_PORT_01=5038
AMI_USER_01=your_ami_user
AMI_PASS_01=your_ami_password
AMI_ALIAS_01=voice_server_1

# Hỗ trợ nhiều PBX (tùy chọn)
# AMI_HOST_02=...
# AMI_PORT_02=5038
# AMI_USER_02=...
# AMI_PASS_02=...
# AMI_ALIAS_02=voice_server_2

# AMI_ALIAS_<nn> phải khớp với giá trị groups.connector_server trong database.
# Ví dụ PBX 01 dùng group có connector_server = voice_server_1.

# ── Server ────────────────────────────────────────────
SOCKET_PORT=3000

# ── Runtime ───────────────────────────────────────────
RUNTIME_MAX_RETRY=3
RUNTIME_RETRY_DELAY_MS=1000
RUNTIME_SETTIMEOUT_MS=1000
LOG_ENABLED=true
```

### 3. Khởi tạo database

Import schema vào MariaDB:

```bash
mariadb -u root -p contact_popup_prod < db_contactpopup.sql
```

---

## Chạy Server

### Server chính (NestJS — cổng 3000)

**Môi trường Development** (hot-reload, tự động biên dịch khi có thay đổi):

```bash
npm run dev
```

**Môi trường Production** (cần build trước):

```bash
# Bước 1: Biên dịch TypeScript sang JavaScript
npm run build

# Bước 2: Chạy bản đã build
npm start
```

Sau khi khởi động thành công, server lắng nghe tại:

- HTTP API: `http://localhost:3000`
- WebSocket: `ws://localhost:3000`

---

### Chạy cả hai server cùng lúc

Mở **2 terminal riêng biệt**:

**Terminal 1 — Server chính:**

```bash
npm run dev
```

**Terminal 2 — Server Customer:**

```bash
node serverCustomer1.js
```

---

## Cấu trúc thư mục

```
Project_Intern/
├── src/
│   ├── main.ts                        # Điểm khởi động NestJS
│   ├── app.module.ts                  # Module gốc
│   ├── core/
│   │   ├── asterisk/                  # Quản lý kết nối AMI
│   │   ├── common/                    # Decorators, filters, interceptors
│   │   └── config/                    # Đọc và validate biến môi trường
│   ├── shared/
│   │   ├── database/                  # MariaDB connection pool
│   │   ├── helpers/                   # Tiện ích xử lý channel, ngày giờ
│   │   ├── socket/                    # Dịch vụ WebSocket (Socket.IO)
│   │   └── store/                     # Lưu trạng thái cuộc gọi trong bộ nhớ
│   └── modules/
│       ├── asterisk/                  # Xử lý sự kiện AMI, điều khiển cuộc gọi
│       │   ├── call/                  # Transfer, mute, hold, hangup
│       │   ├── queue-acd/             # Quản lý hàng đợi và agent
│       │   ├── extension/             # Trạng thái máy nhánh
│       │   └── blacklist/             # Danh sách chặn
│       ├── webhook/                   # Gửi và quản lý webhook
│       └── monitor/                   # Giám sát hệ thống
├── dist/                              # JavaScript đã biên dịch (sau npm run build)
├── serverCustomer1.js                 # Server webhook mô phỏng khách hàng (cổng 3001)
├── db_contactpopup.sql                # Schema database
├── .env                               # Biến môi trường (không commit)
├── .env.example                       # Mẫu cấu hình
├── package.json
├── tsconfig.json
└── nest-cli.json
```

---

## API Endpoints

| Method | Endpoint                   | Mô tả                          |
| ------ | -------------------------- | ------------------------------ |
| GET    | `/api/extensions/status`   | Trạng thái máy nhánh           |
| GET    | `/api/queues/status`       | Thống kê hàng đợi              |
| GET    | `/api/queues/extensions`   | Danh sách agent trong hàng đợi |
| GET    | `/api/webhooks/logs`       | Lịch sử webhook                |
| POST   | `/api/calls/click2call`    | Khởi tạo cuộc gọi              |
| POST   | `/api/queues/members`      | Thêm agent vào hàng đợi        |
| POST   | `/api/blacklists`          | Thêm vào danh sách chặn        |
| POST   | `/api/webhooks/restart`    | Tải lại cấu hình webhook       |
| POST   | `/api/webhooks/retry`      | Gửi lại webhook thất bại       |
| PATCH  | `/api/calls/transfer`      | Chuyển cuộc gọi                |
| PATCH  | `/api/calls/mute`          | Tắt tiếng                      |
| PATCH  | `/api/calls/hold`          | Giữ cuộc gọi                   |
| PATCH  | `/api/queues/agents/pause` | Tạm dừng agent                 |
| DELETE | `/api/calls/hangup`        | Kết thúc cuộc gọi              |
| DELETE | `/api/queues/members`      | Xóa agent khỏi hàng đợi        |
| DELETE | `/api/blacklists`          | Xóa khỏi danh sách chặn        |

---

## Scripts

| Lệnh               | Mô tả                                 |
| ------------------ | ------------------------------------- |
| `npm run dev`      | Chạy development với hot-reload       |
| `npm run build`    | Biên dịch TypeScript sang JavaScript  |
| `npm start`        | Chạy bản production (cần build trước) |
| `npm test`         | Chạy unit tests                       |
| `npm run test:cov` | Chạy tests với báo cáo coverage       |

---

## Kiểm tra hoạt động

Sau khi khởi động cả hai server, kiểm tra bằng lệnh:

```bash
# Server chính
curl http://localhost:3000

# Server Customer
curl http://localhost:3001
```

Hoặc mở trình duyệt tại `http://localhost:3001` — nếu thấy `Customer Server :3001 OK` thì server đang chạy bình thường.

### 5. Phạm vi

// Hiện tại many AMI chỉ tác động đến các event dialbegin,, dialstate, dailend, hangup, cdr
