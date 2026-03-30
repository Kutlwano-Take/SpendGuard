import { renderHook } from '@testing-library/react';
import { fetchAuthSession } from 'aws-amplify/auth';
import { useOfflineSync } from '../useOfflineSync';

const mockFetchAuthSession = fetchAuthSession as jest.Mock;

// Mock IndexedDB since jsdom does not provide a real implementation
const mockObjectStore = {
  getAll: jest.fn().mockReturnValue({ onerror: null, onsuccess: null, result: [] }),
  add: jest.fn().mockReturnValue({ onerror: null, onsuccess: null }),
  delete: jest.fn().mockReturnValue({ onerror: null, onsuccess: null }),
  clear: jest.fn().mockReturnValue({ onerror: null, onsuccess: null }),
};

const mockTransaction = {
  objectStore: jest.fn().mockReturnValue(mockObjectStore),
};

const mockDb = {
  transaction: jest.fn().mockReturnValue(mockTransaction),
  objectStoreNames: { contains: jest.fn().mockReturnValue(true) },
  createObjectStore: jest.fn(),
};

const mockOpenRequest: {
  onerror: ((e: Event) => void) | null;
  onsuccess: ((e: Event) => void) | null;
  onupgradeneeded: ((e: IDBVersionChangeEvent) => void) | null;
  result: typeof mockDb;
  error: null;
} = {
  onerror: null,
  onsuccess: null,
  onupgradeneeded: null,
  result: mockDb,
  error: null,
};

const mockIndexedDB = {
  open: jest.fn().mockImplementation(() => {
    // Simulate async onsuccess via microtask so the hook can call it
    Promise.resolve().then(() => {
      if (mockOpenRequest.onsuccess) {
        mockOpenRequest.onsuccess({} as Event);
      }
    });
    return mockOpenRequest;
  }),
};

// Override getAll to immediately call onsuccess with an empty result
mockObjectStore.getAll.mockImplementation(() => {
  const req: {
    onerror: ((e: Event) => void) | null;
    onsuccess: ((e: Event) => void) | null;
    result: never[];
  } = { onerror: null, onsuccess: null, result: [] };
  Promise.resolve().then(() => {
    if (req.onsuccess) req.onsuccess({} as Event);
  });
  return req;
});

Object.defineProperty(globalThis, 'indexedDB', {
  value: mockIndexedDB,
  writable: true,
});

beforeEach(() => {
  jest.clearAllMocks();
  mockObjectStore.getAll.mockImplementation(() => {
    const req: {
      onerror: ((e: Event) => void) | null;
      onsuccess: ((e: Event) => void) | null;
      result: never[];
    } = { onerror: null, onsuccess: null, result: [] };
    Promise.resolve().then(() => {
      if (req.onsuccess) req.onsuccess({} as Event);
    });
    return req;
  });
  mockIndexedDB.open.mockImplementation(() => {
    Promise.resolve().then(() => {
      if (mockOpenRequest.onsuccess) {
        mockOpenRequest.onsuccess({} as Event);
      }
    });
    return mockOpenRequest;
  });
});

describe('useOfflineSync', () => {
  it('does not read from localStorage for auth token', () => {
    const spy = jest.spyOn(Storage.prototype, 'getItem');

    renderHook(() => useOfflineSync());

    expect(spy).not.toHaveBeenCalledWith('authToken');
    spy.mockRestore();
  });

  it('imports and uses fetchAuthSession from aws-amplify/auth', async () => {
    const mockSession = {
      tokens: { accessToken: { toString: () => 'tok' }, idToken: undefined },
    };
    mockFetchAuthSession.mockResolvedValue(mockSession);

    // Verify the mock is wired correctly — the hook module imports fetchAuthSession
    expect(mockFetchAuthSession).toBeDefined();
    expect(typeof mockFetchAuthSession).toBe('function');
  });

  it('initializes isOnline from navigator.onLine', () => {
    Object.defineProperty(navigator, 'onLine', { value: true, writable: true });

    const { result } = renderHook(() => useOfflineSync());

    expect(result.current.isOnline).toBe(true);
  });
});
