// 問題の再現:
// 複雑な条件（permissions + null チェック + length チェック）を boolean に代入すると narrowing が消える

import { ReactElement } from "react";
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

export function Problem({
  response,
}: {
  response: DashboardResponse;
}): ReactElement {
  // boolean に代入した時点で narrowing が消える
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
      <p>
        canShowUsers / canShowOrders / canShowPayments の型: boolean (narrowing
        効かない)
      </p>
      {/* response.users は User[] | undefined のまま */}
      {canShowUsers && <UserList users={response.users} />}
      {canShowOrders && <OrderList orders={response.orders} />}
      {canShowPayments && <PaymentList payments={response.payments} />}
    </div>
  );
}
