interface FeeStatusBadgeProps {
  status: 'Paid' | 'Due';
}

export default function FeeStatusBadge({ status }: FeeStatusBadgeProps) {
  return (
    <span className={`fee-badge ${status === 'Paid' ? 'fee-badge-paid' : 'fee-badge-due'}`}>
      {status === 'Paid' ? '✓ Paid' : '✗ Due'}
    </span>
  );
}
