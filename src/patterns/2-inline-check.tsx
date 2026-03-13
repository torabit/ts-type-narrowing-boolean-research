// Pattern 1: inline check
// 変数に代入せず、JSX 内で直接条件チェックすれば narrowing が効く

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

export function Pattern1_InlineCheck({ response }: { response: UsersResponse }) {
  // JSX 内で直接チェックすれば narrowing が効く
  return (
    <div>
      <p>直接 && で繋げば narrowing が効く</p>
      {response.users != null && response.users.length > 0 && (
        <UserList users={response.users} />
      )}
    </div>
  );
}
