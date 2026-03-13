// 問題の再現:
// const showTable = table.list.length > 0 とすると boolean になり
// JSX 内で table.list を使うとき型の絞り込みが効かない

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

export function Problem({ table }: Props) {
  // boolean に代入した時点で narrowing が消える
  const showTable = table.list != null && table.list.length > 0;

  return (
    <div>
      <p>showTable の型: boolean (narrowing 効かない)</p>
      {/* table.list は number[] | undefined のまま */}
      {showTable && <Table data={table.list} />}
    </div>
  );
}
