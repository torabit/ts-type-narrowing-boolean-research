// Pattern 6: discriminated union (判別可能ユニオン)
// タグプロパティで状態を区別し、switch 文で narrowing する
// Escape Hatch に頼らず、コンパイラの自動検証だけで型安全性を確保

import type { User, Order, Payment, Permissions, DashboardResponse } from "../types";

type DashboardSection =
  | { tag: "users"; users: User[]; permissions: Permissions }
  | { tag: "orders"; orders: Order[]; permissions: Permissions }
  | { tag: "payments"; payments: Payment[]; permissions: Permissions }
  | { tag: "empty"; reason: string };

function toDashboardSections(response: DashboardResponse): DashboardSection[] {
  const sections: DashboardSection[] = [];
  if (
    response.permissions != null &&
    response.permissions.canViewUsers &&
    response.users != null &&
    response.users.length > 0
  ) {
    sections.push({
      tag: "users",
      users: response.users,
      permissions: response.permissions,
    });
  }
  if (
    response.permissions != null &&
    response.permissions.canViewOrders &&
    response.orders != null &&
    response.orders.length > 0
  ) {
    sections.push({
      tag: "orders",
      orders: response.orders,
      permissions: response.permissions,
    });
  }
  if (
    response.permissions != null &&
    response.permissions.canViewPayments &&
    response.payments != null &&
    response.payments.length > 0
  ) {
    sections.push({
      tag: "payments",
      payments: response.payments,
      permissions: response.permissions,
    });
  }
  if (sections.length === 0) {
    sections.push({ tag: "empty", reason: "表示できるデータがありません" });
  }
  return sections;
}

function SectionView({ section }: { section: DashboardSection }) {
  switch (section.tag) {
    case "users":
      // section.users は User[] に narrowing される（コンパイラが自動検証）
      return (
        <ul>
          {section.users.map((user) => (
            <li key={user.id}>
              {user.name} ({user.email})
            </li>
          ))}
        </ul>
      );
    case "orders":
      // section.orders は Order[] に narrowing される
      return (
        <ul>
          {section.orders.map((order) => (
            <li key={order.id}>
              {order.product}: ¥{order.amount}
            </li>
          ))}
        </ul>
      );
    case "payments":
      // section.payments は Payment[] に narrowing される
      return (
        <ul>
          {section.payments.map((payment) => (
            <li key={payment.id}>
              {payment.method} - {payment.status}
            </li>
          ))}
        </ul>
      );
    case "empty":
      return <p>{section.reason}</p>;
  }
}

export function Pattern6_DiscriminatedUnion({ response }: { response: DashboardResponse }) {
  const sections = toDashboardSections(response);
  return (
    <div>
      <p>タグ付きユニオンに変換し switch で narrowing（Escape Hatch 不要）</p>
      {sections.map((section, i) => (
        <SectionView key={i} section={section} />
      ))}
    </div>
  );
}
