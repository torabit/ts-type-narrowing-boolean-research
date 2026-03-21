// Pattern 8: GraphQL codegen の immutableTypes で readonly が付いた型
// readonly property なら aliased condition でも narrowing が効くか検証

import type { GetDashboardQuery } from "../gql/generated";

type DashboardData = GetDashboardQuery["dashboard"];

function UserList({
  users,
}: {
  users: ReadonlyArray<{ readonly id: number; readonly name: string; readonly email: string }>;
}) {
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

// readonly property なので、boolean 変数経由でも narrowing が効くはず
export function Pattern8_GraphQLReadonly({
  response,
}: {
  response: DashboardData;
}) {
  const canShowUsers =
    response.permissions != null &&
    response.permissions.canViewUsers &&
    response.users != null &&
    response.users.length > 0;

  return (
    <div>
      <p>GraphQL codegen (immutableTypes: true) で readonly → narrowing が効く</p>
      {canShowUsers && <UserList users={response.users} />}
    </div>
  );
}
