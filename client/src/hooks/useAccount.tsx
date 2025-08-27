import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAccounts, createTransaction } from "../api";
import type { Account, TransactionRequest } from "../types";

export function useAccounts() {
  return useQuery<Account[]>({
    queryKey: ["accounts"],
    queryFn: getAccounts,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

export function useCreateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      accountId,
      transaction,
    }: {
      accountId: string;
      transaction: TransactionRequest;
    }) => createTransaction(accountId, transaction),
    onMutate: async ({ accountId, transaction }) => {
      await queryClient.cancelQueries({ queryKey: ["accounts"] });
      await queryClient.cancelQueries({
        queryKey: ["transactions", accountId],
      });

      const previousAccounts = queryClient.getQueryData<Account[]>([
        "accounts",
      ]);

      if (previousAccounts) {
        const updatedAccounts = previousAccounts.map((account) => {
          if (account.id === accountId) {
            let newBalance = account.balance;
            if (transaction.type === "DEPOSIT") {
              newBalance += transaction.amount;
            } else if (transaction.type === "WITHDRAWAL") {
              newBalance -= transaction.amount;
            } else if (transaction.type === "TRANSFER") {
              newBalance -= transaction.amount;
            }
            return { ...account, balance: newBalance };
          }
          if (
            transaction.type === "TRANSFER" &&
            account.accountNumber === transaction.recipientAccount
          ) {
            return {
              ...account,
              balance: account.balance + transaction.amount,
            };
          }
          return account;
        });
        queryClient.setQueryData(["accounts"], updatedAccounts);
      }

      return { previousAccounts };
    },
    onError: (err, variables, context) => {
      if (context?.previousAccounts) {
        queryClient.setQueryData(["accounts"], context.previousAccounts);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
    },
  });
}
