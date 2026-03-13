// Pattern 3: early return
// コンポーネントを分割して early return で narrowing

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

function TableSection({ list }: { list: number[] | undefined }) {
  // early return で narrowing
  if (list == null || list.length === 0) {
    return null;
  }
  // ここでは list: number[] に narrowing されている
  return <Table data={list} />;
}

export function Pattern3_EarlyReturn({ table }: Props) {
  return (
    <div>
      <p>子コンポーネントで early return</p>
      <TableSection list={table.list} />
    </div>
  );
}
