import * as moment from 'moment';

// ─── channelHelper.js ────────────────────────────────────────────────────────

export function getExtension(channel: string): string {
  let extension: any = channel.split('-');
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

export function parseChannel(channel: string): string | null {
  if (typeof channel === 'undefined') return null;
  let checkExt: string | null = null;
  if (channel.match('PJSIP/') != null) {
    checkExt = channel.substring(channel.lastIndexOf('PJSIP/') + 6, channel.lastIndexOf('-'));
  } else if (channel.match('SIP/') != null) {
    checkExt = channel.substring(channel.lastIndexOf('SIP/') + 4, channel.lastIndexOf('-'));
  } else if (channel.match('Local/') != null) {
    checkExt = channel.substring(channel.lastIndexOf('Local/') + 6, channel.lastIndexOf('@'));
  } else if (channel.match('local/') != null) {
    checkExt = channel.substring(channel.lastIndexOf('local/') + 6, channel.lastIndexOf('@'));
  }
  return checkExt;
}

// alias để tương thích với tên gốc checkExtension
export const checkExtension = parseChannel;

export function checkPhoneNumber(inputtxt: string): boolean {
  const phoneno =
    /(09|08[1|2|3|4|5|8|6|9]|02[4|8]|03[2|3|4|5|6|7|8|9]|05[6|8|9]|07[0|9|7|6|8])+([0-9]{7})/g;
  return (
    typeof inputtxt !== 'undefined' &&
    inputtxt != null &&
    inputtxt !== '' &&
    inputtxt.match(phoneno) !== null
  );
}

// ─── dateHelper.js ───────────────────────────────────────────────────────────

function formatTime(val: number | string): string {
  return Number(val) < 10 ? '0' + val : String(val);
}

export function getTimeFormat(today: Date = new Date()): string {
  return (
    formatTime(today.getFullYear()) +
    '-' +
    formatTime(today.getMonth() + 1) +
    '-' +
    formatTime(today.getDate()) +
    ' ' +
    formatTime(today.getHours()) +
    ':' +
    formatTime(today.getMinutes()) +
    ':' +
    formatTime(today.getSeconds())
  );
}

export function getTimeFormatSeconds(): string {
  return ((new Date().getTime() / 1000).toString()).split('.')[0];
}

export function getDurationTime(endTime: string, startTime: string): number {
  const t1 = new Date(endTime);
  const t2 = new Date(startTime);
  return (t1.getTime() - t2.getTime()) / 1000;
}

export function getAnsweredTime(calldate: string, billsec: number): string {
  const t = new Date(calldate);
  t.setSeconds(t.getSeconds() + billsec);
  return getTimeFormat(t);
}

export function FormatSec(sec_num: number): string {
  let hours: any = Math.floor(sec_num / 3600);
  let minutes: any = Math.floor((sec_num - hours * 3600) / 60);
  let seconds: any = sec_num - hours * 3600 - minutes * 60;
  if (hours < 10) hours = '0' + hours;
  if (minutes < 10) minutes = '0' + minutes;
  if (seconds < 10) seconds = '0' + seconds;
  return `${hours}:${minutes}:${seconds}`;
}

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() - minutes * 60000);
}

export function formatDate(curDate: string = ''): string {
  if (curDate) return moment(curDate).format('YYYY-MM-DD HH:mm:ss');
  return moment().format('YYYY-MM-DD HH:mm:ss');
}

// ─── encoder.js ──────────────────────────────────────────────────────────────

export function encodeDataToClient(data: any): string {
  return Buffer.from(JSON.stringify(data)).toString('base64');
}

export function encodeDataToBase(data: string): string {
  return Buffer.from(data).toString('base64');
}
