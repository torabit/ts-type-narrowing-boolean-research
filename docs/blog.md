# boolean変数に代入すると型の絞り込みが消える ── TypeScriptのnarrowingとコーディングルールの両立

## はじめに

こんにちは。Wantedly の採用管理サービス「Wantedly Hire」の開発をしている Toranosuke Ujike([@tora_tora_bit](https://x.com/tora_tora_bit)) です。

昨今、AIにコーディングを任せる場面が増えてきました。Cursorの[Rules](https://cursor.com/docs/context/rules)やClaude Codeの[CLAUDE.md](https://code.claude.com/docs/en/memory)など、主要なAIコーディングツールには「ルールファイル」を設定する仕組みが用意されています。これらはLLMがコンテキスト間で記憶を保持しないという制約に対して、プロンプトレベルで永続的なコンテキストを提供するものです。コーディング規約や命名規則をルールとして定義しておくことで、AIが生成するコードの品質を一貫させ、チーム全体の標準に沿ったアウトプットを得ることができます。

私たちのチームでも、AIのアウトプットの質を上げるためにルールの整備を進めていました。そのなかで、以下のようなルールが導入されました。

> **ロジックをJSX外に出すこと (SHOULD)**
> JSX中で条件判定や計算を直接行わず、事前に意味のある名前の変数を用意してから使用すること。
> 目的: JSX（マークアップ）を読む際の認知負荷を下げる。

```tsx
// ルール違反: JSX内に複雑な条件式が入り込み、何をしているのかが一目でわからない
return (
  <div>
    {response.permissions != null &&
      response.permissions.canViewUsers &&
      response.users != null &&
      response.users.length > 0 && <UserTable users={response.users} />}
    {response.permissions != null &&
      response.permissions.canViewOrders &&
      response.orders != null &&
      response.orders.length > 0 && <OrderTable orders={response.orders} />}
  </div>
);

// ルールに沿った書き方: 条件に名前がつき、JSXはマークアップに集中できる
const canShowUsers =
  response.permissions != null &&
  response.permissions.canViewUsers &&
  response.users != null &&
  response.users.length > 0;

const canShowOrders =
  response.permissions != null &&
  response.permissions.canViewOrders &&
  response.orders != null &&
  response.orders.length > 0;

return (
  <div>
    {canShowUsers && <UserTable users={response.users} />}
    {canShowOrders && <OrderTable orders={response.orders} />}
  </div>
);
```

ルールの意図はよく理解できます。JSX内に権限チェック・`null`チェック・`length`チェックが連なっていても、それが「何をしているのか」は式を読み解かないとわかりません。`canShowUsers`や`canShowOrders`といった名前に切り出せば、条件の意図が宣言的に表現され、コードを読む人は実装の詳細を追わなくても意味を一目で把握できます。

しかし、このルールに従った結果、TypeScriptの型安全性が損なわれるケースに遭遇しました。本記事では、この問題の原因を整理し、型安全性とコーディングルールを両立させるパターンを比較検証した結果を共有します。

## 何が起きたのか

ダッシュボード画面を例に考えてみます。APIから返ってくるレスポンスには、ユーザー一覧・注文一覧・決済一覧が含まれますが、それぞれデータが存在しない場合は`undefined`になります。

```ts
type User = {
  id: number;
  name: string;
  email: string;
};

type Order = {
  id: number;
  product: string;
  amount: number;
};

type Payment = {
  id: number;
  method: string;
  status: "pending" | "completed" | "failed";
};

type Permissions = {
  canViewUsers: boolean;
  canViewOrders: boolean;
  canViewPayments: boolean;
};

type DashboardResponse = {
  users: User[] | undefined;
  orders: Order[] | undefined;
  payments: Payment[] | undefined;
  permissions: Permissions | undefined;
};
```

データだけでなく`permissions`も`undefined`になりうるため、表示前には権限チェックとデータの存在チェックを組み合わせる必要があります。コーディングルールに従い、条件を変数に切り出してみます。

```tsx
function Dashboard({ response }: { response: DashboardResponse }) {
  // ルールに従い、条件を変数に切り出す
  const canShowUsers =
    response.permissions != null &&
    response.permissions.canViewUsers &&
    response.users != null &&
    response.users.length > 0;
  const canShowOrders =
    response.permissions != null &&
    response.permissions.canViewOrders &&
    response.orders != null &&
    response.orders.length > 0;

  return (
    <div>
      {/* response.users は User[] | undefined のまま。型エラー! */}
      {canShowUsers && <UserTable users={response.users} />}
      {/* response.orders も Order[] | undefined のまま。型エラー! */}
      {canShowOrders && <OrderTable orders={response.orders} />}
    </div>
  );
}
```

`canShowUsers`が`true`であれば`response.users`は`User[]`であるはずですが、TypeScriptはそう判断してくれません。`canShowOrders`についても同様です。**条件式をboolean変数に代入した時点で、型の絞り込み（narrowing）情報が失われる**ためです。

複数のoptionalフィールドと権限チェックを組み合わせるレスポンス型では、フィールドごとにこの問題が発生するため、影響範囲が大きくなります。

### なぜnarrowingが消えるのか

TypeScriptのControl Flow Analysis（制御フロー解析）は、`if`文や`&&`演算子などの条件分岐の**直後**でのみ型を絞り込みます。条件式の結果を`boolean`変数に代入すると、TypeScriptはその変数と元の値の関係を追跡しなくなります。

```tsx
// これは narrowing が効く（直接条件チェック）
if (response.users != null) {
  response.users; // User[]
}
if (response.orders != null) {
  response.orders; // Order[]
}

// これは narrowing が効かない（boolean変数経由）
const hasUsers = response.users != null;
const hasOrders = response.orders != null;
if (hasUsers) {
  response.users; // User[] | undefined のまま
}
if (hasOrders) {
  response.orders; // Order[] | undefined のまま
}
```

これはTypeScriptの仕様上の制約です。変数への代入を挟むと、コンパイラは「この`boolean`が`true`のとき、元のどの値がどの型に絞り込まれるか」という情報を保持しません。なぜ保持しないのか、TypeScriptのコンパイラ設計上の理由を掘り下げてみます。

#### エイリアス条件と可変性の問題

先ほどの例では`const`で宣言していましたが、TypeScriptのコンパイラは`const`か`let`かに関係なく、boolean変数経由のnarrowingを行いません。まず`let`のケースで考えてみます。`let`で宣言されたboolean変数は後から再代入できるため、仮にnarrowingを行うと次のような問題が起きます。

```ts
let hasUsers = response.users != null; // (1) response.usersがnon-nullならtrue
hasUsers = true; // (2) 再代入。response.usersの状態とは無関係にtrueになった

if (hasUsers) {
  // (3) hasUsersはtrueだが、response.usersがundefinedである可能性がある
  //     もしここでnarrowingしてUser[]として扱うと、実行時にクラッシュする
  response.users;
}
```

(1)の時点では`hasUsers`は`response.users`の状態を正しく反映していますが、(2)で`true`を直接代入すると両者の関係は壊れます。もし(3)でコンパイラが「`hasUsers`が`true`だから`response.users`は`User[]`」とnarrowingしてしまうと、`response.users`が`undefined`のケースで実行時エラーが発生します。TypeScriptのDesign Goalsでは、Non-goalsとして「健全（sound）または"証明可能な正しさ"を持つ型システムを適用すること」が[明記](https://github.com/microsoft/TypeScript/wiki/TypeScript-Design-Goals#non-goals)されており、完全な健全性よりも正確さと生産性のバランスを重視する設計です。しかしそれでも、このように明らかに不健全になるケースは避ける方針をとっています。

では「`const`なら再代入されないから追跡できるのでは？」と思うかもしれません。しかし`const`が再代入を防ぐのは`hasUsers`変数自体だけであり、元のオブジェクト`response`のプロパティは`const`の影響を受けません。

```ts
const hasUsers = response.users != null; // (1) trueが入る

response.users = undefined; // (2) オブジェクトのプロパティを書き換え

if (hasUsers) {
  // (3) hasUsersはconstなのでtrueのまま
  //     しかしresponse.usersはもうundefined
  //     narrowingしたらUser[]扱いになり、実行時にクラッシュする
  response.users;
}
```

`const hasUsers`が`true`であっても、それは評価時点の事実にすぎません。`if (hasUsers)`に到達するまでに`response.users`が書き換えられている可能性をコンパイラは排除できないため、`const`であってもboolean変数経由のnarrowingは行わない設計になっています。

#### コンパイラのパフォーマンス

任意のboolean変数から元の条件式を逆引きし、すべての制御フローパスでその条件式を再評価する処理は、コンパイル速度に大きな影響を与えます。

TypeScriptコンパイラの[binder](https://github.com/microsoft/TypeScript/blob/main/src/compiler/binder.ts)はコンパイルパイプラインの初期段階で、AST上の各宣言にシンボルを割り当て、シンボルテーブルを構築するコンポーネントです。このbinderが制御フロー解析の状態も管理しているため、ここにboolean変数の逆引き追跡のようなロジックを追加すると、コンパイル全体のパフォーマンスに影響します。

#### 例外: narrowingが効くエイリアスのケース

ここまでの説明では「boolean変数経由のnarrowingは効かない」としてきましたが、例外的にnarrowingが効くケースもあります。

**`readonly`プロパティ由来のboolean変数**

プロパティが`readonly`で宣言されている場合、コンパイラはそのプロパティが書き換えられないことを保証できます。前述の`const`の問題は「プロパティが変更されうること」が原因でしたが、`readonly`であればその可能性が排除されるため、boolean変数経由でもnarrowingが効きます。

```ts
type Response = {
  readonly users: User[] | undefined;
};

function example(response: Response) {
  const hasUsers = response.users != null;
  if (hasUsers) {
    response.users; // User[] にnarrowingされる
  }
}
```

ただし、`response`オブジェクト自体が再代入される場合はnarrowingが消えます。プロパティが`readonly`でも、オブジェクトごと置き換わればプロパティの値も変わるためです。

**discriminant propertyの直接エイリアス**

discriminant property（判別プロパティ）の**値そのもの**を変数にエイリアスした場合も、narrowingが効きます。

```ts
type Shape =
  | { kind: "circle"; radius: number }
  | { kind: "square"; side: number };

function area(shape: Shape) {
  const kind = shape.kind; // discriminant propertyの値をそのままエイリアス
  if (kind === "circle") {
    shape.radius; // Shape → { kind: "circle"; radius: number } にnarrowing
  }
}
```

これは`kind`が`shape.kind`の値そのものを保持しており、値と型が一対一で対応しているためです。一方、同じdiscriminant propertyでも**boolean条件に変換**するとnarrowingは効きません。

```ts
function area(shape: Shape) {
  const isCircle = shape.kind === "circle"; // booleanに変換
  if (isCircle) {
    shape.radius; // エラー！narrowingされない
  }
}
```

`isCircle`は比較結果の`boolean`であり、`shape.kind`の値ではありません。コンパイラは`boolean`の`true`から元の条件式を逆引きしないため、`shape`がミュータブルである以上narrowingの対象外になります。

このように、narrowingが効くかどうかの本質は**エイリアス先の変数が元の値との対応関係を維持できるか**にあります。`readonly`プロパティやdiscriminant propertyの直接エイリアスは対応関係が保たれますが、boolean変数への変換はその関係を断ち切ってしまいます。

## AIがとる解決策

この型エラーに直面したとき、AIコーディングアシスタントはどう振る舞うでしょうか。まずコーディングルールに従って条件をboolean変数に切り出しますが、型エラーが発生します。そこでインラインチェックに戻そうとしますが、今度はルールに違反してしまいます。ルール準拠と型安全性の両立ができず、最終的に`!`（non-null assertion）で型エラーを黙らせるコードを生成しがちです。

```tsx
const canShowUsers =
  response.permissions != null &&
  response.permissions.canViewUsers &&
  response.users != null &&
  response.users.length > 0;

// ! で型チェックを無効化
{
  canShowUsers && <UserTable users={response.users!} />;
}
```

`!`はTypeScriptに「この値はnullではない」と伝える演算子ですが、型チェックを無効化しているだけで、実行時の安全性は保証されません。ルールを守った結果かえって型安全性が悪化しているという本末転倒な状態です。

## 解決パターンの比較

この問題に対するアプローチを5つ整理し、それぞれの型安全性とルール準拠を評価しました。

### Pattern 1: インラインチェック

変数に代入せず、JSX内で直接条件チェックする方法です。

```tsx
function Dashboard({ response }: { response: DashboardResponse }) {
  return (
    <div>
      {response.permissions != null &&
        response.permissions.canViewUsers &&
        response.users != null &&
        response.users.length > 0 && <UserTable users={response.users} />}
    </div>
  );
}
```

直接条件チェックしているため、TypeScriptのnarrowingが効きます。ただし、権限チェックとデータチェックがすべてJSX内に入るため、コーディングルールに違反します。条件が増えるほどJSX内が膨らみ、可読性が下がります。

### Pattern 2: Type Predicate（ユーザー定義型ガード）

TypeScriptの`is`構文を使い、関数の戻り値で型を絞り込む方法です。

```tsx
type WithPermissions = {
  permissions: NonNullable<DashboardResponse["permissions"]>;
};
type WithUsers = WithPermissions & {
  users: NonNullable<DashboardResponse["users"]>;
};

function canShowUsers(
  response: DashboardResponse,
): response is DashboardResponse & WithUsers {
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

`canShowUsers(response)`が`true`を返したとき、TypeScriptは`response`の型を`DashboardResponse & WithUsers`に絞り込みます。boolean変数への代入ではなく関数呼び出しなので、narrowingが維持されます。権限チェックとデータチェックが関数名`canShowUsers`に凝縮され、JSXは宣言的なまま保てます。

既存のコンポーネント構造を変えずに使えるのが大きな利点です。

ただし、Type Predicateには注意すべきデメリットがあります。**関数の実装内容をTypeScriptが検証しない**という点です。たとえば、以下のように`return true`と書いても型エラーにはなりません。

```tsx
// コンパイルは通るが、実行時に壊れる
function canShowUsers(
  response: DashboardResponse,
): response is DashboardResponse & WithUsers {
  return true; // 常にtrueを返す → usersがundefinedでもWithUsersとして扱われる
}
```

TypeScriptは「`true`が返されたとき`response`は`DashboardResponse & WithUsers`である」と信じるだけで、関数内部のロジックが実際にその型を保証しているかは検査しません。

TypeScriptには、型の正しさをコンパイラではなく開発者が保証する機能がいくつかあります。`as`によるtype assertionや`!`によるnon-null assertionがその代表です。これらは型システムの制約を開発者の判断で迂回する手段であり、本記事では**Escape Hatch**と呼ぶことにします。Type PredicateもこのEscape Hatchの一種です。

条件ロジックを変更した際に戻り値の型を更新し忘れたり、リファクタリングでチェック内容がずれたりすると、型上は安全に見えるのに実行時にクラッシュするという、非常に発見しにくいバグにつながります。

この点において、Early Returnパターンは`if`文によるnarrowingをTypeScriptが自動で検証するため、Escape Hatchに頼る必要がありません。

### Pattern 3: Early Return

子コンポーネントを分割し、early returnでnarrowingを効かせる方法です。

```tsx
function UserSection({
  users,
  permissions,
}: {
  users: User[] | undefined;
  permissions: Permissions | undefined;
}) {
  if (permissions == null || !permissions.canViewUsers) {
    return null;
  }
  if (users == null || users.length === 0) {
    return null;
  }
  // ここでは users: User[] にnarrowingされている
  return <UserTable users={users} />;
}

function Dashboard({ response }: { response: DashboardResponse }) {
  return (
    <div>
      <UserSection users={response.users} permissions={response.permissions} />
    </div>
  );
}
```

`if`文でガードした後のコードブロックでは、TypeScriptが自然にnarrowingを効かせてくれます。TypeScriptのControl Flow Analysisと自然に噛み合うだけでなく、Reactにおいてもコンポーネントから`null`を返して不要なレンダリングをスキップするのは推奨パターンです。ただし、コンポーネントの分割が必要になります。

### Pattern 4: Non-null Assertion（!）

前述のAIが生成するパターンです。参考として掲載しますが、推奨しません。

```tsx
const canShowUsers =
  response.permissions != null &&
  response.permissions.canViewUsers &&
  response.users != null &&
  response.users.length > 0;

{
  canShowUsers && <UserTable users={response.users!} />;
}
```

型チェックを無効化しているため、将来的にコードが変更されたときにバグの温床になります。

### Pattern 5: 三項演算子

三項演算子の条件部分で直接チェックする方法です。

```tsx
function Dashboard({ response }: { response: DashboardResponse }) {
  return (
    <div>
      {response.permissions != null &&
      response.permissions.canViewUsers &&
      response.users != null &&
      response.users.length > 0 ? (
        <UserTable users={response.users} />
      ) : (
        <p>No users</p>
      )}
    </div>
  );
}
```

Pattern 1と同様にnarrowingが効きますが、JSX内に条件を書いているためルール違反です。データがない場合のフォールバック表示を書きやすいのが利点です。

### 比較表

| パターン               | 型安全 | ルール準拠 | コンポーネント変更 | 備考                                 |
| ---------------------- | ------ | ---------- | ------------------ | ------------------------------------ |
| インラインチェック     | ◯      | ✕          | 不要               |                                      |
| Type Predicate         | ◯      | ◯          | 不要               | 実装の正しさはコンパイラが保証しない |
| Early Return           | ◯      | ◯          | 必要               | コンパイラがnarrowingを自動検証      |
| Non-null Assertion (!) | ✕      | ◯          | 不要               |                                      |
| 三項演算子             | ◯      | ✕          | 不要               |                                      |

**型安全性とルール準拠を両立できるのは、Type PredicateとEarly Returnの2つ**です。

## Type Predicateのパフォーマンスへの影響

Type Predicateが有力な選択肢であることはわかりました。しかし、プロジェクト全体で多用した場合、TypeScriptの型チェック速度に影響しないか気になります。

### ランタイムへの影響はゼロ

まず前提として、`x is T`構文はコンパイル時に完全に消去されます。出力されるJavaScriptは、普通のbooleanを返す関数とまったく同じです。

```ts
// TypeScript
function canShowUsers(
  response: DashboardResponse,
): response is DashboardResponse & WithUsers {
  return (
    response.permissions != null &&
    response.permissions.canViewUsers &&
    response.users != null &&
    response.users.length > 0
  );
}

// コンパイル後のJavaScript
function canShowUsers(response) {
  return (
    response.permissions != null &&
    response.permissions.canViewUsers &&
    response.users != null &&
    response.users.length > 0
  );
}
```

ブラウザ上のレンダリングパフォーマンスには一切影響しません。

### 型チェック速度の計測

影響がありうるのは、`tsc`による型チェックの速度です。TypeScriptコンパイラの`--extendedDiagnostics`フラグを使って計測しました。

#### ベンチマーク構成

2つのファイルを用意し、それぞれ**1,000個**の型とコンポーネントを定義しました。以下はその1個分のテンプレートです（実際には`UsersResponse0`〜`UsersResponse999`のように連番で生成）。

**Type Predicateパターン:** 各コンポーネントにtype predicate関数を用意

```tsx
type UsersResponse = { users: User[] | undefined };
type NonEmptyUsersResponse = { users: NonNullable<UsersResponse["users"]> };

function hasUsers(r: UsersResponse): r is NonEmptyUsersResponse {
  return r.users != null && r.users.length > 0;
}

function Component({ response }: { response: UsersResponse }) {
  return hasUsers(response) ? <div>{response.users.length}</div> : null;
}
```

**インラインチェックパターン:** JSX内で直接条件チェック

```tsx
type UsersResponse = { users: User[] | undefined };

function Component({ response }: { response: UsersResponse }) {
  return response.users != null && response.users.length > 0 ? (
    <div>{response.users.length}</div>
  ) : null;
}
```

#### 計測結果

各パターンを5回ずつ実行し、`Check time`を比較しました。

| 回       | Type Predicate | インラインチェック |
| -------- | -------------- | ------------------ |
| 1        | 1.44s          | 1.22s              |
| 2        | 1.46s          | 1.28s              |
| 3        | 1.44s          | 1.33s              |
| 4        | 1.46s          | 1.24s              |
| 5        | 1.44s          | 1.23s              |
| **平均** | **1.45s**      | **1.26s**          |

**1,000個あたりの差は約0.19秒**でした。

#### コンパイラ内部の統計

| 指標    | Type Predicate | インラインチェック | 差分    |
| ------- | -------------- | ------------------ | ------- |
| Symbols | 108,934        | 103,934            | +5,000  |
| Types   | 40,242         | 38,240             | +2,002  |
| Memory  | 188,184K       | 183,642K           | +4,542K |

Type Predicateを使うと、追加の型定義（`NonEmptyUsersResponse`）と関数シグネチャの解決により、Symbolsが5,000個、Typesが約2,000個増加します。しかし、1個あたりに換算すると約0.19msの差であり、現実的な使用量（10〜50個）では2〜10msの差にしかならず、体感への影響はありません。

## どのパターンを選ぶべきか

検証の結果、以下の使い分けを推奨します。

### Type Predicateが向いているケース

- 既存コンポーネントの構造を変えたくない場合
- 同じ条件チェックを複数箇所で再利用したい場合
- レスポンスオブジェクト全体の型を絞り込みたい場合

```tsx
// 一度定義すれば複数箇所で再利用できる
function canShowUsers(
  response: DashboardResponse,
): response is DashboardResponse & WithUsers {
  return (
    response.permissions != null &&
    response.permissions.canViewUsers &&
    response.users != null &&
    response.users.length > 0
  );
}
```

### Early Returnが向いているケース

- 新規にコンポーネントを作成する場合
- 表示ロジックが複雑で、コンポーネント分割が自然な場合
- TypeScriptの標準的なnarrowingだけで完結させたい場合

```tsx
// TypeScriptのControl Flow AnalysisとReactのコンポーネント分割の両方と自然に噛み合う
function UserSection({
  users,
  permissions,
}: {
  users: User[] | undefined;
  permissions: Permissions | undefined;
}) {
  if (permissions == null || !permissions.canViewUsers) return null;
  if (users == null || users.length === 0) return null;
  return <UserTable users={users} />;
}
```

### 避けるべきパターン

- **Non-null Assertion（!）**: 型チェックを無効化するため、コーディングルールを守る意味がなくなる
- 条件式が複雑な場合の**インラインチェック**: ルール違反かつ可読性の低下を招く

## まとめ

「ロジックをJSX外に出す」というコーディングルールは可読性の観点で正しいですが、boolean変数への代入によってTypeScriptの型narrowingが消えるという副作用があります。

この問題に対して5つのパターンを検証した結果、**Type Predicate**と**Early Return**が型安全性とルール準拠を両立できる現実的な選択肢でした。特にType Predicateは、パフォーマンス計測の結果からも型チェック速度への影響は無視できるレベルであり、安心して採用できます。

コーディングルールを導入する際は、TypeScriptの型システムとの相互作用を考慮し、ルールの例外や推奨パターンをあわせて明記しておくと、チーム全体の開発体験が向上するのではないでしょうか。
