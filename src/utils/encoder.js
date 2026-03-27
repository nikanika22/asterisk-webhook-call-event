function encodeDataToClient(data) {
    return Buffer.from(JSON.stringify(data)).toString('base64');
}

function encodeDataToBase(data) {
    return Buffer.from(data).toString('base64');
}

module.exports = { encodeDataToClient, encodeDataToBase };
