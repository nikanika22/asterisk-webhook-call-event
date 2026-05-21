import { Test, TestingModule } from '@nestjs/testing';
import { WebhookService } from './webhook.service';
import { DATABASE_POOL } from '../../shared/database/database.providers';
import { StoreService } from '../../shared/store/store.service';
import axios from 'axios';
import { resetRuntimeConfigForTest } from '../../core/config/runtime-config';
import { AmiConnectionManager } from '../../core/asterisk/ami-connection-manager.service';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('WebhookService', () => {
  let service: WebhookService;
  let dbPoolMock: any;
  let amiManagerMock: any;
  let storeServiceMock: Partial<StoreService>;

  beforeEach(async () => {
    process.env['RUNTIME_MAX_RETRY'] = '3';
    process.env['RUNTIME_RETRY_DELAY_MS'] = '1000';
    process.env['RUNTIME_SETTIMEOUT_MS'] = '2000';
    process.env['LOG_ENABLED'] = 'true';
    resetRuntimeConfigForTest();

    dbPoolMock = {
      query: jest.fn(),
    };

    amiManagerMock = {
      getConnectorServer: jest.fn((pbxId: string) => ({
        '01': 'voice_server_1',
        '02': 'voice_server_2',
      }[pbxId] || '')),
      getConnectorServers: jest.fn().mockReturnValue(['voice_server_1', 'voice_server_2']),
      getConnectorServerMap: jest.fn().mockReturnValue({
        '01': 'voice_server_1',
        '02': 'voice_server_2',
      }),
    };

    // StoreService mock phải match đúng các properties mà WebhookService dùng
    storeServiceMock = {
      arrWebhook: {},
      arrWebhookByConnector: {},
      arrToken: {},
      arrDialState: {},
      arrQueue: {},
      flagEvent: {},
      arrCompleteCall: {},
      arrRecordingFile: {},
      arrCallError: {},
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhookService,
        {
          provide: DATABASE_POOL,
          useValue: dbPoolMock,
        },
        {
          provide: StoreService,
          useValue: storeServiceMock,
        },
        {
          provide: AmiConnectionManager,
          useValue: amiManagerMock,
        },
      ],
    }).compile();

    service = module.get<WebhookService>(WebhookService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    resetRuntimeConfigForTest();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should query active webhooks for multiple connector aliases', async () => {
    dbPoolMock.query.mockImplementationOnce((sql: string, params: any[], cb: any) => {
      expect(sql).toContain('g.connector_server IN (?, ?)');
      expect(sql).toContain('g.connector_server');
      expect(params).toEqual(['voice_server_1', 'voice_server_2']);
      cb(null, []);
    });

    const rows = await service.getActiveWebhooks(['voice_server_1', 'voice_server_2']);

    expect(rows).toEqual([]);
  });

  it('should cache webhooks separately by connector_server', async () => {
    dbPoolMock.query.mockImplementationOnce((sql: string, params: any[], cb: any) => {
      cb(null, [
        {
          id: 1,
          connector_server: 'voice_server_1',
          did: '',
          config: null,
          webhook_url: '{"callcenter":"https://server-1.test/call"}',
          webhook_info: '{"call":["ringing"]}',
          webhook_external: '{}',
          webhook_type: '{"callcenter":"default"}',
          hl_exts_queues: '101##8001',
        },
        {
          id: 2,
          connector_server: 'voice_server_2',
          did: '',
          config: null,
          webhook_url: '{"callcenter":"https://server-2.test/call"}',
          webhook_info: '{"call":["ringing"]}',
          webhook_external: '{}',
          webhook_type: '{"callcenter":"default"}',
          hl_exts_queues: '101##8002',
        },
      ]);
    });

    await service.getWebhookInfo();

    expect(storeServiceMock.arrWebhookByConnector!['voice_server_1']['webhook-1'].extensions).toContain('101');
    expect(storeServiceMock.arrWebhookByConnector!['voice_server_2']['webhook-2'].extensions).toContain('101');
    expect(service.getWebhookMapForPbx('01')).toHaveProperty('webhook-1');
    expect(service.getWebhookMapForPbx('02')).toHaveProperty('webhook-2');
  });

  it('should not load webhooks when AMI aliases are absent', async () => {
    amiManagerMock.getConnectorServers.mockReturnValueOnce([]);
    amiManagerMock.getConnectorServerMap.mockReturnValueOnce({});

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhookService,
        { provide: DATABASE_POOL, useValue: dbPoolMock },
        { provide: StoreService, useValue: storeServiceMock },
        { provide: AmiConnectionManager, useValue: amiManagerMock },
      ],
    }).compile();
    const legacyService = module.get<WebhookService>(WebhookService);

    await legacyService.getWebhookInfo();

    expect(dbPoolMock.query).not.toHaveBeenCalled();
  });

  describe('retryWebhook', () => {
    it('should retry successfully and update status to sent (happy path)', async () => {
      // Mock db.query: get log
      dbPoolMock.query.mockImplementationOnce((sql: string, params: any[], cb: any) => {
        cb(null, [{
          id: 1,
          status: 'failed',
          webhook_url: 'http://test-webhook.local/call',
          payload: '{"event":"ringing","value":{"phoneNumber":"0901234567"}}',
        }]);
      });
      // Mock db.query: updateRetriveStatus
      dbPoolMock.query.mockImplementationOnce((sql: string, params: any[], cb: any) => {
        cb(null, { affectedRows: 1 });
      });

      mockedAxios.post.mockResolvedValueOnce({ status: 200, data: { ok: true } });

      const result = await service.retryWebhook(1);

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('http_status', 200);
    });

    it('should return LOG_NOT_FOUND error when log does not exist (error case 1)', async () => {
      dbPoolMock.query.mockImplementationOnce((sql: string, params: any[], cb: any) => {
        cb(null, []);
      });

      const result = await service.retryWebhook(999);

      expect(result).toMatchObject({
        success: false,
        error: { code: 'LOG_NOT_FOUND' },
      });
    });

    it('should return RETRY_FAILED when outbound HTTP call fails (error case 2)', async () => {
      dbPoolMock.query.mockImplementationOnce((sql: string, params: any[], cb: any) => {
        cb(null, [{
          id: 1,
          status: 'failed',
          webhook_url: 'http://unreachable.local/call',
          payload: '{}',
        }]);
      });
      dbPoolMock.query.mockImplementationOnce((sql: string, params: any[], cb: any) => {
        cb(null, { affectedRows: 1 });
      });

      const networkError: any = new Error('Network Error');
      networkError.code = 'ECONNREFUSED';
      mockedAxios.post.mockRejectedValueOnce(networkError);

      const result = await service.retryWebhook(1);

      expect(result).toMatchObject({
        success: false,
        error: { code: 'RETRY_FAILED' },
      });
    });
  });
});
