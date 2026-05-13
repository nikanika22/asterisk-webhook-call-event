import { buildMasterHangupOverride, buildBranchKey, cleanupCallState } from './helperAsterisk';
import { StoreService } from '../store/store.service';
import { Logger } from '@nestjs/common';

describe('buildMasterHangupOverride', () => {
    const inboundMultiBranchState = {
        fromnumber: '0987654321',
        calltype: 'Inbound',
        channel: 'PJSIP/8000-000002ed',
        destchannel: 'PJSIP/8004-000002ee',
        extension: '8004',
        tonumber: '8004',
        isMultiBranch: true,
        status: 'answered',
    };

    it('should use answered agent extension for multi-branch answered master hangup', () => {
        const result = buildMasterHangupOverride(
            inboundMultiBranchState,
            {
                channel: 'PJSIP/8000-000002ed',
                connectedlinenum: '8004',
            },
            true,
        );

        expect(result).toEqual({
            channel: 'PJSIP/8000-000002ed',
            destchannel: 'PJSIP/8004-000002ee',
            extension: '8004',
            tonumber: '8004',
            status: 'hangup',
        });
    });

    it('should not use customer phone as extension for multi-branch no-answer master hangup', () => {
        const result = buildMasterHangupOverride(
            {
                ...inboundMultiBranchState,
                status: 'ringing',
            },
            {
                channel: 'PJSIP/8000-000002ed',
                connectedlinenum: '<unknown>',
            },
            false,
        );

        expect(result).toEqual({
            channel: 'PJSIP/8000-000002ed',
            destchannel: '',
            extension: '',
            tonumber: '',
            status: 'hangup',
        });
    });

    it('should keep single-branch master hangup behavior unchanged', () => {
        const result = buildMasterHangupOverride(
            {
                fromnumber: '8001',
                calltype: 'Internal',
                channel: 'PJSIP/8001-000000aa',
                destchannel: 'PJSIP/8002-000000ab',
                extension: '8002',
                tonumber: '8002',
                status: 'ringing',
            },
            {
                channel: 'PJSIP/8001-000000aa',
                connectedlinenum: '<unknown>',
            },
        );

        expect(result).toEqual({
            channel: 'PJSIP/8001-000000aa',
            destchannel: 'PJSIP/8001-000000aa',
            extension: '8001',
            tonumber: '8002',
            status: 'hangup',
        });
    });
});

describe('buildBranchKey', () => {
    it('should include pbxId in the key', () => {
        const key = buildBranchKey('01', '12345.678', 'PJSIP/100-0001');
        expect(key).toBe('01::12345.678::PJSIP/100-0001');
    });
});

describe('cleanupCallState', () => {
    let store: StoreService;
    const logger = new Logger('Test');

    beforeEach(() => {
        store = new StoreService();
        store.arrDialState = {
            '01::linked-1': { id: 1 },
            '02::linked-1': { id: 2 },
        };
        store.uniqueidToLinkedid = {
            '01::unique-1': '01::linked-1',
            '02::unique-1': '02::linked-1',
        };
        store.arrBranchState = {
            '01::linked-1::SIP/101': { branch: 1 },
            '02::linked-1::SIP/101': { branch: 2 },
        };
    });

    it('should only clean up keys for the specified pbxId', () => {
        cleanupCallState(store, '01', 'linked-1', 'test.json');

        // PBX 01 keys should be gone
        expect(store.arrDialState['01::linked-1']).toBeUndefined();
        expect(store.uniqueidToLinkedid['01::unique-1']).toBeUndefined();
        expect(store.arrBranchState['01::linked-1::SIP/101']).toBeUndefined();

        // PBX 02 keys should remain
        expect(store.arrDialState['02::linked-1']).toBeDefined();
        expect(store.uniqueidToLinkedid['02::unique-1']).toBeDefined();
        expect(store.arrBranchState['02::linked-1::SIP/101']).toBeDefined();
    });
});
