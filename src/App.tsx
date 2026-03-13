import { Problem } from "./patterns/1-problem";
import { Pattern1_InlineCheck } from "./patterns/2-inline-check";
import { Pattern2_TypePredicate } from "./patterns/3-type-predicate";
import { Pattern3_EarlyReturn } from "./patterns/4-early-return";
import { Pattern4_NonNullAssertion } from "./patterns/5-non-null-assertion";
import { Pattern5_Ternary } from "./patterns/6-ternary";

export function App() {
  const table = {
    list: [1, 2, 3] as number[] | undefined,
  };

  return (
    <div style={{ fontFamily: "monospace", padding: 24 }}>
      <h1>Type Narrowing & Boolean Research</h1>

      <h2>Problem: boolean で型情報が消える</h2>
      <Problem table={table} />

      <h2>Pattern 1: inline check (直接条件で narrowing)</h2>
      <Pattern1_InlineCheck table={table} />

      <h2>Pattern 2: type predicate (ユーザー定義型ガード)</h2>
      <Pattern2_TypePredicate table={table} />

      <h2>Pattern 3: early return</h2>
      <Pattern3_EarlyReturn table={table} />

      <h2>Pattern 4: non-null assertion (!)</h2>
      <Pattern4_NonNullAssertion table={table} />

      <h2>Pattern 5: ternary</h2>
      <Pattern5_Ternary table={table} />
    </div>
  );
}
