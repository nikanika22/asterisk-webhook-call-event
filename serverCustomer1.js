const express = require('express');
const app = express();
const route = express.Router();

app.use(express.json());

route.get('/', (req, res) => {
    res.send('Customer Server :3001 OK');
});

app.post('/', async (req, res) => {
    console.log('[3001] Nhận event:', req.body);
    res.status(200).json({
        success: true
    });
});

app.use('/', route);

app.listen(3001, () => {
    console.log('Server đang chạy tại http://localhost:3001');
});