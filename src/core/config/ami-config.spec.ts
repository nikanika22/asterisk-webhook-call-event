import { loadAmiConfigs } from '../../core/config/ami-config';
import { loadRuntimeConfig, resetRuntimeConfigForTest } from './runtime-config';

describe('loadAmiConfigs', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        // Reset process.env before each test
        process.env = { ...originalEnv };
        // Remove any leftover AMI keys from test env
        Object.keys(process.env)
            .filter((k) => /^AMI_(HOST|PORT|USER|PASS)_\d+$/.test(k))
            .forEach((k) => delete process.env[k]);
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    it('should load a single valid PBX config', () => {
        process.env['AMI_HOST_01'] = '192.168.1.1';
        process.env['AMI_PORT_01'] = '5038';
        process.env['AMI_USER_01'] = 'admin';
        process.env['AMI_PASS_01'] = 'secret';

        const configs = loadAmiConfigs();

        expect(configs).toHaveLength(1);
        expect(configs[0]).toEqual({
            pbxId: '01',
            host: '192.168.1.1',
            port: 5038,
            user: 'admin',
            pass: 'secret',
        });
    });

    it('should load multiple PBX configs', () => {
        process.env['AMI_HOST_01'] = '10.0.0.1';
        process.env['AMI_PORT_01'] = '5038';
        process.env['AMI_USER_01'] = 'admin1';
        process.env['AMI_PASS_01'] = 'pass1';

        process.env['AMI_HOST_02'] = '10.0.0.2';
        process.env['AMI_PORT_02'] = '5038';
        process.env['AMI_USER_02'] = 'admin2';
        process.env['AMI_PASS_02'] = 'pass2';

        const configs = loadAmiConfigs();

        expect(configs).toHaveLength(2);
        const pbxIds = configs.map((c) => c.pbxId).sort();
        expect(pbxIds).toEqual(['01', '02']);
    });

    it('should skip an entry missing AMI_PASS and still load valid ones', () => {
        process.env['AMI_HOST_01'] = '10.0.0.1';
        process.env['AMI_PORT_01'] = '5038';
        process.env['AMI_USER_01'] = 'admin1';
        // AMI_PASS_01 intentionally missing

        process.env['AMI_HOST_02'] = '10.0.0.2';
        process.env['AMI_PORT_02'] = '5038';
        process.env['AMI_USER_02'] = 'admin2';
        process.env['AMI_PASS_02'] = 'pass2';

        const configs = loadAmiConfigs();

        expect(configs).toHaveLength(1);
        expect(configs[0].pbxId).toBe('02');
    });

    it('should throw if no valid AMI config found', () => {
        // No AMI_HOST_nn keys set
        expect(() => loadAmiConfigs()).toThrow(
            /No valid AMI connection found/,
        );
    });

    it('should not use legacy AMI_HOST (non-numbered) keys', () => {
        // Old-style var should be ignored entirely
        process.env['AMI_HOST'] = '10.0.0.1';
        process.env['AMI_PORT'] = '5038';
        process.env['AMI_USER'] = 'admin';
        process.env['AMI_PASS'] = 'pass';

        expect(() => loadAmiConfigs()).toThrow(/No valid AMI connection found/);
    });
});

describe('loadRuntimeConfig', () => {
    const validEnv = {
        RUNTIME_MAX_RETRY: '3',
        RUNTIME_RETRY_DELAY_MS: '1000',
        RUNTIME_SETTIMEOUT_MS: '2000',
        LOG_ENABLED: 'true',
    };

    afterEach(() => {
        resetRuntimeConfigForTest();
    });

    it('should throw when a required env is missing', () => {
        const env: Record<string, string> = { ...validEnv };
        delete env['RUNTIME_MAX_RETRY'];

        expect(() => loadRuntimeConfig(env)).toThrow(/RUNTIME_MAX_RETRY/);
    });

    it('should parse valid number env values', () => {
        expect(loadRuntimeConfig(validEnv)).toMatchObject({
            maxRetry: 3,
            retryDelayMs: 1000,
            setTimeoutMs: 2000,
        });
    });

    it('should parse boolean true false and numeric aliases', () => {
        expect(loadRuntimeConfig({ ...validEnv, LOG_ENABLED: 'true' }).logEnabled).toBe(true);
        expect(loadRuntimeConfig({ ...validEnv, LOG_ENABLED: '1' }).logEnabled).toBe(true);
        expect(loadRuntimeConfig({ ...validEnv, LOG_ENABLED: 'false' }).logEnabled).toBe(false);
        expect(loadRuntimeConfig({ ...validEnv, LOG_ENABLED: '0' }).logEnabled).toBe(false);
    });

    it('should throw when number or boolean env has invalid format', () => {
        expect(() => loadRuntimeConfig({ ...validEnv, RUNTIME_MAX_RETRY: 'abc' })).toThrow(/RUNTIME_MAX_RETRY/);
        expect(() => loadRuntimeConfig({ ...validEnv, LOG_ENABLED: 'yes' })).toThrow(/LOG_ENABLED/);
    });
});
