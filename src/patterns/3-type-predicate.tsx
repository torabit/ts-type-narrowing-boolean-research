// Pattern 2: type predicate (ユーザー定義型ガード)
// 関数の戻り値を `is` で型述語にすることで narrowing を維持

type TableData = { list: number[] | undefined };

type NonEmptyTableData = { list: number[] };

function hasNonEmptyList(
  table: TableData
): table is NonEmptyTableData {
  return table.list != null && table.list.length > 0;
}

function Table({ data }: { data: number[] }) {
  return (
    <ul>
      {data.map((n) => (
        <li key={n}>{n}</li>
      ))}
    </ul>
  );
}

type Props = {
  table: TableData;
};

export function Pattern2_TypePredicate({ table }: Props) {
  // type predicate で narrowing が効く
  return (
    <div>
      <p>type predicate で table 自体を絞り込む</p>
      {hasNonEmptyList(table) && <Table data={table.list} />}
    </div>
  );
}
