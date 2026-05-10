import { Test, TestingModule } from '@nestjs/testing';
import { WebhookService } from './webhook.service';
import { DATABASE_POOL } from '../../shared/database/database.providers';
import { ConfigService } from '@nestjs/config';
import { StoreService } from '../../shared/store/store.service';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('WebhookService', () => {
  let service: WebhookService;
  let dbPoolMock: any;
  let configServiceMock: any;
  let storeServiceMock: Partial<StoreService>;

  beforeEach(async () => {
    dbPoolMock = {
      query: jest.fn(),
    };

    configServiceMock = {
      get: jest.fn().mockReturnValue('mockConnectorServer'),
    };

    // StoreService mock phải match đúng các properties mà WebhookService dùng
    storeServiceMock = {
      arrWebhook: {},
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
          provide: ConfigService,
          useValue: configServiceMock,
        },
        {
          provide: StoreService,
          useValue: storeServiceMock,
        },
      ],
    }).compile();

    service = module.get<WebhookService>(WebhookService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
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
