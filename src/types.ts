export type User = {
  id: number;
  name: string;
  email: string;
};

export type UsersResponse = {
  users: User[] | undefined;
};

export const sampleResponse: UsersResponse = {
  users: [
    { id: 1, name: "Alice", email: "alice@example.com" },
    { id: 2, name: "Bob", email: "bob@example.com" },
    { id: 3, name: "Charlie", email: "charlie@example.com" },
  ],
};
