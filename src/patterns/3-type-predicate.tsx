// Pattern 2: type predicate (ユーザー定義型ガード)
// 関数の戻り値を `is` で型述語にすることで narrowing を維持

import type { User, Order, Payment, DashboardResponse, Permissions } from "../types";

type WithPermissions = { permissions: NonNullable<DashboardResponse["permissions"]> };
type WithUsers = WithPermissions & { users: NonNullable<DashboardResponse["users"]> };
type WithOrders = WithPermissions & { orders: NonNullable<DashboardResponse["orders"]> };
type WithPayments = WithPermissions & { payments: NonNullable<DashboardResponse["payments"]> };

function canShowUsers(response: DashboardResponse): response is DashboardResponse & WithUsers {
  return (
    response.permissions != null &&
    response.permissions.canViewUsers &&
    response.users != null &&
    response.users.length > 0
  );
}

function canShowOrders(response: DashboardResponse): response is DashboardResponse & WithOrders {
  return (
    response.permissions != null &&
    response.permissions.canViewOrders &&
    response.orders != null &&
    response.orders.length > 0
  );
}

function canShowPayments(response: DashboardResponse): response is DashboardResponse & WithPayments {
  return (
    response.permissions != null &&
    response.permissions.canViewPayments &&
    response.payments != null &&
    response.payments.length > 0
  );
}

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

export function Pattern2_TypePredicate({ response }: { response: DashboardResponse }) {
  return (
    <div>
      <p>type predicate で response 自体を絞り込む</p>
      {canShowUsers(response) && <UserList users={response.users} />}
      {canShowOrders(response) && <OrderList orders={response.orders} />}
      {canShowPayments(response) && <PaymentList payments={response.payments} />}
    </div>
  );
}
