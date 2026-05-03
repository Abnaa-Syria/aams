export default function DataTable({ columns, data, loading, onRowClick, emptyMessage = 'لا توجد بيانات' }) {
  if (loading) {
    return <div className="loading-spinner"><div className="spinner"></div></div>;
  }

  if (!data || data.length === 0) {
    return <div className="empty-state"><p>{emptyMessage}</p></div>;
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} style={col.width ? { width: col.width } : {}}>{col.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr key={row.id || idx} onClick={() => onRowClick?.(row)} style={onRowClick ? { cursor: 'pointer' } : {}}>
              {columns.map((col) => (
                <td key={col.key}>
                  <span
                    onClick={(e) => {
                      if (col.stopRowClick) e.stopPropagation();
                    }}
                    style={col.stopRowClick ? { display: 'inline-flex' } : undefined}
                  >
                    {col.render ? col.render(row[col.key], row) : row[col.key]}
                  </span>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
