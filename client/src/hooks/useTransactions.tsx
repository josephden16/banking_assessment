import { useQuery } from "@tanstack/react-query";
import { getAccountTransactions } from "../api";
import type { AccountTransaction } from "../types";

export function useTransactions(
  accountId: string,
  page = 1,
  limit = 10,
  type?: string,
  sortBy?: string,
  sortOrder?: "asc" | "desc"
) {
  return useQuery<{
    transactions: AccountTransaction[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }>({
    queryKey: ["transactions", accountId, page, limit, type, sortBy, sortOrder],
    queryFn: () =>
      getAccountTransactions(accountId, page, limit, type, sortBy, sortOrder),
    enabled: !!accountId,
    staleTime: 1000 * 60, // 1 minute
  });
}
