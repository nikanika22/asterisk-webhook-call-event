import { Test, TestingModule } from '@nestjs/testing';
import { QueueService } from './queue.service';
import { AsteriskService } from '../../../core/asterisk/asterisk.service';
import { DATABASE_POOL } from '../../../shared/database/database.providers';
import { resetRuntimeConfigForTest } from '../../../core/config/runtime-config';

describe('QueueService', () => {
  let service: QueueService;
  let asteriskServiceMock: any;
  let amiMock: any;
  let dbPoolMock: any;

  beforeEach(async () => {
    process.env['RUNTIME_MAX_RETRY'] = '3';
    process.env['RUNTIME_RETRY_DELAY_MS'] = '1000';
    process.env['RUNTIME_SETTIMEOUT_MS'] = '2000';
    process.env['LOG_ENABLED'] = 'true';
    resetRuntimeConfigForTest();

    amiMock = {
      action: jest.fn(),
    };

    asteriskServiceMock = {
      getAmi: jest.fn().mockReturnValue(amiMock),
    };

    dbPoolMock = {
      query: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QueueService,
        {
          provide: AsteriskService,
          useValue: asteriskServiceMock,
        },
        {
          provide: DATABASE_POOL,
          useValue: dbPoolMock,
        },
      ],
    }).compile();

    service = module.get<QueueService>(QueueService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    resetRuntimeConfigForTest();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('addMember', () => {
    it('should add a member successfully (happy path)', async () => {
      // Mock QueueAdd
      amiMock.action.mockImplementationOnce((actionObj, cb) => {
        cb(null, { response: 'Success' });
      });
      // Mock queuelog
      amiMock.action.mockImplementationOnce((actionObj, cb) => {
        cb(null, { response: 'Success' });
      });
      // Mock command (DATABASE PUT)
      amiMock.action.mockImplementationOnce((actionObj, cb) => {
        cb(null, { response: 'Success', message: 'DB Saved' });
      });

      const result = await service.addMember({
        queue: '1000',
        extension: '101',
      });

      expect(result).toHaveProperty('response', 'Success');
      expect(amiMock.action).toHaveBeenCalledTimes(3);
    });

    it('should throw error if QueueAdd fails', async () => {
      amiMock.action.mockImplementationOnce((actionObj, cb) => {
        cb(null, { response: 'Error', message: 'QueueAdd failed' });
      });

      await expect(
        service.addMember({ queue: '1000', extension: '101' }),
      ).rejects.toMatchObject({ response: 'Error' });
      
      expect(amiMock.action).toHaveBeenCalledTimes(1);
    });

    it('should throw error if AMI connection emits error', async () => {
      const errorObj = new Error('AMI disconnected');
      amiMock.action.mockImplementationOnce((actionObj, cb) => {
        cb(errorObj, null);
      });

      await expect(
        service.addMember({ queue: '1000', extension: '101' }),
      ).rejects.toThrow('AMI disconnected');
    });
  });
});
