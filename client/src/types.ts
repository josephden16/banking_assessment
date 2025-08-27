export interface Account {
  id: string;
  accountNumber: string;
  accountType: "CHECKING" | "SAVINGS";
  balance: number;
  accountHolder: string;
  createdAt: string;
}

export interface AccountTransaction {
  id: string;
  accountId: string;
  transactionType: "DEPOSIT" | "WITHDRAWAL" | "TRANSFER";
  amount: number;
  description: string;
  createdAt: string;
}

export interface TransactionFilters {
  type?: "DEPOSIT" | "WITHDRAWAL" | "TRANSFER" | "";
  sortBy?: "date" | "amount";
  sortOrder?: "asc" | "desc";
}

export interface TransactionRequest {
  type: "DEPOSIT" | "WITHDRAWAL" | "TRANSFER";
  amount: number;
  description: string;
  recipientAccount?: string;
}

/** @deprecated Use TransactionRequest instead */
export interface NewTransaction {
  accountId: string;
  transactionType: "DEPOSIT" | "WITHDRAWAL" | "TRANSFER";
  amount: number;
  description: string;
  recipientAccountId?: string;
}

export interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
}

export interface TransactionResponse {
  transactions: AccountTransaction[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiError {
  error: {
    message: string;
    details?: string;
  };
}
