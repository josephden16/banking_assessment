"use client";

import { useState } from "react";
import { useAccounts } from "../hooks/useAccount";
import { TransactionList } from "./TransactionList";
import { NewTransactionForm } from "./NewTransactionForm";
import styles from "./AccountList.module.css";

export function AccountList() {
  const { data: accounts = [], isLoading, error, refetch } = useAccounts();
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(
    null
  );
  const [showTransactionForm, setShowTransactionForm] = useState<string | null>(
    null
  );

  const viewAccountTransactions = (accountId: string) => {
    setSelectedAccountId(accountId);
  };

  const handleNewTransaction = (accountId: string) => {
    setShowTransactionForm(accountId);
  };

  const handleTransactionCreated = () => {};

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading} role="status" aria-live="polite">
          <div className={styles.spinner} aria-hidden="true"></div>
          Loading accounts...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.error} role="alert">
          <h3>Error Loading Accounts</h3>
          <p>
            {error instanceof Error
              ? error.message
              : "An unexpected error occurred"}
          </p>
          <button
            onClick={() => refetch()}
            className={styles.retryButton}
            aria-label="Retry loading accounts"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>Accounts</h2>
        <p className={styles.subtitle}>
          Manage your banking accounts and transactions
        </p>
      </div>

      <div className={styles.grid} role="list">
        {accounts.map((account) => (
          <div key={account.id} className={styles.card} role="listitem">
            <div className={styles.cardHeader}>
              <h3>{account.accountHolder}</h3>
              <span
                className={`${styles.accountType} ${
                  styles[account.accountType.toLowerCase()]
                }`}
              >
                {account.accountType}
              </span>
            </div>

            <div className={styles.cardContent}>
              <p className={styles.accountNumber}>
                Account: {account.accountNumber}
              </p>
              <p className={styles.balance}>
                Balance:{" "}
                <span className={styles.balanceAmount}>
                  ${account.balance.toFixed(2)}
                </span>
              </p>
              <p className={styles.createdDate}>
                Created: {new Date(account.createdAt).toLocaleDateString()}
              </p>
            </div>

            <div className={styles.cardActions}>
              <button
                onClick={() => viewAccountTransactions(account.id)}
                className={styles.primaryButton}
                aria-label={`View transactions for ${account.accountHolder}'s account`}
              >
                View Transactions
              </button>
              <button
                onClick={() => handleNewTransaction(account.id)}
                className={styles.secondaryButton}
                aria-label={`Create new transaction for ${account.accountHolder}'s account`}
              >
                New Transaction
              </button>
            </div>
          </div>
        ))}
      </div>

      {selectedAccountId && (
        <TransactionList
          accountId={selectedAccountId}
          onClose={() => setSelectedAccountId(null)}
        />
      )}

      {showTransactionForm && (
        <NewTransactionForm
          accountId={showTransactionForm}
          onClose={() => setShowTransactionForm(null)}
          onTransactionCreated={handleTransactionCreated}
        />
      )}
    </div>
  );
}
