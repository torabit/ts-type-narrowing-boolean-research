// 問題の再現:
// const hasUsers = response.users != null && response.users.length > 0 とすると boolean になり
// JSX 内で response.users を使うとき型の絞り込みが効かない

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

export function Problem({ response }: { response: UsersResponse }) {
  // boolean に代入した時点で narrowing が消える
  const hasUsers = response.users != null && response.users.length > 0;

  return (
    <div>
      <p>hasUsers の型: boolean (narrowing 効かない)</p>
      {/* response.users は User[] | undefined のまま */}
      {hasUsers && <UserList users={response.users} />}
    </div>
  );
}
