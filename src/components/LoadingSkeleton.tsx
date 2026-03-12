export function CardSkeleton() {
  return (
    <div className="skeleton-card">
      <div className="skeleton-line skeleton-line-short" />
      <div className="skeleton-line skeleton-line-medium" />
    </div>
  );
}

export function TableRowSkeleton({ columns = 8 }: { columns?: number }) {
  return (
    <tr className="skeleton-row">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="skeleton-cell">
          <div className="skeleton-line skeleton-line-random" />
        </td>
      ))}
    </tr>
  );
}

export function TableSkeleton({ rows = 10, columns = 8 }: { rows?: number; columns?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <TableRowSkeleton key={i} columns={columns} />
      ))}
    </>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="skeleton-profile">
      <div className="skeleton-line skeleton-line-wide" />
      <div className="skeleton-line skeleton-line-full" />
      <div className="skeleton-line skeleton-line-full" />
      <div className="skeleton-line skeleton-line-medium" />
      <div className="skeleton-line skeleton-line-full" />
      <div className="skeleton-line skeleton-line-short" />
    </div>
  );
}
