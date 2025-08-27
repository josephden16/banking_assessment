"use client";

import type React from "react";
import { useState } from "react";
import type { TransactionRequest } from "../types";
import { useCreateTransaction } from "../hooks/useAccount";
import styles from "./NewTransactionForm.module.css";

interface NewTransactionFormProps {
  accountId: string;
  onClose: () => void;
  onTransactionCreated: () => void;
}

export function NewTransactionForm({
  accountId,
  onClose,
  onTransactionCreated,
}: NewTransactionFormProps) {
  const [formData, setFormData] = useState<TransactionRequest>({
    transactionType: "DEPOSIT",
    amount: 0,
    description: "",
  });
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});

  const createTransactionMutation = useCreateTransaction();

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (formData.amount <= 0) {
      errors.amount = "Amount must be greater than 0";
    }

    if (formData.amount > 1000000) {
      errors.amount = "Amount cannot exceed $1,000,000";
    }

    if (!formData.description.trim()) {
      errors.description = "Description is required";
    }

    if (formData.description.length > 200) {
      errors.description = "Description cannot exceed 200 characters";
    }

    if (
      formData.transactionType === "TRANSFER" &&
      !formData.recipientAccount?.trim()
    ) {
      errors.recipientAccount =
        "Recipient account number is required for transfers";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      await createTransactionMutation.mutateAsync({
        accountId,
        transaction: formData,
      });

      onTransactionCreated();
      onClose();
    } catch {
      // Error is handled by React Query and displayed below
    }
  };

  const handleInputChange = (
    field: keyof TransactionRequest,
    value: unknown
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Clear validation error when user starts typing
    if (validationErrors[field]) {
      setValidationErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby="transaction-form-title"
    >
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2 id="transaction-form-title">New Transaction</h2>
          <button
            onClick={onClose}
            className={styles.closeButton}
            aria-label="Close new transaction form"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form} noValidate>
          <div className={styles.formGroup}>
            <label htmlFor="transactionType" className={styles.label}>
              Transaction Type *
            </label>
            <select
              id="transactionType"
              value={formData.transactionType}
              onChange={(e) =>
                handleInputChange("transactionType", e.target.value)
              }
              className={styles.select}
              required
              aria-describedby="transactionType-help"
            >
              <option value="DEPOSIT">Deposit</option>
              <option value="WITHDRAWAL">Withdrawal</option>
              <option value="TRANSFER">Transfer</option>
            </select>
            <div id="transactionType-help" className={styles.helpText}>
              Select the type of transaction you want to create
            </div>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="amount" className={styles.label}>
              Amount ($) *
            </label>
            <input
              id="amount"
              type="number"
              step="0.01"
              min="1"
              max="1000000"
              value={formData.amount || ""}
              onChange={(e) =>
                handleInputChange(
                  "amount",
                  Number.parseFloat(e.target.value) || 0
                )
              }
              className={`${styles.input} ${
                validationErrors.amount ? styles.inputError : ""
              }`}
              placeholder="0.00"
              required
              aria-describedby={
                validationErrors.amount ? "amount-error" : "amount-help"
              }
            />
            {!validationErrors.amount && (
              <div id="amount-help" className={styles.helpText}>
                Enter amount between $1 and $1,000,000
              </div>
            )}
            {validationErrors.amount && (
              <span id="amount-error" className={styles.errorText} role="alert">
                {validationErrors.amount}
              </span>
            )}
          </div>

          {formData.transactionType === "TRANSFER" && (
            <div className={styles.formGroup}>
              <label htmlFor="recipientAccount" className={styles.label}>
                Recipient Account Number *
              </label>
              <input
                id="recipientAccount"
                type="text"
                value={formData.recipientAccount || ""}
                onChange={(e) =>
                  handleInputChange("recipientAccount", e.target.value)
                }
                className={`${styles.input} ${
                  validationErrors.recipientAccount ? styles.inputError : ""
                }`}
                placeholder="Enter recipient account number"
                required
                aria-describedby={
                  validationErrors.recipientAccount
                    ? "recipient-error"
                    : "recipient-help"
                }
              />
              {!validationErrors.recipientAccount && (
                <div id="recipient-help" className={styles.helpText}>
                  Enter the account number to transfer money to
                </div>
              )}
              {validationErrors.recipientAccount && (
                <span
                  id="recipient-error"
                  className={styles.errorText}
                  role="alert"
                >
                  {validationErrors.recipientAccount}
                </span>
              )}
            </div>
          )}

          <div className={styles.formGroup}>
            <label htmlFor="description" className={styles.label}>
              Description *
            </label>
            <input
              id="description"
              type="text"
              maxLength={200}
              value={formData.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              className={`${styles.input} ${
                validationErrors.description ? styles.inputError : ""
              }`}
              placeholder="Enter transaction description"
              required
              aria-describedby={
                validationErrors.description
                  ? "description-error"
                  : "description-help"
              }
            />
            <div className={styles.charCount} aria-live="polite">
              {formData.description.length}/200 characters
            </div>
            {!validationErrors.description && (
              <div id="description-help" className={styles.helpText}>
                Provide a brief description of the transaction
              </div>
            )}
            {validationErrors.description && (
              <span
                id="description-error"
                className={styles.errorText}
                role="alert"
              >
                {validationErrors.description}
              </span>
            )}
          </div>

          {createTransactionMutation.error && (
            <div className={styles.error} role="alert">
              <h4>Transaction Failed</h4>
              <p>
                {createTransactionMutation.error instanceof Error
                  ? createTransactionMutation.error.message
                  : "Failed to create transaction"}
              </p>
            </div>
          )}

          <div className={styles.actions}>
            <button
              type="button"
              onClick={onClose}
              className={styles.cancelButton}
              disabled={createTransactionMutation.isPending}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.submitButton}
              disabled={createTransactionMutation.isPending}
              aria-describedby="submit-status"
            >
              {createTransactionMutation.isPending ? (
                <>
                  <span className={styles.spinner} aria-hidden="true"></span>
                  Creating...
                </>
              ) : (
                "Create Transaction"
              )}
            </button>
            <div id="submit-status" className="sr-only" aria-live="polite">
              {createTransactionMutation.isPending
                ? "Creating transaction, please wait"
                : ""}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
