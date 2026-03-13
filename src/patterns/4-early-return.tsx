// Pattern 3: early return
// コンポーネントを分割して early return で narrowing

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

function UserSection({ users }: { users: User[] | undefined }) {
  // early return で narrowing
  if (users == null || users.length === 0) {
    return null;
  }
  // ここでは users: User[] に narrowing されている
  return <UserList users={users} />;
}

export function Pattern3_EarlyReturn({ response }: { response: UsersResponse }) {
  return (
    <div>
      <p>子コンポーネントで early return</p>
      <UserSection users={response.users} />
    </div>
  );
}
