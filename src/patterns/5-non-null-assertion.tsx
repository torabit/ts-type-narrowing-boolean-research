// Pattern 4: non-null assertion (!)
// 型安全ではないが、実用上は showTable が true なら list は non-null

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

export function Pattern4_NonNullAssertion({ table }: Props) {
  const showTable = table.list != null && table.list.length > 0;

  return (
    <div>
      <p>! で型を上書き (型安全性は失われる)</p>
      {showTable && <Table data={table.list!} />}
    </div>
  );
}
