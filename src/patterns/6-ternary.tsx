// Pattern 5: ternary で直接 narrowing
// 三項演算子の条件部分で直接チェックすれば narrowing が効く

type Props = {
  table: { list: number[] | undefined };
};

function Table({ data }: { data: number[] }) {
  return (
    <ul>
      {data.map((n) => (
        <li key={n}>{n}</li>
      ))}
    </ul>
  );
}

export function Pattern5_Ternary({ table }: Props) {
  return (
    <div>
      <p>三項演算子で直接条件チェック</p>
      {table.list != null && table.list.length > 0 ? (
        <Table data={table.list} />
      ) : (
        <p>No data</p>
      )}
    </div>
  );
}
