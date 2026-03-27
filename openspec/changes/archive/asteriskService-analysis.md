# Phân tích Luồng Hoạt động Dịch vụ Asterisk (asteriskService.js)

Tài liệu này giải thích chi tiết logic hoạt động của `asteriskService.js` và các tệp liên quan trực tiếp, dùng làm tài liệu tham khảo cho người lần đầu tiếp cận.

## 1. Kiến Trúc Tổng Quan (Event-Driven)

Dịch vụ Asterisk trong hệ thống hoạt động dựa trên cơ chế Pub/Sub (Publish/Subscribe) bằng lớp `EventEmitter` của Node.js:
- Lắng nghe các sự kiện (Events) đến từ Asterisk PBX thông qua cổng kết nối AMI (Asterisk Manager Interface).
- Đóng gói dữ liệu (Base64/JSON).
- Phân phối (Emit) các sự kiện lên cho các Client (Frontend/Web) qua **Socket.io** hoặc đẩy qua HTTP POST tới các API **Webhook** bên thứ ba.

## 2. Chi tiết các thành phần (Files)

### 2.1 `src/services/asteriskService.js` (Core)
Đây là trung tâm thần kinh để đón nhận tất cả sự kiện từ PBX.

- **`startAMI()`**: 
  - Đảm bảo kết nối tới dịch vụ AMI của máy chủ Asterisk qua `getAMI()`. 
  - Gửi lệnh `action: 'Events', eventmask: 'all'` để lấy tất cả log sự kiện từ tổng đài.
  - Lắng nghe TCP với dòng `ami.on('managerevent', ...)`. Sau khi lấy data từ PBX, nó gọi `asteriskService.emit(eventName, evt)` để kích hoạt các logic chi tiết đã được viết bên dưới nó.

- **Các Events tiêu biểu cần phân tích**:
  - `extensionstatus`: Emit Socket trạng thái thiết bị của tổng đài viên đang offline, rảnh, hay bận.
  - `coreshowchannel`: Hiển thị các sự kiện kênh liên lạc tổng đài (Live channels).
  - Event Queue (Hàng đợi): `queuecallerjoin`, `queuecallerleave`, `queuememberstatus`.
  - Loop Events Cuộc gọi (Dial Lifecycle): `dialbegin` (bắt đầu gọi, đổ chuông), `dialstate` (trạng thái trả lời), `hangup` (cúp máy).
  - Gắn sự kiện Webhook: Lọc lấy các hooks nằm trong bộ nhớ ở `state.arrWebhook` và đẩy dữ liệu ngoại trú (`sendPostRequestv2`). Nó thấy ở `queuesummary` & `DEVICESTATECHANGE` & các hàm Call Event.

### 2.2 `src/config/asterisk.js`
Nơi cấu hình kết nối AMI thực thụ bằng thư viện npm `asterisk-manager`.
- Load thông tin máy chủ (host), user (mật khẩu) từ `env.js` (quá trình mà bạn vừa hỏi ở bước trước về `.env`).
- Cơ chế `amiInstance.keepConnected()` để giữ phiên bản TCP liên tục không bị đứt đoạn.

### 2.3 `src/services/callEventService.js`
Định nghĩa hàm `makeCallEvent()` (dùng cho hệ cũ chạy socket) và `makeCallEventv2()` (dùng gửi webhook):
- Xử lý các switch case theo vòng đời cuộc gọi: `answered`, `hangup`, `cdr` (Sự kiện chốt thông tin cuộc gọi).
- Nhiệm vụ là lấy thời gian Timestamp `getTimeFormat()` trừ đi nhau để tính `duration` (thời lượng) và `billsec` (số giây trả lời/nói chuyện).
- Ghép tên link file ghi âm (`recordingfile`) từ map dữ liệu `state.arrRecordingFile`.  
- Sau khi đóng gói dữ liệu xong, nó gửi đi qua `socketService` (v1) hoặc `sendPostRequestv2` (v2).

### 2.4 `src/config/socket.js`
Quản lý tập trung các liên kết WebSockets (`socket.io`):
- `emitData(extension, data, type)`: Tìm kiếm trong `state.listUserConnected` thông qua `extension` để đẩy cho đúng Client App đang đăng nhập số máy lẻ đó.
- `emitData2(...)`: Đẩy Socket.io đến mọi user có đăng ký lắng nghe (subscribers) events của 1 queue cụ thể hoặc danh mục extension.

### 2.5 `src/utils/store.js`
Nơi chứa toàn bộ RAM / Local Object Store của toàn hệ thống (State in-memory variable). 
- *Lý do có file này:* Node.js không thể và không nên request Query đọc/ghi liên tục DataBase (như MySQL) trong mỗi nhịp Event của Asterisk (vì với tổng đài lớn, 1 giây có hàng trăm event con, làm vậy sẽ crash DB). 
- `arrDialState`: Quản lý trạng thái gọi hiện sống.
- `arrCompleteCall`: Lưu cache thời gian, tính billsec trước khi PBX báo cáo xong.
- `arrWebhook`: Danh sách cài đặt Hook tải tĩnh một lần từ DB lúc Start Server.
- `listUserConnected`: Lưu theo cặp `[Socket ID] <-> [Tài khoản User/Ext]`.

### 2.6 `src/utils/encoder.js`
Nơi che đậy dữ liệu.
- Trong mã nguồn của 1 số dự án, không ném dữ liệu raw JSON trần truồng sang WebSocketClient (React/Vue). Nên hệ thống này gọi `encodeDataToClient()` để mã hóa toàn bộ dữ liệu chuyển thành chuỗi String Base64 (`Buffer.from...toString('base64')`).

### 2.7 Các Utilities chức năng chéo (`channelHelper` & `dateHelper`)
- `channelHelper.js`: Do PBX Asterisk trả chuỗi kênh khá phức tạp kiểu `"SIP/1000-0000a12"` hoặc `"Local/900@from-internal"`. Hàm `checkExtension` cắt chuỗi string lấy ra máy nhánh chính xác là `1000` hoặc `900`.
- `dateHelper.js`: Trộn và format thời gian `new Date()` bằng package `moment` cho chuẩn logic Cấu trúc hệ CSDL. Và cung cấp phép tính `getDurationTime` (T1 - T2 / 1000s).

---

## 3. Bản Đồ Một Vòng Đời Cuộc Gọi Gọi (Call Lifecycle Demo)

1. **Khi sự kiện `DialBegin` bắn ra**: PBX báo có người bấm gọi. Hàm AMI lấy dữ liệu. Quản lý lưu 1 Object theo `uniqueid` chứa thông tin người gọi / nhận vào `state.arrDialState`. Sinh ra URL webhook. Push báo có "Đang Rung Chuông" cho App.
2. **Khi sự kiện `DialState: ANSWER` hoặc `AgentConnect` bắn ra**: Chuyển trạng thái record RAM sang `answered`. Đánh dấu `answertime` (Thời điểm bắt đầu nói chuyện để cuối cùng dùng tính Billsec).
3. **Sự kiện `Hangup` bắn ra**: Đánh dấu giờ kết thúc. Trừ tính toán 2 số `duration`, `billsec` cập nhật vào `state.arrCompleteCall`. (Gửi WebHook cuộc gọi kết thúc).
4. **Sự kiện `CDR (Call Detail Record)` bắn ra**: Đây là lúc PBX bảo nó đã chốt sổ cho riêng nó xuống DB của chính nó. Lúc này NodeJS mới tổng hợp File ghi âm gốc có trong `NEWEXTEN` event, gom data `arrCompleteCall`. Phát sóng gói `completed` và xoá bộ nhớ của uniqueid này đi đánh cờ `flagEvent = true`. Dọn dẹp Data khỏi hệ thống RAM rác.
