// Pattern 1: inline check
// 変数に代入せず、JSX 内で直接条件チェックすれば narrowing が効く

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

export function Pattern1_InlineCheck({ table }: Props) {
  // JSX 内で直接チェックすれば narrowing が効く
  return (
    <div>
      <p>直接 && で繋げば narrowing が効く</p>
      {table.list != null && table.list.length > 0 && (
        <Table data={table.list} />
      )}
    </div>
  );
}
