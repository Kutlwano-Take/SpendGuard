import { listExpenses, createExpense, getBudgetSummary } from '../api';
import { fetchAuthSession } from 'aws-amplify/auth';

// Mock fetch
global.fetch = jest.fn();

const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
const mockFetchAuthSession = fetchAuthSession as jest.Mock;

describe('API functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('listExpenses', () => {
    it('should fetch expenses successfully', async () => {
      const mockResponse = {
        items: [
          {
            expenseId: 'test-id',
            amount: 100,
            category: 'Food',
            date: '2026-01-15',
            notes: 'Test expense',
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await listExpenses();

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/expenses',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );

      expect(result).toEqual([
        {
          id: 'test-id',
          amount: 100,
          category: 'Food',
          date: '2026-01-15',
          notes: 'Test expense',
        },
      ]);
    });

    it('should handle API errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      } as Response);

      await expect(listExpenses()).rejects.toThrow('Request failed: 500');
    });
  });

  describe('createExpense', () => {
    it('should create expense successfully', async () => {
      const expenseData = {
        amount: 50,
        category: 'Transport',
        date: '2026-01-15',
        notes: 'Bus ticket',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ expenseId: 'new-id', createdAt: '2026-01-15T10:00:00Z' }),
      } as Response);

      await createExpense(expenseData);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/expenses',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify(expenseData),
        })
      );
    });

    it('should handle validation errors', async () => {
      const invalidExpense = {
        amount: -50, // Negative amount
        category: '',
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ message: 'Invalid input' }),
      } as Response);

      await expect(createExpense(invalidExpense)).rejects.toThrow('Request failed: 400');
    });
  });

  describe('getBudgetSummary', () => {
    it('should fetch budget summary successfully', async () => {
      const mockResponse = {
        items: [
          {
            budgetId: 'budget-1',
            category: 'Food',
            limit: 500,
            spent: 250,
            period: 'monthly',
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await getBudgetSummary();

      expect(result).toEqual([
        {
          id: 'budget-1',
          category: 'Food',
          limit: 500,
          spent: 250,
          period: 'monthly',
        },
      ]);
    });
  });
});

describe('auth failure propagation', () => {
  const mockAccessToken = { toString: () => 'mock-access-token' };
  const mockIdToken = { toString: () => 'mock-id-token' };
  const mockSession = { tokens: { accessToken: mockAccessToken, idToken: mockIdToken } };

  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockReset();
  });

  it('fetchAuthSession throws → no fetch call fires', async () => {
    mockFetchAuthSession.mockRejectedValueOnce(new Error('No current user'));

    await expect(listExpenses()).rejects.toThrow('No current user');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('fetchAuthSession returns empty tokens → throws before fetch', async () => {
    mockFetchAuthSession.mockResolvedValueOnce({ tokens: undefined });

    await expect(getBudgetSummary()).rejects.toThrow(/Auth token|not available/);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('auth success but fetch returns 401 → throws with status', async () => {
    mockFetchAuthSession.mockResolvedValueOnce(mockSession);
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false, status: 401 });

    await expect(listExpenses()).rejects.toThrow('401');
  });

  it('auth success but fetch returns 500 → throws with status', async () => {
    mockFetchAuthSession.mockResolvedValueOnce(mockSession);
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false, status: 500 });

    await expect(createExpense({ amount: 50, category: 'Groceries' })).rejects.toThrow('500');
  });

  it('auth success, fetch returns 200 → resolves correctly', async () => {
    mockFetchAuthSession.mockResolvedValueOnce(mockSession);
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ items: [] }),
    });

    const result = await listExpenses();

    expect(result).toEqual([]);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/expenses'),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer mock-access-token',
        }),
      })
    );
  });
});
