import { Test, TestingModule } from '@nestjs/testing';
import { CallService } from './call.service';
import { AsteriskService } from '../../../core/asterisk/asterisk.service';

describe('CallService', () => {
  let service: CallService;
  let asteriskServiceMock: any;
  let amiMock: any;

  beforeEach(async () => {
    amiMock = {
      action: jest.fn(),
    };

    asteriskServiceMock = {
      getAmi: jest.fn().mockReturnValue(amiMock),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CallService,
        { provide: AsteriskService, useValue: asteriskServiceMock },
      ],
    }).compile();

    service = module.get<CallService>(CallService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ── click2call ─────────────────────────────────────────────────────────────

  describe('click2call', () => {
    /**
     * Data thực tế từ gateway (call.gateway.ts):
     *   caller   = data.extension       (extension của agent đang login)
     *   channel  = data.channelOut      (channel đầu ra của agent, vd: PJSIP/103)
     *   context  = data.context         (context Asterisk, vd: from-internal)
     *   callerid = caller (= extension)
     *
     * Gateway gọi: service.click2call({ channel, context, callerid: caller })
     * Service map:  AMI exten = callerid, AMI callerid = '1' + callerid
     */
    const dto = {
      channel: 'PJSIP/103',
      callerid: '103',
      context: 'from-internal',
    };

    it('should call ami.action with correct originate params (happy path)', async () => {
      amiMock.action.mockImplementationOnce((actionObj: any, cb: any) => {
        cb(null, { response: 'Success' });
      });

      const result = await service.click2call(dto);

      expect(result).toHaveProperty('response', 'Success');
      expect(amiMock.action).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'originate',
          channel: dto.channel,
          context: dto.context,
          exten: dto.callerid,
          callerid: '1' + dto.callerid,
          priority: 1,
          async: true,
        }),
        expect.any(Function),
      );
    });

    it('should reject when AMI callback returns error (error case 1)', async () => {
      amiMock.action.mockImplementationOnce((_actionObj: any, cb: any) => {
        cb(new Error('AMI connection lost'), null);
      });

      await expect(service.click2call(dto)).rejects.toThrow('AMI connection lost');
    });

    it('should resolve with AMI response object regardless of response value (error case 2)', async () => {
      amiMock.action.mockImplementationOnce((_actionObj: any, cb: any) => {
        cb(null, { response: 'Error', message: 'Channel unavailable' });
      });

      const result = await service.click2call(dto);
      expect(result).toMatchObject({ response: 'Error', message: 'Channel unavailable' });
    });
  });

  // ── hangupCall ─────────────────────────────────────────────────────────────

  describe('hangupCall', () => {
    it('should resolve successfully when AMI response is Success (happy path)', async () => {
      amiMock.action.mockImplementationOnce((_actionObj: any, cb: any) => {
        cb(null, { response: 'Success' });
      });

      const result = await service.hangupCall('PJSIP/103-0001');

      expect(result).toMatchObject({ code: 200, status: 'Success', message: 'hangup success' });
      expect(amiMock.action).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'hangup', channel: 'PJSIP/103-0001' }),
        expect.any(Function),
      );
    });

    it('should reject when AMI callback returns error (error case 1)', async () => {
      amiMock.action.mockImplementationOnce((_actionObj: any, cb: any) => {
        cb(new Error('AMI error'), null);
      });

      await expect(service.hangupCall('PJSIP/103-0001')).rejects.toMatchObject({ code: 500 });
    });

    it('should reject when AMI response is not Success (error case 2 — invalid channel)', async () => {
      amiMock.action.mockImplementationOnce((_actionObj: any, cb: any) => {
        cb(null, { response: 'Error', message: 'No such channel' });
      });

      await expect(service.hangupCall('INVALID_CHANNEL')).rejects.toMatchObject({
        code: 400,
        message: 'channel not valid',
      });
    });
  });

  // ── transferCall ───────────────────────────────────────────────────────────

  describe('transferCall', () => {
    const dtoInboundRinging = {
      extension: '102',
      channel: 'PJSIP/103-00001',
      destchannel: 'PJSIP/102-00002',
      type: 'inbound' as const,
      status: 'ringing' as const,
    };

    it('should resolve with transfer success for inbound ringing (happy path)', async () => {
      amiMock.action.mockImplementationOnce((_actionObj: any, cb: any) => {
        cb(null, { response: 'Success' });
      });

      const result = await service.transferCall(dtoInboundRinging);

      expect(result).toMatchObject({ code: 200, status: 'Success' });
      expect(amiMock.action).toHaveBeenCalledWith(
        expect.objectContaining({ Action: 'Redirect', Exten: '102' }),
        expect.any(Function),
      );
    });

    it('should reject when required params are missing (error case 1)', async () => {
      const dtoMissing = { extension: '', channel: '', destchannel: '' } as any;

      await expect(service.transferCall(dtoMissing)).rejects.toMatchObject({
        code: 500,
        message: 'cannot transfer',
      });
      // AMI không được gọi khi thiếu params
      expect(amiMock.action).not.toHaveBeenCalled();
    });

    it('should reject when AMI returns Error response (error case 2)', async () => {
      amiMock.action.mockImplementationOnce((_actionObj: any, cb: any) => {
        cb(null, { response: 'Error', message: 'Redirect failed' });
      });

      await expect(service.transferCall(dtoInboundRinging)).rejects.toMatchObject({
        code: 400,
        message: 'cannot transfer',
      });
    });
  });
});
