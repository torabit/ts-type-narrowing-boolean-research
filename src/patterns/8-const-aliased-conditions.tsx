// Pattern 7: const aliased conditions (TS 4.4+)
// object のプロパティを const に代入することで、値が不変であることをコンパイラが理解する
// boolean に複雑な条件を代入しても、const なら narrowing が効く

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

export function Pattern7_ConstAliasedConditions({
  response,
}: {
  response: DashboardResponse;
}) {
  // object のプロパティを const に取り出すことで、コンパイラが不変と認識
  const { users, orders, payments, permissions } = response;

  // const に代入した条件式は narrowing が効く (TS 4.4 Aliased Conditions)
  const canShowUsers =
    permissions != null &&
    permissions.canViewUsers &&
    users != null &&
    users.length > 0;
  const canShowOrders =
    permissions != null &&
    permissions.canViewOrders &&
    orders != null &&
    orders.length > 0;
  const canShowPayments =
    permissions != null &&
    permissions.canViewPayments &&
    payments != null &&
    payments.length > 0;

  return (
    <div>
      <p>
        const に代入した条件は narrowing が効く（TS 4.4 Aliased Conditions）
      </p>
      {/* users は const なので、canShowUsers が true なら User[] に narrowing される */}
      {canShowUsers && <UserList users={users} />}
      {canShowOrders && <OrderList orders={orders} />}
      {canShowPayments && <PaymentList payments={payments} />}
    </div>
  );
}
