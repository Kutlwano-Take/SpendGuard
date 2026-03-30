/// <reference types="jest" />
import '@testing-library/jest-dom';

// Mock AWS Amplify
const mockFetchAuthSession = jest.fn().mockResolvedValue({
  tokens: {
    accessToken: {
      toString: () => 'mock-access-token',
    },
    idToken: {
      toString: () => 'mock-id-token',
    },
  },
});

jest.mock('aws-amplify/auth', () => ({
  fetchAuthSession: mockFetchAuthSession,
}));

// Mock API calls
global.fetch = jest.fn();

// Mock environment variables
process.env.VITE_API_BASE_URL = 'http://localhost:3001';
