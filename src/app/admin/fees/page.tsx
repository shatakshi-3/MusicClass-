'use client';

import { useEffect, useState, useCallback } from 'react';
import FeeStatusBadge from '@/components/FeeStatusBadge';
import StatCard from '@/components/StatCard';
import { CardSkeleton, TableSkeleton } from '@/components/LoadingSkeleton';
import type { Instrument, Centre, PaymentStatus, PaymentType, PaymentPlan, Student } from '@/lib/types';
import { INSTRUMENTS, CENTRES, PAYMENT_TYPES, PAYMENT_STATUSES } from '@/lib/types';

interface PaymentRow {
  id: string;
  student_id: string;
  student_name: string;
  student_phone: string;
  student_instrument: Instrument;
  student_centre: Centre;
  payment_plan?: PaymentPlan;
  amount: number;
  payment_date: string;
  payment_type: PaymentType;
  period_start?: string;
  period_end?: string;
  status: PaymentStatus;
  notes?: string;
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function FeesPage() {
  const now = new Date();
  const [centreFilter, setCentreFilter] = useState('all');
  const [instrumentFilter, setInstrumentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [totals, setTotals] = useState({ total: 0, paid: 0, pending: 0 });
  const [loading, setLoading] = useState(true);
  
  // Generation state
  const [generating, setGenerating] = useState(false);
  const [genMessage, setGenMessage] = useState('');
  const [genMonth, setGenMonth] = useState(now.getMonth() + 1);
  const [genYear, setGenYear] = useState(now.getFullYear());
  
  // Modals state
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [addStudentId, setAddStudentId] = useState('');
  const [addAmount, setAddAmount] = useState('');
  const [addDate, setAddDate] = useState(new Date().toISOString().split('T')[0]);
  const [addType, setAddType] = useState<PaymentType>('Custom');
  const [addPeriodStr, setAddPeriodStr] = useState('');
  const [addStatus, setAddStatus] = useState<PaymentStatus>('Paid');
  const [addNotes, setAddNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    
    // Fetch students for the add modal
    try {
      const studentRes = await fetch('/api/students');
      const studentData = await studentRes.json();
      setStudents(studentData.students || []);
    } catch (e) { console.error('Failed to fetch students', e); }

    const params = new URLSearchParams();
    if (centreFilter !== 'all') params.set('centre', centreFilter);
    if (instrumentFilter !== 'all') params.set('instrument', instrumentFilter);
    if (statusFilter !== 'all') params.set('status', statusFilter);
    if (typeFilter !== 'all') params.set('payment_type', typeFilter);

    try {
      const res = await fetch(`/api/fees?${params}`);
      const data = await res.json();
      const paymentList = data.payments || [];
      setPayments(paymentList);
      setTotals({
        total: data.totalAmount || 0,
        paid: data.paidAmount || 0,
        pending: data.pendingAmount || 0,
      });
    } catch (e) {
      console.error('Failed to fetch payments', e);
    } finally {
      setLoading(false);
    }
  }, [centreFilter, instrumentFilter, statusFilter, typeFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleUpdate = async (paymentId: string, updates: Partial<PaymentRow>) => {
    await fetch(`/api/fees/${paymentId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    fetchData();
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/fees/${deleteId}`, { method: 'DELETE' });
      if (res.ok) {
        setDeleteId(null);
        fetchData();
      } else {
        alert('Failed to delete payment');
      }
    } catch {
      alert('Network error while deleting');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setGenMessage('');
    try {
      const res = await fetch('/api/fees/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month: genMonth, year: genYear }),
      });
      const data = await res.json();
      setGenMessage(data.message || 'Done');
      fetchData();
    } catch {
      setGenMessage('Failed to generate expected payments');
    } finally {
      setGenerating(false);
      setTimeout(() => setGenMessage(''), 4000);
    }
  };

  const submitAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/fees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: addStudentId,
          amount: Number(addAmount),
          payment_date: new Date(addDate).toISOString(),
          payment_type: addType,
          period_start: addPeriodStr || undefined,
          status: addStatus,
          notes: addNotes || undefined
        }),
      });
      if (res.ok) {
        setShowAddModal(false);
        // Reset form
        setAddStudentId('');
        setAddAmount('');
        setAddNotes('');
        fetchData();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to submit payment');
      }
    } catch {
      alert('Network error');
    } finally {
      setSubmitting(false);
    }
  };

  const fmt = (n: number) => '₹' + n.toLocaleString('en-IN');

  return (
    <div>
      <div className="page-header page-header-with-action">
        <div>
          <h2 className="page-title">Fee Payments</h2>
          <p className="page-subtitle">Track and manage student fee schedules and transactions</p>
        </div>
        <button className="btn-primary" onClick={() => setShowAddModal(true)}>
          Add Payment
        </button>
      </div>

      {/* Generation Bar */}
      <div className="filter-bar" style={{ backgroundColor: '#f1f5f9', borderRadius: '8px', padding: '12px', marginBottom: '24px', display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <span style={{ fontWeight: 500, color: '#334155' }}>Auto-Generate Expected Records:</span>
        <select value={genMonth} onChange={e => setGenMonth(Number(e.target.value))} className="table-select">
          {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
        </select>
        <select value={genYear} onChange={e => setGenYear(Number(e.target.value))} className="table-select">
          {[2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <button className="btn-secondary" onClick={handleGenerate} disabled={generating} style={{ padding: '6px 16px' }}>
          {generating ? 'Processing...' : 'Generate Now'}
        </button>
        {genMessage && <span style={{ marginLeft: '10px', fontSize: '14px', color: '#10b981' }}>{genMessage}</span>}
      </div>

      {/* Stats */}
      <div className="stat-grid stat-grid-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)
        ) : (
          <>
            <StatCard title="Total Revenue" value={fmt(totals.total)} color="blue" subtitle="Across filtered records"
              icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>}
            />
            <StatCard title="Collected" value={fmt(totals.paid)} color="emerald" subtitle={`${payments.filter(p => p.status === 'Paid').length} records paid`}
              icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>}
            />
            <StatCard title="Pending" value={fmt(totals.pending)} color="rose" subtitle={`${payments.filter(p => p.status !== 'Paid').length} records pending`}
              icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" /></svg>}
            />
          </>
        )}
      </div>

      {/* Filters */}
      <div className="filter-bar">
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="table-select">
          <option value="all">All Payment Types</option>
          {PAYMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={centreFilter} onChange={e => setCentreFilter(e.target.value)} className="table-select">
          <option value="all">All Centres</option>
          {CENTRES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={instrumentFilter} onChange={e => setInstrumentFilter(e.target.value)} className="table-select">
          <option value="all">All Instruments</option>
          {INSTRUMENTS.map(i => <option key={i} value={i}>{i}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="table-select">
          <option value="all">All Status</option>
          {PAYMENT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
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
                <th>Type</th>
                <th>Period/Date</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <TableSkeleton rows={10} columns={6} />
              ) : payments.length === 0 ? (
                <tr><td colSpan={6} className="table-empty">No payment records found matching criteria.</td></tr>
              ) : (
                payments.map(p => (
                  <tr key={p.id}>
                    <td>
                      <div className="table-cell-name">{p.student_name}</div>
                      <div className="table-cell-mono" style={{ fontSize: '12px', color: '#64748b' }}>{p.payment_plan}</div>
                    </td>
                    <td>
                      <select
                        value={p.payment_type}
                        onChange={e => handleUpdate(p.id, { payment_type: e.target.value as PaymentType })}
                        className="inline-status-select"
                      >
                        {PAYMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </td>
                    <td>{p.period_start || new Date(p.payment_date).toLocaleDateString()}</td>
                    <td className="table-cell-mono">₹{p.amount.toLocaleString('en-IN')}</td>
                    <td>
                      <select
                        value={p.status}
                        onChange={e => handleUpdate(p.id, { status: e.target.value as PaymentStatus })}
                        className={`inline-status-select status-${p.status.toLowerCase()}`}
                      >
                        {PAYMENT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td>
                      <button 
                        className="p-1 rounded hover:bg-rose-100 text-rose-500 transition-colors"
                        onClick={() => setDeleteId(p.id)}
                        title="Delete Fee Record"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="modal-overlay" onClick={() => setDeleteId(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ color: '#e11d48' }}>Permanently Delete Fee Record?</h3>
            </div>
            <div style={{ padding: '1rem' }}>
              <p style={{ marginBottom: '1rem' }}>Are you sure? This action cannot be undone.</p>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                <button onClick={() => setDeleteId(null)} className="btn-secondary" disabled={isDeleting}>Cancel</button>
                <button onClick={confirmDelete} className="btn-primary" style={{ backgroundColor: '#e11d48', borderColor: '#e11d48' }} disabled={isDeleting}>
                  {isDeleting ? 'Deleting...' : 'Delete Record'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Payment Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => !submitting && setShowAddModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Record New Payment</h3>
              <button onClick={() => setShowAddModal(false)} className="modal-close" disabled={submitting}>✕</button>
            </div>
            <form onSubmit={submitAddPayment} style={{ padding: '20px' }} className="student-form">
              <div className="form-group">
                <label className="form-label">Select Student *</label>
                <select value={addStudentId} onChange={e => setAddStudentId(e.target.value)} required className="form-select">
                  <option value="" disabled>-- Choose a Student --</option>
                  {students.filter(s => s.status === 'active').map(s => (
                     <option key={s.id} value={s.id}>{s.name} ({s.payment_plan})</option>
                  ))}
                </select>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Payment Type *</label>
                  <select value={addType} onChange={e => setAddType(e.target.value as PaymentType)} className="form-select">
                    {PAYMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Amount (₹) *</label>
                  <input type="number" value={addAmount} onChange={e => setAddAmount(e.target.value)} required min={0} className="form-input" />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Transaction Date *</label>
                  <input type="date" value={addDate} onChange={e => setAddDate(e.target.value)} required className="form-input" />
                </div>
                <div className="form-group">
                  <label className="form-label">Associated Period (Optional)</label>
                  <input type="text" value={addPeriodStr} onChange={e => setAddPeriodStr(e.target.value)} placeholder="e.g. 2026-03" className="form-input" />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Initial Status</label>
                <select value={addStatus} onChange={e => setAddStatus(e.target.value as PaymentStatus)} className="form-select">
                  {PAYMENT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Notes</label>
                <input type="text" value={addNotes} onChange={e => setAddNotes(e.target.value)} placeholder="e.g. Advance payment" className="form-input" />
              </div>

              <div className="form-actions" style={{ marginTop: '24px' }}>
                <button type="button" onClick={() => setShowAddModal(false)} className="btn-secondary" disabled={submitting}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={submitting}>{submitting ? 'Saving...' : 'Record Payment'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
