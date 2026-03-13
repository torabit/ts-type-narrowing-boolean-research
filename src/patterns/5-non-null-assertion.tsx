// Pattern 4: non-null assertion (!)
// 型安全ではないが、実用上は canShowUsers が true なら users は non-null

import type { User, Order, Payment, DashboardResponse } from "../types";

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

export function Pattern4_NonNullAssertion({ response }: { response: DashboardResponse }) {
  const canShowUsers =
    response.permissions != null &&
    response.permissions.canViewUsers &&
    response.users != null &&
    response.users.length > 0;
  const canShowOrders =
    response.permissions != null &&
    response.permissions.canViewOrders &&
    response.orders != null &&
    response.orders.length > 0;
  const canShowPayments =
    response.permissions != null &&
    response.permissions.canViewPayments &&
    response.payments != null &&
    response.payments.length > 0;

  return (
    <div>
      <p>! で型を上書き (型安全性は失われる)</p>
      {canShowUsers && <UserList users={response.users!} />}
      {canShowOrders && <OrderList orders={response.orders!} />}
      {canShowPayments && <PaymentList payments={response.payments!} />}
    </div>
  );
}
