import type { Account, TransactionRequest, TransactionResponse } from "./types";

const API_URL = "http://localhost:3003/api";

const handleApiError = async (response: Response): Promise<never> => {
  let errorMessage = `HTTP ${response.status}: ${response.statusText}`;

  try {
    const errorData = await response.json();
    if (errorData.error?.message) {
      errorMessage = errorData.error.message;
    } else if (errorData.message) {
      errorMessage = errorData.message;
    }
  } catch {
    // If JSON parsing fails, use the default error message
  }

  throw new Error(errorMessage);
};

export const getAccounts = async (): Promise<Account[]> => {
  try {
    const response = await fetch(`${API_URL}/accounts`);
    if (!response.ok) {
      await handleApiError(response);
    }
    return response.json();
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Failed to fetch accounts");
  }
};

export const getAccount = async (id: string): Promise<Account> => {
  try {
    const response = await fetch(`${API_URL}/accounts/${id}`);
    if (!response.ok) {
      await handleApiError(response);
    }
    return response.json();
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Failed to fetch account");
  }
};

export const getAccountTransactions = async (
  id: string,
  page = 1,
  limit = 10,
  type?: string,
  sortBy?: string,
  sortOrder?: string
): Promise<TransactionResponse> => {
  try {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(type && { type }),
      ...(sortBy && { sortBy }),
      ...(sortOrder && { sortOrder }),
    });

    const response = await fetch(
      `${API_URL}/accounts/${id}/transactions?${params}`
    );
    if (!response.ok) {
      await handleApiError(response);
    }

    const data = await response.json();

    // Handle both array response (legacy) and paginated response
    if (Array.isArray(data)) {
      return {
        transactions: data,
        pagination: {
          page,
          limit,
          total: data.length,
          totalPages: 1,
        },
      };
    }

    return data;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Failed to fetch account transactions");
  }
};

export const createTransaction = async (
  accountId: string,
  transaction: TransactionRequest
): Promise<{ message: string }> => {
  try {
    const response = await fetch(
      `${API_URL}/accounts/${accountId}/transactions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(transaction),
      }
    );

    if (!response.ok) {
      await handleApiError(response);
    }

    return response.json();
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Failed to create transaction");
  }
};
