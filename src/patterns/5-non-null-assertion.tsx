// Pattern 4: non-null assertion (!)
// 型安全ではないが、実用上は hasUsers が true なら users は non-null

import type { User, UsersResponse } from "../types";

function UserList({ users }: { users: User[] }) {
  return (
    <ul>
      {users.map((user) => (
        <li key={user.id}>{user.name} ({user.email})</li>
      ))}
    </ul>
  );
}

export function Pattern4_NonNullAssertion({ response }: { response: UsersResponse }) {
  const hasUsers = response.users != null && response.users.length > 0;

  return (
    <div>
      <p>! で型を上書き (型安全性は失われる)</p>
      {hasUsers && <UserList users={response.users!} />}
    </div>
  );
}
