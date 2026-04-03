# const な boolean 変数で narrowing が壊れる理由 ー Aliased Conditions と Object Aliasing の制約

こんにちは。ウォンテッドリーの採用管理サービス「Wantedly Hire」の開発をしているフロントエンドエンジニアの Toranosuke Ujike (@torabit) です。

本記事では、コーディングルールに従って書いたコードが TypeScript の型安全性を壊すケースと、その原因、そしてシンプルな解決策を共有します。

## 背景: Wantedly Hire におけるコーディングルールの整備

Wantedly Hire のフロントエンド開発では、AI コーディングアシスタントの生成するコードの品質を一貫させるために、ルールファイルの整備を進めてきました。ルールファイルとは、プロジェクト固有のコーディング規約を AI に伝えるための設定ファイルです。「命名規則」「ディレクトリ構成」「コンポーネントの書き方」などを記述しておくことで、AI が生成するコードがチームのスタイルに沿ったものになります。

そのルールファイルの中に、以下のようなルールがあります。

> ロジックを JSX 外に出すこと (SHOULD)
> JSX 中で条件判定や計算を直接行わず、事前に意味のある名前の変数を用意してから使用すること。
> 目的: JSX（マークアップ）を読む際の認知負荷を下げる。

```
// Good: ルールに沿った書き方
const hasData = dataCount > 0;
return <div>{hasData && <DataTable />}</div>;

// Bad: ルール違反
return <div>{dataCount > 0 && <DataTable />}</div>;
```

JSX の中に複雑な条件式がネストすると、マークアップの構造を追うのが難しくなります。条件に名前をつけて外に出すことで「何を表示するか」と「いつ表示するか」が分離され、可読性の観点で理にかなったルールです。

しかし、このルールに従った結果 TypeScript の型安全性が壊れるケースに遭遇しました。さらに AI コーディングアシスタントがこの型エラーを解消するために `response.users!`（non-null assertion）を使い始めました。`!` は型安全性を放棄する記法です。ルールを守った結果かえってコードの品質が悪化する、本末転倒な状況でした。

## 問題: boolean 変数に代入すると narrowing が消える

ダッシュボード画面を例にします。API から返るレスポンスにはユーザー一覧・注文一覧・決済一覧が含まれますが、データが存在しない場合は `undefined` です。

```
type DashboardResponse = {
  users: User[] | undefined;
  orders: Order[] | undefined;
  payments: Payment[] | undefined;
  permissions: Permissions | undefined;
};
```

コーディングルールに従い、表示条件を変数に切り出します。

```
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

`canShowUsers` が `true` であれば `response.users` は `User[]` のはずです。しかし TypeScript はそう判断しません。条件式を boolean 変数に代入した時点で、型の絞り込み（narrowing）情報が失われます。

## 最初に試した解決策

### ユーザー定義型ガード（Type Predicate）

TypeScript の `is` 構文を使い、関数の戻り値で型を絞り込む方法です。既存のコンポーネント構造を変えずに使えるのが利点で、条件に名前がつき JSX も宣言的なまま保てます。

```
type DashboardResponseWithRequiredData = DashboardResponse & {
  users: NonNullable<DashboardResponse["users"]>;
  permissions: NonNullable<DashboardResponse["permissions"]>;
};

function canShowUsers(
  response: DashboardResponse,
): response is DashboardResponseWithRequiredData {
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

ただし Type Predicate には重要な注意点があります。関数の実装内容を TypeScript が検証しません。

```
// コンパイルは通るが、実行時に壊れる
function canShowUsers(
  response: DashboardResponse,
): response is DashboardResponseWithRequiredData {
  return true; // 常にtrueを返しても型エラーにならない
}
```

TypeScript は「`true` が返されたとき `response` はこの型である」と信じるだけです。関数内部のロジックがその型を保証しているかは検査しません。`as` や `!` と同様に、型の正しさを開発者が保証する必要があります。

### Early Return

子コンポーネントを分割し、early return で narrowing を効かせる方法です。`if` 文でガードした後のコードブロックでは、コンパイラ自身が型の絞り込みを検証します。

```
function UserSection({
  users,
  permissions,
}: Pick<DashboardResponse, "users" | "permissions">) {
  if (permissions == null || !permissions.canViewUsers) return null;
  if (users == null || users.length === 0) return null;
  // ここでは users: User[] に narrowing されている
  return <UserTable users={users} />;
}
```

当初はこの 2 つのパターンが最善だと考えていました。しかし「なぜ boolean 変数に代入すると narrowing が消えるのか」を調べていくうちに、もっとシンプルな解決策があることに気づきました。

## なぜ narrowing が消えるのか

### TypeScript 4.4 の Aliased Conditions

TypeScript 4.4 で「[Control Flow Analysis of Aliased Conditions and Discriminants](https://github.com/microsoft/TypeScript/pull/44730)」が導入されました。条件式を `const` 変数に代入しても narrowing が効くケースが追加された機能です。

```
function example(x: string | number) {
  const isString = typeof x === "string";
  if (isString) {
    x.length; // string に narrowing される
  }
}
```

`isString` は `const` で宣言された boolean 変数ですが、`x` が `string` であることを TypeScript は正しく推論します。ではなぜ `response.users` のケースでは効かないのでしょうか。

### コンパイラが narrowing するための条件

Aliased Conditions が機能するには、条件の評価時点から使用時点までの間に関連するすべての値が変わらないことをコンパイラが保証できる必要があります。具体的には次の 2 つが同時に求められます。

1. エイリアス変数自体が不変であること ── `const` で宣言され、再代入されない
2. チェック対象の値が不変であること ── 条件式が参照する変数やプロパティが、チェック後に変更されない

先ほどの例では `isString` は `const`（条件 1）、`x` はローカルパラメータで再代入されていない（条件 2）ため、narrowing が成立します。

### JavaScript の object は mutable である

今回の問題の核心はここにあります。

```
const hasUsers = response.users != null;
```

`hasUsers` は `const` なので条件 1 は満たしています。しかし `response.users` はオブジェクトのプロパティです。JavaScript のオブジェクトは mutable であり、`response` は関数の引数として外部から渡されたオブジェクトです。呼び出し元と同じオブジェクトへの参照を共有しています。

同じオブジェクトを複数の参照が指しているこの状態を Object Aliasing と呼びます。Object Aliasing が存在する場合、コンパイラの視点からは `hasUsers` の評価後に別の参照を通じて `response.users` が書き換えられる可能性を排除できません。

```
const hasUsers = response.users != null; // (1) true が入る

// response は外部と参照を共有している（Object Aliasing）
// この関数の内部で response.users が書き換えられるかもしれない
trackDashboardView(response); // (2)

if (hasUsers) {
  // (3) hasUsers は true だが、response.users は undefined かもしれない
  response.users; // narrowing されない
}
```

条件 2 を満たせないため、narrowing が効きません。

### boolean 変数経由の narrowing が制限される理由

「コード上に再代入が存在しないなら narrowing してくれてもいいのでは」と思うかもしれません。直接 `if` 文で条件チェックする場合、TypeScript はその `if` ブロック内で narrowing を効かせます。

```
if (response.users != null) {
  response.users; // User[] に narrowing される
}
```

boolean 変数を経由する場合は話が変わります。コンパイラは boolean 変数の元の条件式を逆引きし、すべての制御フローパスで再評価する必要があります。ネストされた `if` 文やループ、`switch` 文が絡むと制御フローパスは指数関数的に増加し、この逆引き追跡のコストは現実的ではありません。

TypeScript は完全な健全性よりも正確さと生産性のバランスを重視する設計です。[TypeScript Design Goals](https://github.com/microsoft/TypeScript/wiki/TypeScript-Design-Goals#non-goals) でも、Non-goals として「証明可能な正しさを持つ型システムを適用すること」が明記されています。

## コンパイラに不変性を伝える

narrowing が消える原因はオブジェクトのプロパティが mutable であることです。コンパイラにプロパティの不変性を伝えれば、この問題は解決します。

### readonly を付ける

もっとも直接的なアプローチは、型定義に `readonly` を付けることです。`readonly` によりプロパティの不変性が型レベルで保証されるため、Aliased Conditions の条件 2 を満たし narrowing が成立します。

```
type DashboardResponse = {
  readonly users: User[] | undefined;
  readonly orders: Order[] | undefined;
  readonly payments: Payment[] | undefined;
  readonly permissions: Permissions | undefined;
};
```

```
const hasUsers = response.users != null;
if (hasUsers) {
  response.users; // User[] に narrowing される
}
```

ただし API レスポンスの型定義はチームやプロジェクト全体で共有されていることが多く、既存の型に `readonly` を後から付けるのは影響範囲が大きくなりがちです。

GraphQL を使っているプロジェクトであれば、graphql-codegen の `immutableTypes: true` オプションで対応できます。生成される型のすべてのプロパティに自動で `readonly` が付きます。

```
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

```
export type DashboardResponse = {
  readonly __typename?: "DashboardResponse";
  readonly users?: Maybe<ReadonlyArray<User>>;
  readonly orders?: Maybe<ReadonlyArray<Order>>;
  readonly permissions?: Maybe<Permissions>;
};
```

graphql-codegen で型を自動生成しているプロジェクトであれば、設定を 1 行追加するだけで対応できます。

### ローカル変数に取り出す

もう一つのアプローチは、プロパティをローカルの `const` 変数に取り出すことです。

```
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

`const { users } = response` は、`response.users` が保持する参照をローカル変数 `users` に割り当てる操作です。`users` と `response.users` は同じ配列オブジェクトを指しているため、`users.push(...)` や `users[0] = ...` のような配列自体への破壊的変更は両方に反映されます。

一方で `response.users = undefined` のようなプロパティの再代入はローカル変数 `users` には影響しません。`const` で宣言されたローカル変数は参照の再代入ができないため、`users` は常に最初に割り当てられた配列オブジェクトを指し続けます。

この参照の不変性こそが、コンパイラが narrowing を維持できる理由です。`const hasUsers = users != null` という条件が成立した後、`users` の参照先が変わらないことが保証されているため、コンパイラは `if (hasUsers)` ブロック内で型を安全に絞り込めます。

コンパイラの視点では `canShowUsers` は `const`（条件 1）、`users` は `const` ローカル変数で再代入不可能（条件 2）です。両方の条件を満たすため、Aliased Conditions による narrowing が成立します。

元のコードとの差分は分割代入を 1 行追加しただけです。型定義の変更も不要で、ユーザー定義型ガードのように開発者が型の正しさを保証する必要もありません。コンパイラが自動で型を検証してくれる、最もシンプルな解決策です。

### 比較表

| パターン             | 型安全 | ルール準拠 | コンポーネント変更 | コンパイラが型を自動検証 |
| -------------------- | ------ | ---------- | ------------------ | ------------------------ |
| 分割代入（const）    | ◯      | ◯          | 不要               | ◯                        |
| readonly             | ◯      | ◯          | 不要               | ◯                        |
| ユーザー定義型ガード | △      | ◯          | 不要               | ✕                        |
| Early Return         | ◯      | ◯          | 必要               | ◯                        |

## まとめ

boolean 変数に代入すると narrowing が消える原因は、JavaScript のオブジェクトが mutable でありコンパイラがプロパティの不変性を保証できないことにあります。

TypeScript の Aliased Conditions はチェック対象が不変であることを前提に動作します。オブジェクトのプロパティは mutable なので、この前提を満たせません。不変性をコンパイラに伝える方法は 2 つあります。

- `readonly` を型定義に付ける
- 分割代入でローカルの `const` 変数に取り出す。型定義の変更が不要で、既存コードへの影響が最も小さい

どちらもコンパイラが自動で型を検証するため、ユーザー定義型ガードのように開発者が型の正しさを保証する必要がありません。コーディングルールを整備する際は TypeScript の型システムとの相互作用を意識しておくと、こうした落とし穴を避けやすくなります。
