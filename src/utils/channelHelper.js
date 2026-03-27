function getExtension(channel) {
    let extension = channel.split('-');
    extension = extension[0].split('/');
    extension = extension[extension.length - 1];
    if (isNaN(extension)) {
        const extNum = extension.match(/\d+/g);
        if (extNum != null) {
            extension = Array.isArray(extNum) ? extNum[0] : extNum;
        }
    }
    return extension;
}

function checkExtension(channel) {
    if (typeof channel === 'undefined') return null;
    let checkExt = null;
    if (channel.match('SIP/') != null) {
        checkExt = channel.substring(channel.lastIndexOf('SIP/') + 4, channel.lastIndexOf('-'));
    } else if (channel.match('Local/') != null) {
        checkExt = channel.substring(channel.lastIndexOf('Local/') + 6, channel.lastIndexOf('@'));
    } else if (channel.match('local/') != null) {
        checkExt = channel.substring(channel.lastIndexOf('local/') + 6, channel.lastIndexOf('@'));
    }
    return checkExt;
}

function checkPhoneNumber(inputtxt) {
    const phoneno = /(09|08[1|2|3|4|5|8|6|9]|02[4|8]|03[2|3|4|5|6|7|8|9]|05[6|8|9]|07[0|9|7|6|8])+([0-9]{7})/g;
    return typeof inputtxt !== 'undefined' && inputtxt != null && inputtxt !== '' && inputtxt.match(phoneno) ? true : false;
}

module.exports = { getExtension, checkExtension, checkPhoneNumber };
