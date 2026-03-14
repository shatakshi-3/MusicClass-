interface FeeStatusBadgeProps {
  status: string;
}

const statusMap: Record<string, { className: string; label: string }> = {
  Paid: { className: 'badge-paid', label: 'Paid' },
  Pending: { className: 'badge-pending', label: 'Pending' },
  Due: { className: 'badge-pending', label: 'Due' },
  Late: { className: 'badge-late', label: 'Late' },
  Waived: { className: 'badge-waived', label: 'Waived' },
};

export default function FeeStatusBadge({ status }: FeeStatusBadgeProps) {
  const config = statusMap[status] || { className: 'badge-pending', label: status };
  return (
    <span className={`status-badge ${config.className}`}>
      {config.label}
    </span>
  );
}
