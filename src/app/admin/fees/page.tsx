'use client';

import { useEffect, useState, useCallback } from 'react';
import FeeStatusBadge from '@/components/FeeStatusBadge';
import StatCard from '@/components/StatCard';
import { CardSkeleton, TableSkeleton } from '@/components/LoadingSkeleton';
import type { Instrument, Centre, PaymentStatus } from '@/lib/types';
import { INSTRUMENTS } from '@/lib/types';

interface PaymentRow {
  id: string;
  student_id: string;
  student_name: string;
  student_phone: string;
  student_instrument: Instrument;
  student_centre: Centre;
  month: number;
  year: number;
  amount: number;
  status: PaymentStatus;
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function FeesPage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [centreFilter, setCentreFilter] = useState('all');
  const [instrumentFilter, setInstrumentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [totals, setTotals] = useState({ total: 0, paid: 0, pending: 0 });
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [genMessage, setGenMessage] = useState('');
  const [noRecords, setNoRecords] = useState(false);

  const fetchPayments = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set('month', String(month));
    params.set('year', String(year));
    if (centreFilter !== 'all') params.set('centre', centreFilter);
    if (instrumentFilter !== 'all') params.set('instrument', instrumentFilter);
    if (statusFilter !== 'all') params.set('status', statusFilter);

    fetch(`/api/fees/monthly?${params}`)
      .then(r => r.json())
      .then(data => {
        const paymentList = data.payments || [];
        setPayments(paymentList);
        setTotals({
          total: data.totalAmount || 0,
          paid: data.paidAmount || 0,
          pending: data.pendingAmount || 0,
        });
        // Detect if no records exist for current month (with no filters)
        const nowDate = new Date();
        const isCurrentMonth = month === nowDate.getMonth() + 1 && year === nowDate.getFullYear();
        const hasNoFilters = centreFilter === 'all' && instrumentFilter === 'all' && statusFilter === 'all';
        setNoRecords(paymentList.length === 0 && isCurrentMonth && hasNoFilters);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [month, year, centreFilter, instrumentFilter, statusFilter]);

  useEffect(() => { fetchPayments(); }, [fetchPayments]);

  const handleStatusChange = async (paymentId: string, newStatus: PaymentStatus) => {
    await fetch(`/api/fees/monthly/${paymentId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    fetchPayments();
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setGenMessage('');
    try {
      const res = await fetch('/api/fees/monthly/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month, year }),
      });
      const data = await res.json();
      setGenMessage(data.message || 'Done');
      fetchPayments();
    } catch {
      setGenMessage('Failed to generate');
    } finally {
      setGenerating(false);
      setTimeout(() => setGenMessage(''), 4000);
    }
  };

  const fmt = (n: number) => '₹' + n.toLocaleString('en-IN');

  return (
    <div>
      <div className="page-header page-header-with-action">
        <div>
          <h2 className="page-title">Monthly Fees</h2>
          <p className="page-subtitle">Track and manage monthly fee payments</p>
        </div>
        <button className="btn-primary" onClick={handleGenerate} disabled={generating}>
          {generating ? 'Generating...' : 'Generate Records'}
        </button>
      </div>

      {genMessage && <div className="alert-info">{genMessage}</div>}

      {!loading && noRecords && !genMessage && (
        <div className="auto-gen-warning">
          <span>⚠️ No fee records found for this month. Generate records to start tracking payments.</span>
          <button onClick={handleGenerate} disabled={generating}>
            {generating ? 'Generating...' : 'Generate Now'}
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="stat-grid stat-grid-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)
        ) : (
          <>
            <StatCard title="Total Revenue" value={fmt(totals.total)} color="blue" subtitle={`${MONTHS[month - 1]} ${year}`}
              icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>}
            />
            <StatCard title="Collected" value={fmt(totals.paid)} color="emerald" subtitle={`${payments.filter(p => p.status === 'Paid').length} students`}
              icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>}
            />
            <StatCard title="Pending" value={fmt(totals.pending)} color="rose" subtitle={`${payments.filter(p => p.status !== 'Paid').length} students`}
              icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" /></svg>}
            />
          </>
        )}
      </div>

      {/* Filters */}
      <div className="filter-bar">
        <select value={month} onChange={e => setMonth(Number(e.target.value))} className="table-select">
          {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
        </select>
        <select value={year} onChange={e => setYear(Number(e.target.value))} className="table-select">
          {[2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <select value={centreFilter} onChange={e => setCentreFilter(e.target.value)} className="table-select">
          <option value="all">All Centres</option>
          <option value="Centre A">Centre A</option>
          <option value="Centre B">Centre B</option>
        </select>
        <select value={instrumentFilter} onChange={e => setInstrumentFilter(e.target.value)} className="table-select">
          <option value="all">All Instruments</option>
          {INSTRUMENTS.map(i => <option key={i} value={i}>{i}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="table-select">
          <option value="all">All Status</option>
          <option value="Paid">Paid</option>
          <option value="Pending">Pending</option>
          <option value="Late">Late</option>
          <option value="Waived">Waived</option>
        </select>
      </div>

      {/* Table */}
      <div className="student-table-wrapper">
        <div className="table-meta">
          <span className="table-count">{payments.length} record{payments.length !== 1 ? 's' : ''}</span>
        </div>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Phone</th>
                <th>Instrument</th>
                <th>Centre</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <TableSkeleton rows={10} columns={6} />
              ) : payments.length === 0 ? (
                <tr><td colSpan={6} className="table-empty">No payment records for this period. Click &quot;Generate Records&quot; to create them.</td></tr>
              ) : (
                payments.map(p => (
                  <tr key={p.id}>
                    <td className="table-cell-name">{p.student_name}</td>
                    <td className="table-cell-mono">{p.student_phone}</td>
                    <td>{p.student_instrument}</td>
                    <td>
                      <span className={`centre-badge ${p.student_centre === 'Centre A' ? 'centre-badge-a' : 'centre-badge-b'}`}>
                        {p.student_centre}
                      </span>
                    </td>
                    <td className="table-cell-mono">₹{p.amount.toLocaleString('en-IN')}</td>
                    <td>
                      <select
                        value={p.status}
                        onChange={e => handleStatusChange(p.id, e.target.value as PaymentStatus)}
                        className={`inline-status-select status-${p.status.toLowerCase()}`}
                      >
                        <option value="Paid">Paid</option>
                        <option value="Pending">Pending</option>
                        <option value="Late">Late</option>
                        <option value="Waived">Waived</option>
                      </select>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
