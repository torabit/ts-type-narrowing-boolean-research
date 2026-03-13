// Pattern 1: inline check
// 変数に代入せず、JSX 内で直接条件チェックすれば narrowing が効く

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

export function Pattern1_InlineCheck({ response }: { response: DashboardResponse }) {
  return (
    <div>
      <p>直接 && で繋げば narrowing が効く</p>
      {response.permissions != null &&
        response.permissions.canViewUsers &&
        response.users != null &&
        response.users.length > 0 && (
          <UserList users={response.users} />
        )}
      {response.permissions != null &&
        response.permissions.canViewOrders &&
        response.orders != null &&
        response.orders.length > 0 && (
          <OrderList orders={response.orders} />
        )}
      {response.permissions != null &&
        response.permissions.canViewPayments &&
        response.payments != null &&
        response.payments.length > 0 && (
          <PaymentList payments={response.payments} />
        )}
    </div>
  );
}
