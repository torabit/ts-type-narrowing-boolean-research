# なぜ const な boolean 変数で TypeScript の narrowing が壊れるのか

## はじめに

こんにちは。Wantedly の採用管理サービス「Wantedly Hire」の開発をしているフロントエンドエンジニアの Toranosuke Ujike([@tora_tora_bit](https://x.com/tora_tora_bit)) です。

私たちのチームでは、AI コーディングアシスタントが生成するコードの品質を一貫させるために、ルールファイルの整備を進めています。そのなかに、以下のようなルールがあります。

> **ロジックをJSX外に出すこと (SHOULD)**
> JSX中で条件判定や計算を直接行わず、事前に意味のある名前の変数を用意してから使用すること。
> 目的: JSX（マークアップ）を読む際の認知負荷を下げる。

可読性の観点で理にかなったルールですが、このルールに従った結果、TypeScript の型安全性が壊れるケースに遭遇しました。

本記事では、この問題の原因を追い、最終的にシンプルな解決策にたどり着くまでの過程を共有します。

## 問題: boolean変数に代入すると narrowing が消える

ダッシュボード画面を例にします。API から返ってくるレスポンスには、ユーザー一覧・注文一覧・決済一覧が含まれますが、データが存在しない場合は `undefined` です。

```ts
type DashboardResponse = {
  users: User[] | undefined;
  orders: Order[] | undefined;
  payments: Payment[] | undefined;
  permissions: Permissions | undefined;
};
```

コーディングルールに従い、表示条件を変数に切り出します。

```tsx
function Dashboard({ response }: { response: DashboardResponse }) {
  const canShowUsers =
    response.permissions != null &&
    response.permissions.canViewUsers &&
    response.users != null &&
    response.users.length > 0;

  return (
    <div>
      {/* response.users は User[] | undefined のまま。型エラー! */}
      {canShowUsers && <UserTable users={response.users} />}
    </div>
  );
}
```

`canShowUsers` が `true` であれば `response.users` は `User[]` のはずです。しかし TypeScript はそう判断してくれません。条件式を boolean 変数に代入した時点で、型の絞り込み（narrowing）情報が失われてしまいます。

## 最初に試した解決策

この問題に対して、いくつかの解決パターンを調べました。

### ユーザー定義型ガード（Type Predicate）

TypeScript の `is` 構文を使い、関数の戻り値で型を絞り込む方法です。

```tsx
function canShowUsers(
  response: DashboardResponse,
): response is DashboardResponse & { users: User[]; permissions: Permissions } {
  return (
    response.permissions != null &&
    response.permissions.canViewUsers &&
    response.users != null &&
    response.users.length > 0
  );
}

function Dashboard({ response }: { response: DashboardResponse }) {
  return (
    <div>{canShowUsers(response) && <UserTable users={response.users} />}</div>
  );
}
```

既存のコンポーネント構造を変えずに使えるのが利点です。条件に名前がつき、JSX も宣言的なまま保てます。

ただし、Type Predicate には重要な注意点があります。**関数の実装内容を TypeScript が検証しない**という点です。

```tsx
// コンパイルは通るが、実行時に壊れる
function canShowUsers(
  response: DashboardResponse,
): response is DashboardResponse & { users: User[]; permissions: Permissions } {
  return true; // 常にtrueを返しても型エラーにならない
}
```

TypeScript は「`true` が返されたとき `response` はこの型である」と信じるだけで、関数内部のロジックが本当にその型を保証しているかは検査しません。`as` による型アサーションや `!` による非 null アサーションと同様に、型の正しさを開発者が保証する必要がある仕組みです。

### Early Return

子コンポーネントを分割し、early return で narrowing を効かせる方法です。

```tsx
function UserSection({
  users,
  permissions,
}: {
  users: User[] | undefined;
  permissions: Permissions | undefined;
}) {
  if (permissions == null || !permissions.canViewUsers) return null;
  if (users == null || users.length === 0) return null;
  // ここでは users: User[] に narrowing されている
  return <UserTable users={users} />;
}
```

`if` 文でガードした後のコードブロックでは、TypeScript が自然に narrowing を効かせてくれます。コンパイラ自身が型の絞り込みを検証するため、型の正しさを開発者が保証する必要がありません。

当初はこの 2 つのパターンが最善だと考えていました。しかし、そもそも **なぜ boolean 変数に代入すると narrowing が消えるのか** を調べていくうちに、もっとシンプルな解決策があることに気づきました。

## なぜ narrowing が消えるのか

### TypeScript 4.4 の Aliased Conditions

TypeScript 4.4 で「[Control Flow Analysis of Aliased Conditions and Discriminants](https://github.com/microsoft/TypeScript/pull/44730)」が導入され、条件式を `const` 変数に代入しても narrowing が効くケースが追加されました。

```ts
function example(x: string | number) {
  const isString = typeof x === "string";
  if (isString) {
    x.length; // string に narrowing される
  }
}
```

`isString` は `const` で宣言された boolean 変数ですが、`x` が `string` であることを TypeScript は正しく推論してくれます。

ではなぜ、今回の `response.users` のケースでは効かないのでしょうか。

### コンパイラが narrowing するための条件

Aliased Conditions が機能するには、**条件の評価時点から使用時点までの間に、関連するすべての値が変わらないこと**をコンパイラが保証できる必要があります。具体的には、次の 2 つが同時に求められます。

1. **エイリアス変数自体が不変であること** ── `const` で宣言され、再代入されない
2. **チェック対象の値が不変であること** ── 条件式が参照する変数やプロパティが、チェック後に変更されない

先ほどの `typeof x === "string"` の例では、`isString` は `const`（条件 1）、`x` はローカルパラメータで再代入されていない（条件 2）。両方を満たすため、narrowing が成立します。

### JavaScript の object は mutable である

今回の問題の核心はここにあります。

```ts
const hasUsers = response.users != null;
```

`hasUsers` は `const` なので条件 1 は満たしています。しかし、`response.users` はオブジェクトの**プロパティ**です。

JavaScript のオブジェクトは mutable です。`response` は関数の引数として外部から渡されたオブジェクトであり、呼び出し元と同じオブジェクトへの参照を共有しています。このように**同じオブジェクトを複数の参照が指している状態**を、一般に **Object Aliasing** と呼びます。

Object Aliasing が存在する場合、コンパイラの視点からは、`hasUsers` の評価後に別の参照を通じて `response.users` が書き換えられる可能性を排除できません。

```ts
const hasUsers = response.users != null; // (1) true が入る

// response は外部と参照を共有している（Object Aliasing）
// この関数の内部で response.users が書き換えられるかもしれない
trackDashboardView(response); // (2)

if (hasUsers) {
  // (3) hasUsers は true だが、response.users は undefined かもしれない
  response.users; // narrowing されない
}
```

条件 2 を満たせないため、narrowing が効かないのです。

### boolean 変数経由の narrowing が制限される理由

「実際に `response.users` への再代入がコード上に存在しないなら、narrowing してくれてもいいのでは」と思うかもしれません。

直接 `if` 文で条件チェックする場合は、TypeScript はその `if` ブロック内で narrowing を効かせてくれます。

```ts
if (response.users != null) {
  response.users; // User[] に narrowing される
}
```

しかし、boolean 変数を経由する場合は話が変わります。コンパイラは boolean 変数の元の条件式を**逆引き**し、すべての制御フローパスでその条件式を再評価する必要があります。ネストされた `if` 文やループ、`switch` 文が絡むと制御フローパスの数は指数関数的に増加するため、この逆引き追跡のコストは現実的ではありません。

TypeScript は完全な健全性よりも、正確さと生産性のバランスを重視する設計です。[Design Goals](https://github.com/microsoft/TypeScript/wiki/TypeScript-Design-Goals#non-goals) でも、Non-goals として「証明可能な正しさを持つ型システムを適用すること」が明記されています。

## コンパイラに不変性を伝える

ここまでの調査で、narrowing が消える原因は**オブジェクトのプロパティが mutable であること**だとわかりました。つまり、コンパイラにプロパティの不変性を伝えられれば、この問題は解決するはずです。

### readonly を付ける

もっとも直接的なアプローチは、型定義に `readonly` を付けることです。

```ts
type DashboardResponse = {
  readonly users: User[] | undefined;
  readonly orders: Order[] | undefined;
  readonly payments: Payment[] | undefined;
  readonly permissions: Permissions | undefined;
};
```

```ts
const hasUsers = response.users != null;
if (hasUsers) {
  response.users; // User[] に narrowing される
}
```

`readonly` によりプロパティの不変性が型レベルで保証されるため、Aliased Conditions の条件 2 を満たし、narrowing が成立します。

ただし、API レスポンスの型定義はチームやプロジェクト全体で共有されていることが多く、既存の型に `readonly` を後から付けるのは影響範囲が大きくなりがちです。

なお、GraphQL を使っているプロジェクトであれば、graphql-codegen の `immutableTypes: true` オプションで、生成される型のすべてのプロパティに自動で `readonly` を付けることができます。

```ts
// codegen.ts
const config: CodegenConfig = {
  generates: {
    "src/gql/generated.ts": {
      plugins: ["typescript", "typescript-operations"],
      config: {
        immutableTypes: true,
      },
    },
  },
};
```

生成される型は以下のようになります。

```ts
export type DashboardResponse = {
  readonly __typename?: "DashboardResponse";
  readonly users?: Maybe<ReadonlyArray<User>>;
  readonly orders?: Maybe<ReadonlyArray<Order>>;
  readonly permissions?: Maybe<Permissions>;
};
```

すべてのプロパティが `readonly` になるため、boolean 変数に代入しても narrowing が効きます。graphql-codegen で型を自動生成しているプロジェクトであれば、設定を 1 行追加するだけで対応できます。

### ローカル変数に取り出す

もう一つのアプローチは、**プロパティをローカルの `const` 変数に取り出す**ことです。

```tsx
function Dashboard({ response }: { response: DashboardResponse }) {
  // プロパティをローカル変数に取り出す
  const { users, orders, payments, permissions } = response;

  const canShowUsers =
    permissions != null &&
    permissions.canViewUsers &&
    users != null &&
    users.length > 0;

  return (
    <div>
      {/* users は const ローカル変数なので narrowing が効く */}
      {canShowUsers && <UserTable users={users} />}
    </div>
  );
}
```

`const { users } = response` で取り出した `users` は、`response` オブジェクトから独立した `const` ローカル変数です。この時点で `response.users` の**値のスナップショット**がローカル変数にコピーされます。その後に `response.users` が変更されたとしても、ローカル変数の `users` には影響しません。

コンパイラの視点で見ると:

- `canShowUsers` は `const`（条件 1 を満たす）
- `users` は `const` ローカル変数で再代入不可能（条件 2 を満たす）

両方の条件を満たすため、Aliased Conditions による narrowing が成立します。

元のコードとの差分は、**分割代入を 1 行追加しただけ**です。型定義の変更も不要で、ユーザー定義型ガードのように開発者が型の正しさを保証する必要もなく、early return のようにコンポーネントを分割する必要もありません。コンパイラが自動で型を検証してくれる、最もシンプルな解決策です。

### 比較表

| パターン              | 型安全 | ルール準拠 | コンポーネント変更 | コンパイラが型を自動検証 |
| --------------------- | ------ | ---------- | ------------------ | ------------------------ |
| **分割代入（const）** | ◯      | ◯          | 不要               | ◯                        |
| **readonly**          | ◯      | ◯          | 不要               | ◯                        |
| ユーザー定義型ガード  | △      | ◯          | 不要               | ✕                        |
| Early Return          | ◯      | ◯          | 必要               | ◯                        |

## まとめ

boolean 変数に代入すると narrowing が消える問題に遭遇し、最初はユーザー定義型ガードや early return が正解だと思っていました。

しかし「なぜ narrowing が消えるのか」を掘り下げた結果、原因は**JavaScript のオブジェクトが mutable であり、コンパイラがプロパティの不変性を保証できない**ことにありました。

TypeScript の Aliased Conditions は、チェック対象が不変であることを前提に動作します。オブジェクトのプロパティは mutable なので、この前提を満たせません。不変性をコンパイラに伝える方法は 2 つあります。

- **`readonly`** を型定義に付ける
- **分割代入**でローカルの `const` 変数に取り出す。型定義の変更が不要で、既存コードへの影響が最も小さい

どちらもコンパイラが自動で型を検証してくれるため、ユーザー定義型ガードのように開発者が型の正しさを保証する必要がありません。

コーディングルールを整備する際は、TypeScript の型システムとの相互作用を意識しておくと、こうした落とし穴を避けやすくなるのではないでしょうか。
