# Type Predicate の型チェックパフォーマンス調査

## 背景

`boolean` に代入すると型の narrowing が消える問題の解決策として type predicate (`x is T`) がある。
しかし `hasUsers`, `hasOrders` のように大量に用意した場合、型チェック（`tsc`）のパフォーマンスに影響するのかが気になった。

## 前提: ランタイムへの影響はゼロ

Type predicate の `x is T` 構文はコンパイル時に完全に消去される。出力される JavaScript は普通の boolean を返す関数と同一。

```ts
// TypeScript
function hasUsers(response: UsersResponse): response is NonEmptyUsersResponse {
  return response.users != null && response.users.length > 0;
}

// コンパイル後の JavaScript
function hasUsers(response) {
  return response.users != null && response.users.length > 0;
}
```

JSX のレンダリングには一切影響しない。

## 計測方法

TypeScript コンパイラの `--extendedDiagnostics` フラグで `Check time` を比較した。

### ベンチマーク構成

2つのファイルを用意し、それぞれ 1000 個の型 + コンポーネントを定義:

**Type Predicate パターン** (`src/bench/type-predicate-bench.tsx`)
```tsx
type UsersResponseN = { users: User[] | undefined };
type NonEmptyUsersResponseN = { users: NonNullable<UsersResponseN["users"]> };
function hasUsersN(r: UsersResponseN): r is NonEmptyUsersResponseN {
  return r.users != null && r.users.length > 0;
}
function ComponentN({ response }: { response: UsersResponseN }) {
  return hasUsersN(response) ? <div>{response.users.length}</div> : null;
}
```

**Inline Check パターン** (`src/bench/inline-check-bench.tsx`)
```tsx
type UsersResponseN = { users: User[] | undefined };
function ComponentN({ response }: { response: UsersResponseN }) {
  return response.users != null && response.users.length > 0
    ? <div>{response.users.length}</div>
    : null;
}
```

### 計測コマンド

```bash
npx tsc --noEmit --extendedDiagnostics --jsx react-jsx --esModuleInterop --strict <file>
```

各パターンを 5 回ずつ実行。

## 計測結果

### Check time (5回の結果)

| 回 | Type Predicate | Inline Check |
|----|---------------|-------------|
| 1  | 1.44s         | 1.22s       |
| 2  | 1.46s         | 1.28s       |
| 3  | 1.44s         | 1.33s       |
| 4  | 1.46s         | 1.24s       |
| 5  | 1.44s         | 1.23s       |
| **平均** | **1.45s** | **1.26s** |

### 差: 約 0.19s (≒15%)

### コンパイラ内部の統計値

| 指標 | Type Predicate | Inline Check | 差分 |
|------|---------------|-------------|------|
| Symbols | 108,934 | 103,934 | +5,000 |
| Types | 40,242 | 38,240 | +2,002 |
| Assignability cache | 26,297 | 25,297 | +1,000 |
| Strict subtype cache | 2,001 | 0 | +2,001 |
| Memory | 188,184K | 183,642K | +4,542K |

Symbols が 5,000 多い理由:
- `NonEmptyUsersResponseN` 型の定義 × 1000
- `hasUsersN` 関数の定義 × 1000
- type predicate シグネチャの解決 × 1000
- その他内部 Symbol × 2000

Types が 2,002 多い理由:
- `NonNullable<UsersResponseN["users"]>` の解決 × 1000
- type predicate の戻り型の解決 × 1000
- インデックスアクセス型 `UsersResponseN["users"]` × 2 (余剰)

## 結論

| 観点 | 評価 |
|------|------|
| 1000 個あたりのコスト | 約 0.19s |
| 1 個あたりのコスト | 約 0.19ms |
| 現実的な使用量 (10〜50 個) | 2〜10ms の差 |
| 体感への影響 | なし |

Type predicate は型チェックにおいてゼロコストではないが、現実的なプロジェクト規模では無視できるレベル。可読性・型安全性のメリットを優先して良い。

## 再現方法

```bash
# ベンチマークファイルの生成
node -e "
let out = '// Benchmark: 1000 type predicate functions\n';
out += 'type User = { id: number; name: string; email: string };\n\n';
for (let i = 0; i < 1000; i++) {
  out += 'type UsersResponse' + i + ' = { users: User[] | undefined };\n';
  out += 'type NonEmptyUsersResponse' + i + ' = { users: NonNullable<UsersResponse' + i + '[\"users\"]> };\n';
  out += 'function hasUsers' + i + '(r: UsersResponse' + i + '): r is NonEmptyUsersResponse' + i + ' { return r.users != null && r.users.length > 0; }\n';
  out += 'function Component' + i + '({ response }: { response: UsersResponse' + i + ' }) { return hasUsers' + i + '(response) ? <div>{response.users.length}</div> : null; }\n\n';
}
out += 'const resp: UsersResponse0 = { users: [{ id: 1, name: \"a\", email: \"a@a.com\" }] };\n';
out += 'export function TypePredicateBench() {\n  return (\n    <div>\n';
for (let i = 0; i < 1000; i++) { out += '      <Component' + i + ' response={resp as any} />\n'; }
out += '    </div>\n  );\n}\n';
require('fs').writeFileSync('src/bench/type-predicate-bench.tsx', out);
"

# 計測
npx tsc --noEmit --extendedDiagnostics --jsx react-jsx --esModuleInterop --strict src/bench/type-predicate-bench.tsx
```

## 計測環境

- TypeScript: プロジェクトの node_modules 内バージョン
- Platform: macOS (Darwin 24.6.0, ARM64)
- 計測日: 2026-03-13
