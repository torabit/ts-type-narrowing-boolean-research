// Pattern 9: GraphQL union + __typename による discriminated union
// GraphQL の union type は __typename をクエリすれば discriminated union になるか検証

import type { GetDashboardSectionsQuery } from "../gql/generated";

type Section = GetDashboardSectionsQuery["dashboardSections"][number];

// __typename で switch して narrowing が効くか？
function SectionView({ section }: { section: Section }) {
  switch (section.__typename) {
    case "UserSection":
      // section.users は ReadonlyArray<User> に narrowing されるか？
      return (
        <ul>
          {section.users.map((user) => (
            <li key={user.id}>
              {user.name} ({user.email})
            </li>
          ))}
        </ul>
      );
    case "OrderSection":
      return (
        <ul>
          {section.orders.map((order) => (
            <li key={order.id}>
              {order.product}: {order.amount}
            </li>
          ))}
        </ul>
      );
    case "PaymentSection":
      return (
        <ul>
          {section.payments.map((payment) => (
            <li key={payment.id}>
              {payment.method} - {payment.status}
            </li>
          ))}
        </ul>
      );
    case "EmptySection":
      return <p>{section.reason}</p>;
  }
}

export function Pattern9_GraphQLDiscriminatedUnion({
  sections,
}: {
  sections: ReadonlyArray<Section>;
}) {
  return (
    <div>
      <p>GraphQL union + __typename で discriminated union</p>
      {sections.map((section, i) => (
        <SectionView key={i} section={section} />
      ))}
    </div>
  );
}
