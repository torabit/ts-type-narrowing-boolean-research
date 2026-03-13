export type User = {
  id: number;
  name: string;
  email: string;
};

export type Order = {
  id: number;
  product: string;
  amount: number;
};

export type Payment = {
  id: number;
  method: string;
  status: "pending" | "completed" | "failed";
};

export type Permissions = {
  canViewUsers: boolean;
  canViewOrders: boolean;
  canViewPayments: boolean;
};

export type DashboardResponse = {
  users: User[] | undefined;
  orders: Order[] | undefined;
  payments: Payment[] | undefined;
  permissions: Permissions | undefined;
};

export const sampleResponse: DashboardResponse = {
  users: [
    { id: 1, name: "Alice", email: "alice@example.com" },
    { id: 2, name: "Bob", email: "bob@example.com" },
    { id: 3, name: "Charlie", email: "charlie@example.com" },
  ],
  orders: [
    { id: 1, product: "Widget", amount: 1200 },
    { id: 2, product: "Gadget", amount: 3400 },
  ],
  payments: [
    { id: 1, method: "credit_card", status: "completed" },
    { id: 2, method: "bank_transfer", status: "pending" },
  ],
  permissions: {
    canViewUsers: true,
    canViewOrders: true,
    canViewPayments: false,
  },
};
