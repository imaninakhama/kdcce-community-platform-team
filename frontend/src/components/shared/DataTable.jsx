// Shared table body for admin manager pages — columns: [{ key, header, cell(row) }].
// Meant to sit inside a card-k wrapper, typically right after FilterBar,
// matching the table markup DonationsManager established.
export default function DataTable({ columns, rows, keyField = 'id', emptyMessage = 'No records found.' }) {
  return <div className="overflow-x-auto">
    <table className="w-full min-w-[720px] text-left text-sm">
      <thead className="bg-kBorderSoft text-xs uppercase tracking-wider text-kMuted">
        <tr>{columns.map(col => <th key={col.key} className="px-5 py-4">{col.header}</th>)}</tr>
      </thead>
      <tbody>
        {rows.map(row => <tr key={row[keyField]} className="border-b border-kBorderSoft last:border-0">
          {columns.map(col => <td key={col.key} className="px-5 py-4 align-top">{col.cell(row)}</td>)}
        </tr>)}
        {rows.length === 0 && <tr><td colSpan={columns.length} className="px-5 py-10 text-center text-sm text-kMuted">{emptyMessage}</td></tr>}
      </tbody>
    </table>
  </div>
}
