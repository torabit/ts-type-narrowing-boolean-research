# この調査リポジトリの背景

## きっかけ

弊社のリポジトリに以下のコーディングルールが追加された。

> **ロジックを JSX 外に出すこと (SHOULD)**
> JSX 中で条件判定や計算を直接行わず、事前に意味のある名前の変数を用意してから使用すること。
> 目的: JSX (マークアップ) を読む際の認知負荷を下げる。

```tsx
// ✅ ルールに沿った書き方
const hasData = dataCount > 0;
return <div>{hasData && <DataTable />}</div>;

// ❌ ルール違反
return <div>{dataCount > 0 && <DataTable />}</div>;
```

ルールの意図自体は理解できる。JSX 内に複雑な条件式がネストすると可読性が著しく下がるので、変数に切り出すのは正しい。

## 問題: boolean 変数に代入すると型の narrowing が消える

このルールに従って AI がコーディングすると、以下のようなケースで問題が起きた。

```tsx
function UserList({ response }: { response: UsersResponse }) {
  // ルールに従い、条件を変数に切り出す
  const hasUsers = response.users != null && response.users.length > 0;

  return (
    <div>
      {/* ❌ response.users は User[] | undefined のまま。型エラー */}
      {hasUsers && <Table users={response.users} />}
    </div>
  );
}
```

`hasUsers` に代入した時点で TypeScript の型情報は `boolean` になり、`response.users` の narrowing が消える。

AI はこれを解決するために `response.users!`（non-null assertion）を使うようになった。

```tsx
// AI が生成するコード
{hasUsers && <Table users={response.users!} />}
```

`!` は型安全性を捨てているので、ルールを守った結果かえって悪化している。

## 疑問

- このルールと TypeScript の型 narrowing をどう両立させるか？
- type predicate で解決できるが、型チェックのパフォーマンスは大丈夫か？
- 他にどんなパターンがあるか？

## この調査で検証したこと

### パターンの整理 (`src/patterns/`)

| ファイル | パターン | 型安全 | ルール準拠 |
|---------|---------|--------|-----------|
| `1-problem.tsx` | boolean 変数に代入 | ❌ | ✅ |
| `2-inline-check.tsx` | JSX 内で直接チェック | ✅ | ❌ |
| `3-type-predicate.tsx` | type predicate | ✅ | ✅ |
| `4-early-return.tsx` | 子コンポーネントで early return | ✅ | ✅ |
| `5-non-null-assertion.tsx` | `!` で型を上書き | ❌ | ✅ |
| `6-ternary.tsx` | 三項演算子で直接チェック | ✅ | ❌ |

### パフォーマンス計測 (`docs/type-predicate-performance.md`)

type predicate を大量に使った場合の型チェックパフォーマンスへの影響を計測。結果、1個あたり約 0.19ms の差で、現実的なプロジェクト規模では無視できるレベルだった。

## 結論

ルールと型安全性を両立させるなら **type predicate** か **early return** が現実的な選択肢。

- **type predicate**: 既存のコンポーネント構造を変えずに使える。パフォーマンスへの影響も無視できる。
- **early return**: コンポーネントを分割する必要があるが、最も自然に narrowing が効く。

inline check や ternary はルール違反になるが、単純な条件であればルール側に「例外: 単純な条件は JSX 内でも OK」の記載があるので許容される場合もある。
