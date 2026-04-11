import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mockFetch = vi.fn()

vi.mock('electron', () => ({
    safeStorage: {
        isEncryptionAvailable: () => false,
        encryptString: (value: string) => Buffer.from(value),
        decryptString: (value: Buffer) => value.toString('utf8'),
    },
}))

vi.mock('../electron/main/database', () => ({
    getAuthValue: vi.fn(),
    setAuthValue: vi.fn(),
    deleteAuthValue: vi.fn(),
}))

beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch)
})

afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
})

describe('startDeviceFlow', () => {
    it('returns GitHub device flow init data, including the polling interval', async () => {
        mockFetch.mockResolvedValue({
            ok: true,
            json: async () => ({
                user_code: 'ABCD-EFGH',
                verification_uri: 'https://github.com/login/device',
                device_code: 'device-code-123',
                expires_in: 900,
                interval: 7,
            }),
        })

        const { startDeviceFlow } = await import('../electron/main/github')
        const result = await startDeviceFlow()

        expect(mockFetch).toHaveBeenCalledWith('https://github.com/login/device/code', expect.objectContaining({
            method: 'POST',
        }))
        expect(result).toEqual({
            user_code: 'ABCD-EFGH',
            verification_uri: 'https://github.com/login/device',
            device_code: 'device-code-123',
            expires_in: 900,
            interval: 7,
        })
    })
})
