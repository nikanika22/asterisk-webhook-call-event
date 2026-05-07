import { Injectable } from '@nestjs/common';

@Injectable()
export class StoreService {
  // Call lifecycle tracking
  uniqueidToLinkedid: Record<string, string> = {};
  arrDialState: Record<string, any> = {};
  arrBranchState: Record<string, any> = {};
  arrCompleteCall: Record<string, any> = {};
  arrRecordingFile: Record<string, any> = {};
  arrQueue: Record<string, any> = {};
  arrChanspy: Record<string, any> = {};
  arrAbadon: Record<string, any> = {};
  arrTransfer: Record<string, any> = {};
  arrCallError: Record<string, any> = {};
  arrCustom: Record<string, any> = {};
  arrVoiceMail: Record<string, any> = {};
  arrHangUpCall: Record<string, any> = {};
  flagEvent: Record<string, any> = {};

  // Webhook config cache (loaded from DB)
  arrWebhook: Record<string, any> = {};

  // Socket.IO connected users
  listUserConnected: Record<string, any> = {};

  // Extension activity tracking
  listExtActivity: Record<string, any> = {};

  // Misc
  intervalInit = false;
  chonve_ApiToken: string | null = null;
  arrToken: Record<string, any> = {};
}
