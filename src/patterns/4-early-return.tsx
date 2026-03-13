// Pattern 3: early return
// コンポーネントを分割して early return で narrowing

import type { User, Order, Payment, Permissions, DashboardResponse } from "../types";

function UserList({ users }: { users: User[] }) {
  return (
    <ul>
      {users.map((user) => (
        <li key={user.id}>
          {user.name} ({user.email})
        </li>
      ))}
    </ul>
  );
}

function OrderList({ orders }: { orders: Order[] }) {
  return (
    <ul>
      {orders.map((order) => (
        <li key={order.id}>
          {order.product}: ¥{order.amount}
        </li>
      ))}
    </ul>
  );
}

function PaymentList({ payments }: { payments: Payment[] }) {
  return (
    <ul>
      {payments.map((payment) => (
        <li key={payment.id}>
          {payment.method} - {payment.status}
        </li>
      ))}
    </ul>
  );
}

function UserSection({ users, permissions }: { users: User[] | undefined; permissions: Permissions | undefined }) {
  if (permissions == null || !permissions.canViewUsers) {
    return null;
  }
  if (users == null || users.length === 0) {
    return null;
  }
  // ここでは users: User[] に narrowing されている
  return <UserList users={users} />;
}

function OrderSection({ orders, permissions }: { orders: Order[] | undefined; permissions: Permissions | undefined }) {
  if (permissions == null || !permissions.canViewOrders) {
    return null;
  }
  if (orders == null || orders.length === 0) {
    return null;
  }
  return <OrderList orders={orders} />;
}

function PaymentSection({ payments, permissions }: { payments: Payment[] | undefined; permissions: Permissions | undefined }) {
  if (permissions == null || !permissions.canViewPayments) {
    return null;
  }
  if (payments == null || payments.length === 0) {
    return null;
  }
  return <PaymentList payments={payments} />;
}

export function Pattern3_EarlyReturn({ response }: { response: DashboardResponse }) {
  return (
    <div>
      <p>子コンポーネントで early return</p>
      <UserSection users={response.users} permissions={response.permissions} />
      <OrderSection orders={response.orders} permissions={response.permissions} />
      <PaymentSection payments={response.payments} permissions={response.permissions} />
    </div>
  );
}
