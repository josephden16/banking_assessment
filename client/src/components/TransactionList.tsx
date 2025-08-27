"use client";

import { useState } from "react";
import type { TransactionFilters, PaginationInfo } from "../types";
import { useTransactions } from "../hooks/useTransactions";
import styles from "./TransactionList.module.css";

interface TransactionListProps {
  accountId: string;
  onClose: () => void;
}

export function TransactionList({ accountId, onClose }: TransactionListProps) {
  const [filters, setFilters] = useState<TransactionFilters>({
    type: "",
    sortBy: "createdAt",
    sortOrder: "DESC",
  });
  const [pagination, setPagination] = useState<PaginationInfo>({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10,
  });

  const { data, isLoading, error, refetch } = useTransactions(
    accountId,
    pagination.currentPage,
    pagination.itemsPerPage,
    filters.type,
    filters.sortBy,
    filters.sortOrder
  );

  const transactions = data?.transactions || [];
  const paginationData = data?.pagination;

  const handleFilterChange = (newFilters: Partial<TransactionFilters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
    setPagination((prev) => ({ ...prev, currentPage: 1 }));
  };

  const handlePageChange = (page: number) => {
    setPagination((prev) => ({ ...prev, currentPage: page }));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatAmount = (amount: number, type: string) => {
    const formattedAmount = Math.abs(amount).toFixed(2);
    const sign = type === "WITHDRAWAL" ? "-" : "+";
    const colorClass =
      type === "WITHDRAWAL" ? styles.negative : styles.positive;
    return (
      <span className={colorClass}>
        {sign}${formattedAmount}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className={styles.overlay}>
        <div className={styles.modal}>
          <div className={styles.loading} role="status" aria-live="polite">
            <div className={styles.spinner} aria-hidden="true"></div>
            <span>Loading transactions...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.overlay}>
        <div className={styles.modal}>
          <div className={styles.error} role="alert">
            <h3>Error Loading Transactions</h3>
            <p>
              {error instanceof Error
                ? error.message
                : "An unexpected error occurred"}
            </p>
            <div className={styles.errorActions}>
              <button
                onClick={() => refetch()}
                className={styles.retryButton}
                aria-label="Retry loading transactions"
              >
                Retry
              </button>
              <button onClick={onClose} className={styles.closeButton}>
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby="transaction-modal-title"
    >
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2 id="transaction-modal-title">Transaction History</h2>
          <button
            onClick={onClose}
            className={styles.closeButton}
            aria-label="Close transaction history"
          >
            ×
          </button>
        </div>

        <div className={styles.filters}>
          <label htmlFor="type-filter" className="sr-only">
            Filter by transaction type
          </label>
          <select
            id="type-filter"
            value={filters.type}
            onChange={(e) =>
              handleFilterChange({
                type: e.target.value as
                  | "DEPOSIT"
                  | "WITHDRAWAL"
                  | "TRANSFER"
                  | "",
              })
            }
            className={styles.filterSelect}
            aria-label="Filter transactions by type"
          >
            <option value="">All Types</option>
            <option value="DEPOSIT">Deposits</option>
            <option value="WITHDRAWAL">Withdrawals</option>
            <option value="TRANSFER">Transfers</option>
          </select>

          <label htmlFor="sort-filter" className="sr-only">
            Sort transactions
          </label>
          <select
            id="sort-filter"
            value={`${filters.sortBy}-${filters.sortOrder}`}
            onChange={(e) => {
              const [sortBy, sortOrder] = e.target.value.split("-") as [
                "createdAt" | "amount",
                "ASC" | "DESC"
              ];
              handleFilterChange({
                sortBy,
                sortOrder,
              });
            }}
            className={styles.filterSelect}
            aria-label="Sort transactions"
          >
            <option value="createdAt-DESC">Date (Newest First)</option>
            <option value="createdAt-ASC">Date (Oldest First)</option>
            <option value="amount-DESC">Amount (Highest First)</option>
            <option value="amount-ASC">Amount (Lowest First)</option>
          </select>
        </div>

        <div className={styles.tableContainer}>
          <table className={styles.table} role="table">
            <thead>
              <tr>
                <th scope="col">Date</th>
                <th scope="col">Type</th>
                <th scope="col">Description</th>
                <th scope="col">Amount</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={4} className={styles.emptyState}>
                    No transactions found
                  </td>
                </tr>
              ) : (
                transactions.map((transaction) => (
                  <tr key={transaction.id}>
                    <td>{formatDate(transaction.createdAt)}</td>
                    <td>
                      <span
                        className={`${styles.badge} ${
                          styles[transaction.transactionType.toLowerCase()]
                        }`}
                        aria-label={`Transaction type: ${transaction.transactionType}`}
                      >
                        {transaction.transactionType}
                      </span>
                    </td>
                    <td>{transaction.description}</td>
                    <td>
                      {formatAmount(
                        transaction.amount,
                        transaction.transactionType
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {paginationData && paginationData.totalPages > 1 && (
          <div
            className={styles.pagination}
            role="navigation"
            aria-label="Transaction pagination"
          >
            <button
              onClick={() => handlePageChange(paginationData.page - 1)}
              disabled={paginationData.page === 1}
              className={styles.paginationButton}
              aria-label="Go to previous page"
            >
              Previous
            </button>

            <span className={styles.paginationInfo} aria-live="polite">
              Page {paginationData.page} of {paginationData.totalPages}
            </span>

            <button
              onClick={() => handlePageChange(paginationData.page + 1)}
              disabled={paginationData.page === paginationData.totalPages}
              className={styles.paginationButton}
              aria-label="Go to next page"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
