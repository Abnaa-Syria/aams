export default function Pagination({ meta, onPageChange }) {
  if (!meta || meta.totalPages <= 1) return null;

  const pages = [];
  const maxVisible = 5;
  let start = Math.max(1, meta.page - Math.floor(maxVisible / 2));
  let end = Math.min(meta.totalPages, start + maxVisible - 1);
  if (end - start + 1 < maxVisible) start = Math.max(1, end - maxVisible + 1);

  for (let i = start; i <= end; i++) pages.push(i);

  return (
    <div className="pagination">
      <button disabled={meta.page <= 1} onClick={() => onPageChange(meta.page - 1)}>السابق</button>
      {pages.map((p) => (
        <button key={p} className={meta.page === p ? 'active' : ''} onClick={() => onPageChange(p)}>{p}</button>
      ))}
      <button disabled={meta.page >= meta.totalPages} onClick={() => onPageChange(meta.page + 1)}>التالي</button>
      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginRight: 8 }}>
        إجمالي: {meta.total}
      </span>
    </div>
  );
}
