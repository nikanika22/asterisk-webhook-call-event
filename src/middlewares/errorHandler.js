function errorHandler(err, req, res, next) {
    console.error('[ERROR]', err);
    res.status(500).json({ code: 500, message: 'Internal server error', error: err.message });
}

module.exports = errorHandler;
