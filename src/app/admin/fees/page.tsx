'use client';

import { useEffect, useState } from 'react';
import StudentTable from '@/components/StudentTable';
import type { Student } from '@/lib/mockData';

export default function FeesPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'Paid' | 'Due'>('all');

  useEffect(() => {
    fetch('/api/students')
      .then((res) => res.json())
      .then((data) => {
        setStudents(data.students || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const paid = students.filter((s) => s.feeStatus === 'Paid').length;
  const due = students.filter((s) => s.feeStatus === 'Due').length;

  const filtered = filter === 'all' ? students : students.filter((s) => s.feeStatus === filter);

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">Fee Management</h2>
        <p className="page-subtitle">Track and manage student fee payments</p>
      </div>

      {/* Fee Summary */}
      <div className="fee-summary">
        <button
          onClick={() => setFilter('all')}
          className={`fee-tab ${filter === 'all' ? 'fee-tab-active' : ''}`}
        >
          All Students
          <span className="fee-tab-count">{students.length}</span>
        </button>
        <button
          onClick={() => setFilter('Paid')}
          className={`fee-tab ${filter === 'Paid' ? 'fee-tab-active fee-tab-paid' : ''}`}
        >
          Fully Paid
          <span className="fee-tab-count">{paid}</span>
        </button>
        <button
          onClick={() => setFilter('Due')}
          className={`fee-tab ${filter === 'Due' ? 'fee-tab-active fee-tab-due' : ''}`}
        >
          Fees Due
          <span className="fee-tab-count">{due}</span>
        </button>
      </div>

      <StudentTable students={filtered} loading={loading} showFeeFilter={false} />
    </div>
  );
}
