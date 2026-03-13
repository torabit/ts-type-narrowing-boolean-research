// Pattern 5: ternary で直接 narrowing
// 三項演算子の条件部分で直接チェックすれば narrowing が効く

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

export function Pattern5_Ternary({ response }: { response: UsersResponse }) {
  return (
    <div>
      <p>三項演算子で直接条件チェック</p>
      {response.users != null && response.users.length > 0 ? (
        <UserList users={response.users} />
      ) : (
        <p>No data</p>
      )}
    </div>
  );
}
