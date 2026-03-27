const moment = require('moment');

function formatTime(val) {
    if (val < 10) val = '0' + val;
    return val;
}

function getTimeFormat(today = new Date()) {
    return (
        formatTime(today.getFullYear()) + '-' +
        formatTime(today.getMonth() + 1) + '-' +
        formatTime(today.getDate()) + ' ' +
        formatTime(today.getHours()) + ':' +
        formatTime(today.getMinutes()) + ':' +
        formatTime(today.getSeconds())
    );
}

function getTimeFormatSeconds() {
    return ((new Date().getTime() / 1000).toString()).split('.')[0];
}

function getDurationTime(endTime, startTime) {
    const t1 = new Date(endTime);
    const t2 = new Date(startTime);
    return (t1.getTime() - t2.getTime()) / 1000;
}

function getAnsweredTime(calldate, billsec) {
    const t = new Date(calldate);
    t.setSeconds(t.getSeconds() + billsec);
    return getTimeFormat(t);
}

function FormatSec(sec_num) {
    let hours = Math.floor(sec_num / 3600);
    let minutes = Math.floor((sec_num - hours * 3600) / 60);
    let seconds = sec_num - hours * 3600 - minutes * 60;
    if (hours < 10) hours = '0' + hours;
    if (minutes < 10) minutes = '0' + minutes;
    if (seconds < 10) seconds = '0' + seconds;
    return `${hours}:${minutes}:${seconds}`;
}

function addMinutes(date, minutes) {
    return new Date(date.getTime() - minutes * 60000);
}

function formatDate(curDate = '') {
    if (curDate) return moment(curDate).format('YYYY-MM-DD HH:mm:ss');
    return moment().format('YYYY-MM-DD HH:mm:ss');
}

function debug(...logData) {
    console.log('==> DEBUG', formatDate(), logData);
}

module.exports = { getTimeFormat, getTimeFormatSeconds, getDurationTime, getAnsweredTime, FormatSec, addMinutes, formatDate, debug };
