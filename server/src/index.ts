/**
 * Banking Dashboard API Server
 *
 * TECHNICAL ASSESSMENT NOTES:
 * This is a basic implementation with intentional areas for improvement:
 * - Currently uses in-memory SQLite (not persistent)
 * - Basic error handling
 * - No authentication/authorization
 * - No input validation
 * - No rate limiting
 * - No caching
 * - No logging system
 * - No tests
 *
 * Candidates should consider:
 * - Data persistence
 * - Security measures
 * - API documentation
 * - Error handling
 * - Performance optimization
 * - Code organization
 * - Testing strategy
 */

import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import sqlite3 from "sqlite3";
import { Database } from "sqlite3";
import morgan from "morgan";
import helmet from "helmet";
import * as z from "zod";
import sanitizeHtml from "sanitize-html";
import path from "path";

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3003;

// Database configuration for persistent storage
const DB_PATH = path.join(__dirname, "banking.db");
const db: Database = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error("Error opening database:", err);
  } else {
    console.log("Connected to SQLite database at", DB_PATH);
    initializeDatabase();
  }
});

// Middleware setup
app.use(cors({ origin: true }));
app.use(helmet());
app.use(express.json());
app.use(morgan("dev"));

// Centralized error handling middleware
interface CustomError extends Error {
  status?: number;
}

app.use((err: CustomError, req: Request, res: Response, next: NextFunction) => {
  console.error("Error:", err.message);
  res.status(err.status || 500).json({
    error: {
      message: err.message || "Internal Server Error",
      timestamp: new Date().toISOString(),
    },
  });
});

// Database schema definitions
const AccountSchema = z.object({
  id: z.string().uuid(),
  accountNumber: z.string().min(4).max(20),
  accountType: z.enum(["CHECKING", "SAVINGS"]),
  balance: z.number().min(0),
  accountHolder: z.string().min(1).max(100),
  createdAt: z.string().datetime(),
});

const TransactionSchema = z.object({
  transactionType: z.enum(["DEPOSIT", "WITHDRAWAL", "TRANSFER"]),
  amount: z.number().min(1),
  description: z.string().min(1).max(200),
  recipientAccountId: z.string().uuid().optional(),
});

// New schema for transaction queries
const TransactionQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).default(10),
  type: z.enum(["DEPOSIT", "WITHDRAWAL", "TRANSFER"]).optional(),
  sortBy: z.enum(["createdAt", "amount", "transactionType"]).optional(),
  sortOrder: z.enum(["ASC", "DESC"]).optional(),
});

/**
 * Initializes database tables and indexes
 */
function initializeDatabase() {
  const createAccountsTable = `
    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY,
      accountNumber TEXT UNIQUE,
      accountType TEXT CHECK(accountType IN ('CHECKING', 'SAVINGS')),
      balance REAL,
      accountHolder TEXT,
      createdAt TEXT
    );
  `;

  const createTransactionsTable = `
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      accountId TEXT REFERENCES accounts(id) ON DELETE CASCADE,
      amount REAL,
      transactionType TEXT CHECK(transactionType IN ('DEPOSIT', 'WITHDRAWAL', 'TRANSFER')),
      description TEXT,
      createdAt TEXT
    );
  `;

  const createIndexes = `
    CREATE INDEX IF NOT EXISTS idx_accounts_accountNumber ON accounts(accountNumber);
    CREATE INDEX IF NOT EXISTS idx_transactions_accountId ON transactions(accountId);
    CREATE INDEX IF NOT EXISTS idx_transactions_createdAt ON transactions(createdAt);
    CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(transactionType);
    CREATE INDEX IF NOT EXISTS idx_transactions_amount ON transactions(amount);
  `;

  db.serialize(() => {
    db.run(createAccountsTable, handleDbError("creating accounts table"));
    db.run(
      createTransactionsTable,
      handleDbError("creating transactions table")
    );
    db.run(createIndexes, handleDbError("creating indexes"));
    insertSampleData();
  });
}

/**
 * Helper function to create database error handlers
 */
function handleDbError(operation: string) {
  return (err: Error | null) => {
    if (err) {
      console.error(`Error ${operation}:`, err);
      return new Error(`Database error during ${operation}`);
    }
  };
}

/* Inserts sample data into the database
 */
function insertSampleData() {
  const sampleAccounts = [
    {
      id: "550e8400-e29b-41d4-a716-446655440000",
      accountNumber: "1001",
      accountType: "CHECKING",
      balance: 5000.0,
      accountHolder: sanitizeHtml("John Doe"),
      createdAt: new Date().toISOString(),
    },
    {
      id: "550e8400-e29b-41d4-a716-446655440001",
      accountNumber: "1002",
      accountType: "SAVINGS",
      balance: 10000.0,
      accountHolder: sanitizeHtml("Jane Smith"),
      createdAt: new Date().toISOString(),
    },
  ];

  const insertQuery = `
    INSERT OR REPLACE INTO accounts (id, accountNumber, accountType, balance, accountHolder, createdAt)
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  db.serialize(() => {
    sampleAccounts.forEach((account) => {
      const parsed = AccountSchema.safeParse(account);
      if (!parsed.success) {
        console.error("Invalid sample account data:", parsed.error);
        return;
      }
      db.run(
        insertQuery,
        [
          account.id,
          account.accountNumber,
          account.accountType,
          account.balance,
          account.accountHolder,
          account.createdAt,
        ],
        handleDbError("inserting sample data")
      );
    });
  });
}

/**
 * Sanitizes input to prevent SQL injection and XSS
 */
function sanitizeInput<T>(input: T): T {
  if (typeof input === "string") {
    return sanitizeHtml(input) as T;
  }
  if (typeof input === "object" && input !== null) {
    const sanitized: any = {};
    for (const key in input) {
      sanitized[key] = sanitizeInput(input[key]);
    }
    return sanitized;
  }
  return input;
}

/**
 * Creates a transaction record
 */
async function createTransaction(
  accountId: string,
  transactionType: string,
  amount: number,
  description: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    db.run(
      "INSERT INTO transactions (transactionType, amount, description, accountId, createdAt) VALUES (?, ?, ?, ?, ?)",
      [
        transactionType,
        amount,
        sanitizeInput(description),
        accountId,
        new Date().toISOString(),
      ],
      (err) => {
        if (err) reject(new Error("Failed to create transaction"));
        else resolve();
      }
    );
  });
}

/**
 * Get all accounts
 * @route GET /api/accounts
 */
app.get("/api/accounts", async (req: Request, res: Response) => {
  db.all("SELECT * FROM accounts", (err, rows) => {
    if (err) {
      return res.status(500).json({
        error: {
          message: "Failed to fetch accounts",
          timestamp: new Date().toISOString(),
        },
      });
    }
    res.json(rows);
  });
});

/**
 * Get account by ID
 * @route GET /api/accounts/:id
 */
app.get("/api/accounts/:id", async (req: Request, res: Response) => {
  const id = sanitizeInput(req.params.id);
  db.get("SELECT * FROM accounts WHERE id = ?", [id], (err, row) => {
    if (err) {
      return res.status(500).json({
        error: {
          message: "Failed to fetch account",
          timestamp: new Date().toISOString(),
        },
      });
    }
    if (!row) {
      return res.status(404).json({
        error: {
          message: "Account not found",
          timestamp: new Date().toISOString(),
        },
      });
    }
    res.json(row);
  });
});

/**
 * Create a transaction for an account
 * @route POST /api/accounts/:id/transactions
 */
app.post(
  "/api/accounts/:id/transactions",
  async (req: Request, res: Response) => {
    const parsed = TransactionSchema.safeParse(sanitizeInput(req.body));
    if (!parsed.success) {
      return res.status(400).json({
        error: {
          message: "Invalid transaction data",
          timestamp: new Date().toISOString(),
        },
      });
    }

    const { transactionType, amount, description, recipientAccountId } =
      parsed.data;
    const accountId = sanitizeInput(req.params.id);

    // Verify account exists
    const userAccount = await new Promise<any>((resolve, reject) => {
      db.get("SELECT * FROM accounts WHERE id = ?", [accountId], (err, row) => {
        if (err) reject(new Error("Failed to fetch account"));
        resolve(row);
      });
    });

    if (!userAccount) {
      return res.status(404).json({
        error: {
          message: "Account not found",
          timestamp: new Date().toISOString(),
        },
      });
    }

    if (transactionType === "TRANSFER" && !recipientAccountId) {
      return res.status(400).json({
        error: {
          message: "Recipient account ID is required for transfer",
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Handle transfer
    if (transactionType === "TRANSFER" && recipientAccountId) {
      const recipientAccount = await new Promise<any>((resolve, reject) => {
        db.get(
          "SELECT * FROM accounts WHERE id = ?",
          [recipientAccountId],
          (err, row) => {
            if (err) reject(new Error("Failed to fetch recipient account"));
            resolve(row);
          }
        );
      });

      if (!recipientAccount) {
        return res.status(404).json({
          error: {
            message: "Recipient account not found",
            timestamp: new Date().toISOString(),
          },
        });
      }

      if (userAccount.balance < amount) {
        return res.status(400).json({
          error: {
            message: "Insufficient balance",
            timestamp: new Date().toISOString(),
          },
        });
      }

      // Perform transfer in a transaction
      db.serialize(() => {
        db.run("BEGIN TRANSACTION");
        db.run(
          "UPDATE accounts SET balance = ? WHERE id = ?",
          [userAccount.balance - amount, accountId],
          (err) => {
            if (err) {
              db.run("ROLLBACK");
              return res.status(500).json({
                error: {
                  message: "Failed to update sender balance",
                  timestamp: new Date().toISOString(),
                },
              });
            }
            db.run(
              "UPDATE accounts SET balance = ? WHERE id = ?",
              [recipientAccount.balance + amount, recipientAccountId],
              (err) => {
                if (err) {
                  db.run("ROLLBACK");
                  return res.status(500).json({
                    error: {
                      message: "Failed to update recipient balance",
                      timestamp: new Date().toISOString(),
                    },
                  });
                }
                createTransaction(
                  accountId,
                  transactionType,
                  amount,
                  description
                )
                  .then(() => {
                    db.run("COMMIT");
                    res.json({ message: "Transaction successful" });
                  })
                  .catch(() => {
                    db.run("ROLLBACK");
                    res.status(500).json({
                      error: {
                        message: "Failed to create transaction",
                        timestamp: new Date().toISOString(),
                      },
                    });
                  });
              }
            );
          }
        );
      });
    } else if (transactionType === "DEPOSIT") {
      db.run(
        "UPDATE accounts SET balance = ? WHERE id = ?",
        [userAccount.balance + amount, accountId],
        (err) => {
          if (err) {
            return res.status(500).json({
              error: {
                message: "Failed to update balance",
                timestamp: new Date().toISOString(),
              },
            });
          }
          createTransaction(accountId, transactionType, amount, description)
            .then(() => res.json({ message: "Transaction successful" }))
            .catch(() => {
              res.status(500).json({
                error: {
                  message: "Failed to create transaction",
                  timestamp: new Date().toISOString(),
                },
              });
            });
        }
      );
    } else if (transactionType === "WITHDRAWAL") {
      if (userAccount.balance < amount) {
        return res.status(400).json({
          error: {
            message: "Insufficient balance",
            timestamp: new Date().toISOString(),
          },
        });
      }
      db.run(
        "UPDATE accounts SET balance = ? WHERE id = ?",
        [userAccount.balance - amount, accountId],
        (err) => {
          if (err) {
            return res.status(500).json({
              error: {
                message: "Failed to update balance",
                timestamp: new Date().toISOString(),
              },
            });
          }
          createTransaction(accountId, transactionType, amount, description)
            .then(() => res.json({ message: "Transaction successful" }))
            .catch(() => {
              res.status(500).json({
                error: {
                  message: "Failed to create transaction",
                  timestamp: new Date().toISOString(),
                },
              });
            });
        }
      );
    }
  }
);

/**
 * Get transactions for an account
 * @route GET /api/accounts/:id/transactions
 */
app.get(
  "/api/accounts/:id/transactions",
  async (req: Request, res: Response) => {
    const parsed = TransactionQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      console.log(parsed.error);
      return res.status(400).json({
        error: {
          message: "Invalid query parameters",
          timestamp: new Date().toISOString(),
        },
      });
    }

    const { page, limit, type, sortBy, sortOrder } = parsed.data;
    const offset = (page - 1) * limit;
    const accountId = sanitizeInput(req.params.id);

    // Build SQL query dynamically
    let query = "SELECT * FROM transactions WHERE accountId = ?";
    const params: (string | number)[] = [accountId];

    if (type) {
      query += " AND transactionType = ?";
      params.push(type);
    }

    if (sortBy) {
      query += ` ORDER BY ${sortBy} ${sortOrder || "DESC"}`;
    } else {
      query += " ORDER BY createdAt DESC";
    }

    query += " LIMIT ? OFFSET ?";
    params.push(limit, offset);

    // Get total count for pagination
    const countQuery = `SELECT COUNT(*) as total FROM transactions WHERE accountId = ?${
      type ? " AND transactionType = ?" : ""
    }`;
    const countParams = type ? [accountId, type] : [accountId];

    try {
      const [rows, countResult] = await Promise.all([
        new Promise<any[]>((resolve, reject) => {
          db.all(query, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
          });
        }),
        new Promise<any>((resolve, reject) => {
          db.get(countQuery, countParams, (err, row) => {
            if (err) reject(err);
            else resolve(row);
          });
        }),
      ]);

      res.json({
        transactions: rows,
        pagination: {
          page,
          limit,
          total: countResult.total,
          totalPages: Math.ceil(countResult.total / limit),
        },
      });
    } catch (err) {
      console.error({ err });
      return res.status(500).json({
        error: {
          message: "Failed to fetch transactions",
          timestamp: new Date().toISOString(),
        },
      });
    }
  }
);

// Server startup with graceful shutdown
const server = app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

// Handle graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received. Closing server...");
  server.close(() => {
    db.close((err) => {
      if (err) console.error("Error closing database:", err);
      console.log("Database connection closed.");
      process.exit(0);
    });
  });
});
