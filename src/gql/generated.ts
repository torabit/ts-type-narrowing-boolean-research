export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
};

export type DashboardResponse = {
  readonly __typename?: 'DashboardResponse';
  readonly orders?: Maybe<ReadonlyArray<Order>>;
  readonly payments?: Maybe<ReadonlyArray<Payment>>;
  readonly permissions?: Maybe<Permissions>;
  readonly users?: Maybe<ReadonlyArray<User>>;
};

export type DashboardSection = EmptySection | OrderSection | PaymentSection | UserSection;

export type EmptySection = {
  readonly __typename?: 'EmptySection';
  readonly reason: Scalars['String']['output'];
};

export type Order = {
  readonly __typename?: 'Order';
  readonly amount: Scalars['Int']['output'];
  readonly id: Scalars['Int']['output'];
  readonly product: Scalars['String']['output'];
};

export type OrderSection = {
  readonly __typename?: 'OrderSection';
  readonly orders: ReadonlyArray<Order>;
  readonly permissions: Permissions;
};

export type Payment = {
  readonly __typename?: 'Payment';
  readonly id: Scalars['Int']['output'];
  readonly method: Scalars['String']['output'];
  readonly status: PaymentStatus;
};

export type PaymentSection = {
  readonly __typename?: 'PaymentSection';
  readonly payments: ReadonlyArray<Payment>;
  readonly permissions: Permissions;
};

export enum PaymentStatus {
  Completed = 'COMPLETED',
  Failed = 'FAILED',
  Pending = 'PENDING'
}

export type Permissions = {
  readonly __typename?: 'Permissions';
  readonly canViewOrders: Scalars['Boolean']['output'];
  readonly canViewPayments: Scalars['Boolean']['output'];
  readonly canViewUsers: Scalars['Boolean']['output'];
};

export type Query = {
  readonly __typename?: 'Query';
  readonly dashboard: DashboardResponse;
  readonly dashboardSections: ReadonlyArray<DashboardSection>;
};

export type User = {
  readonly __typename?: 'User';
  readonly email: Scalars['String']['output'];
  readonly id: Scalars['Int']['output'];
  readonly name: Scalars['String']['output'];
};

export type UserSection = {
  readonly __typename?: 'UserSection';
  readonly permissions: Permissions;
  readonly users: ReadonlyArray<User>;
};

export type GetDashboardSectionsQueryVariables = Exact<{ [key: string]: never; }>;


export type GetDashboardSectionsQuery = { readonly __typename?: 'Query', readonly dashboardSections: ReadonlyArray<
    | { readonly __typename: 'EmptySection', readonly reason: string }
    | { readonly __typename: 'OrderSection', readonly orders: ReadonlyArray<{ readonly __typename?: 'Order', readonly id: number, readonly product: string, readonly amount: number }>, readonly permissions: { readonly __typename?: 'Permissions', readonly canViewOrders: boolean } }
    | { readonly __typename: 'PaymentSection', readonly payments: ReadonlyArray<{ readonly __typename?: 'Payment', readonly id: number, readonly method: string, readonly status: PaymentStatus }>, readonly permissions: { readonly __typename?: 'Permissions', readonly canViewPayments: boolean } }
    | { readonly __typename: 'UserSection', readonly users: ReadonlyArray<{ readonly __typename?: 'User', readonly id: number, readonly name: string, readonly email: string }>, readonly permissions: { readonly __typename?: 'Permissions', readonly canViewUsers: boolean } }
  > };

export type GetDashboardQueryVariables = Exact<{ [key: string]: never; }>;


export type GetDashboardQuery = { readonly __typename?: 'Query', readonly dashboard: { readonly __typename?: 'DashboardResponse', readonly users?: ReadonlyArray<{ readonly __typename?: 'User', readonly id: number, readonly name: string, readonly email: string }> | null, readonly orders?: ReadonlyArray<{ readonly __typename?: 'Order', readonly id: number, readonly product: string, readonly amount: number }> | null, readonly payments?: ReadonlyArray<{ readonly __typename?: 'Payment', readonly id: number, readonly method: string, readonly status: PaymentStatus }> | null, readonly permissions?: { readonly __typename?: 'Permissions', readonly canViewUsers: boolean, readonly canViewOrders: boolean, readonly canViewPayments: boolean } | null } };
