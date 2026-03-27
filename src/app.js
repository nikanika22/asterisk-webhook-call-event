const express = require('express');
const bodyParser = require('body-parser');

const requestLogger = require('./middlewares/requestLogger');
const errorHandler = require('./middlewares/errorHandler');
const apiRoutes = require('./routes/api');

const app = express();

app.use(requestLogger);
app.use(bodyParser.json({
    limit: '10mb'
}));
app.use(bodyParser.urlencoded({
    extended: true
}));

// Health check
app.get('/', (req, res) => res.json({
    code: 200,
    message: 'CallCenter API running'
}));

// Gắn toàn bộ API vào router chính
app.use('/api', apiRoutes);
app.use('/', apiRoutes); // Để tương thích với code cũ nếu không muốn đổi base URL
app.use(errorHandler);
module.exports = app;