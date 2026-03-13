// Pattern 2: type predicate (ユーザー定義型ガード)
// 関数の戻り値を `is` で型述語にすることで narrowing を維持

import type { User, UsersResponse } from "../types";

type NonEmptyUsersResponse = { users: NonNullable<UsersResponse["users"]> };

function hasUsers(response: UsersResponse): response is NonEmptyUsersResponse {
  return response.users != null && response.users.length > 0;
}

function UserList({ users }: { users: User[] }) {
  return (
    <ul>
      {users.map((user) => (
        <li key={user.id}>{user.name} ({user.email})</li>
      ))}
    </ul>
  );
}

export function Pattern2_TypePredicate({ response }: { response: UsersResponse }) {
  // type predicate で narrowing が効く
  return (
    <div>
      <p>type predicate で response 自体を絞り込む</p>
      {hasUsers(response) && <UserList users={response.users} />}
    </div>
  );
}
