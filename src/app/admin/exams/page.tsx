'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import FeeStatusBadge from '@/components/FeeStatusBadge';
import StatCard from '@/components/StatCard';
import { CardSkeleton, TableSkeleton } from '@/components/LoadingSkeleton';
import type { Student, Centre, ExamPaymentStatus, ExamYear } from '@/lib/types';
import { CENTRES, EXAM_YEARS } from '@/lib/types';

interface ExamRow {
  id: string;
  student_id: string;
  student_name: string;
  student_phone: string;
  student_instrument: string;
  exam_year: ExamYear;
  centre: Centre;
  exam_fee: number;
  payment_status: ExamPaymentStatus;
  created_at: string;
}

type SortKey = 'student_name' | 'exam_year' | 'centre' | 'exam_fee' | 'payment_status' | 'created_at';
type SortDir = 'asc' | 'desc';

export default function ExamsPage() {
  const [registrations, setRegistrations] = useState<ExamRow[]>([]);
  const [totals, setTotals] = useState({ total: 0, paid: 0 });
  const [loading, setLoading] = useState(true);
  const [yearFilter, setYearFilter] = useState('all');
  const [centreFilter, setCentreFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortKey, setSortKey] = useState<SortKey>('created_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [showForm, setShowForm] = useState(false);

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchRegistrations = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (centreFilter !== 'all') params.set('centre', centreFilter);
    if (statusFilter !== 'all') params.set('payment_status', statusFilter);

    fetch(`/api/exams/registrations?${params}`)
      .then(r => r.json())
      .then(data => {
        setRegistrations(data.registrations || []);
        setTotals({ total: data.totalFees || 0, paid: data.paidFees || 0 });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [centreFilter, statusFilter]);

  useEffect(() => { fetchRegistrations(); }, [fetchRegistrations]);

  const filtered = useMemo(() => {
    let result = [...registrations];
    if (yearFilter !== 'all') result = result.filter(r => r.exam_year === Number(yearFilter));

    result.sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
      }
      return 0;
    });

    return result;
  }, [registrations, yearFilter, sortKey, sortDir]);

  const handleSort = useCallback((key: SortKey) => {
    setSortKey(prev => {
      if (prev === key) {
        setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
        return prev;
      }
      setSortDir('asc');
      return key;
    });
  }, []);

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortKey !== column) return <span className="sort-icon sort-icon-inactive">↕</span>;
    return <span className="sort-icon">{sortDir === 'asc' ? '↑' : '↓'}</span>;
  };

  const handleStatusChange = async (id: string, payment_status: ExamPaymentStatus) => {
    await fetch(`/api/exams/registrations/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payment_status }),
    });
    fetchRegistrations();
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/exams/registrations/${deleteId}`, { method: 'DELETE' });
      if (res.ok) {
        setDeleteId(null);
        fetchRegistrations();
      } else {
        alert('Failed to delete registration');
      }
    } catch {
      alert('Network error while deleting');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRegister = async (data: { student_id: string; exam_year: ExamYear; centre: Centre }) => {
    const res = await fetch('/api/exams/registrations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Failed to register');
    setShowForm(false);
    fetchRegistrations();
  };

  const fmt = (n: number) => '₹' + n.toLocaleString('en-IN');

  return (
    <div>
      <div className="page-header page-header-with-action">
        <div>
          <h2 className="page-title">Exam Management</h2>
          <p className="page-subtitle">Register students and manage exam fees</p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(true)}>
          + Register Student
        </button>
      </div>

      {/* Stats */}
      <div className="stat-grid stat-grid-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)
        ) : (
          <>
            <StatCard title="Total Registrations" value={filtered.length} color="blue" subtitle="All exam registrations"
              icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8"><path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5" /></svg>}
            />
            <StatCard title="Fees Collected" value={fmt(totals.paid)} color="emerald" subtitle={`${filtered.filter(r => r.payment_status === 'Paid').length} paid`}
              icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>}
            />
            <StatCard title="Fees Pending" value={fmt(totals.total - totals.paid)} color="rose" subtitle={`${filtered.filter(r => r.payment_status === 'Pending').length} pending`}
              icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" /></svg>}
            />
          </>
        )}
      </div>

      {/* Filters */}
      <div className="filter-bar">
        <select value={yearFilter} onChange={e => setYearFilter(e.target.value)} className="table-select">
          <option value="all">All Years</option>
          {EXAM_YEARS.map(y => <option key={y} value={y}>Year {y}</option>)}
        </select>
        <select value={centreFilter} onChange={e => setCentreFilter(e.target.value)} className="table-select">
          <option value="all">All Centres</option>
          {CENTRES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="table-select">
          <option value="all">All Status</option>
          <option value="Paid">Paid</option>
          <option value="Pending">Pending</option>
        </select>
      </div>

      {/* Table */}
      <div className="student-table-wrapper">
        <div className="table-meta">
          <span className="table-count">{filtered.length} registration{filtered.length !== 1 ? 's' : ''}</span>
        </div>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th onClick={() => handleSort('student_name')} className="sortable-th">Student <SortIcon column="student_name" /></th>
                <th>Phone</th>
                <th onClick={() => handleSort('exam_year')} className="sortable-th">Exam Year <SortIcon column="exam_year" /></th>
                <th onClick={() => handleSort('centre')} className="sortable-th">Centre <SortIcon column="centre" /></th>
                <th onClick={() => handleSort('exam_fee')} className="sortable-th">Exam Fee <SortIcon column="exam_fee" /></th>
                <th onClick={() => handleSort('payment_status')} className="sortable-th">Status <SortIcon column="payment_status" /></th>
                <th onClick={() => handleSort('created_at')} className="sortable-th">Date <SortIcon column="created_at" /></th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <TableSkeleton rows={10} columns={8} />
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="table-empty">No exam registrations found. Click &quot;Register Student&quot; to add one.</td></tr>
              ) : (
                filtered.map(r => (
                  <tr key={r.id}>
                    <td className="table-cell-name">{r.student_name}</td>
                    <td className="table-cell-mono">{r.student_phone}</td>
                    <td>Year {r.exam_year}</td>
                    <td>
                      <span className={`centre-badge ${r.centre === 'Prayag Sangeet Samiti' ? 'centre-badge-a' : 'centre-badge-b'}`}>
                        {r.centre}
                      </span>
                    </td>
                    <td className="table-cell-mono">₹{r.exam_fee.toLocaleString('en-IN')}</td>
                    <td>
                      <select
                        value={r.payment_status}
                        onChange={e => handleStatusChange(r.id, e.target.value as ExamPaymentStatus)}
                        className={`inline-status-select status-${r.payment_status.toLowerCase()}`}
                      >
                        <option value="Paid">Paid</option>
                        <option value="Pending">Pending</option>
                      </select>
                    </td>
                    <td className="table-cell-timing">{new Date(r.created_at).toLocaleDateString('en-IN')}</td>
                    <td>
                      <button
                        className="p-1 rounded hover:bg-rose-100 text-rose-500 transition-colors"
                        onClick={() => setDeleteId(r.id)}
                        title="Delete Exam Registration"
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

      {showForm && (
        <ExamRegistrationForm
          onSave={handleRegister}
          onCancel={() => setShowForm(false)}
        />
      )}

      {deleteId && (
        <div className="modal-overlay" onClick={() => setDeleteId(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ color: '#e11d48' }}>Permanently Delete Exam Registration?</h3>
            </div>
            <div style={{ padding: '1rem' }}>
              <p style={{ marginBottom: '1rem' }}>Are you sure? This action cannot be undone.</p>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                <button onClick={() => setDeleteId(null)} className="btn-secondary" disabled={isDeleting}>Cancel</button>
                <button onClick={confirmDelete} className="btn-primary" style={{ backgroundColor: '#e11d48', borderColor: '#e11d48' }} disabled={isDeleting}>
                  {isDeleting ? 'Deleting...' : 'Delete Registration'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ========================
// EXAM REGISTRATION MODAL FORM
// ========================

function ExamRegistrationForm({
  onSave,
  onCancel,
}: {
  onSave: (data: { student_id: string; exam_year: ExamYear; centre: Centre }) => Promise<void>;
  onCancel: () => void;
}) {
  const [students, setStudents] = useState<Student[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [examYear, setExamYear] = useState<ExamYear>(1);
  const [centre, setCentre] = useState<Centre>('Prayag Sangeet Samiti');
  const [examFee, setExamFee] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/students?status=active')
      .then(r => r.json())
      .then(data => {
        setStudents(data.students || []);
        setLoadingStudents(false);
      })
      .catch(() => setLoadingStudents(false));
  }, []);

  // Fetch exam fee when year changes
  useEffect(() => {
    fetch('/api/exams/structure')
      .then(r => r.json())
      .then(data => {
        const match = (data.structure || []).find((s: { exam_year: number }) => s.exam_year === examYear);
        setExamFee(match?.exam_fee ?? null);
      });
  }, [examYear]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filteredStudents = useMemo(() => {
    if (!studentSearch) return students;
    const q = studentSearch.toLowerCase();
    return students.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.phone.includes(q)
    );
  }, [students, studentSearch]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) {
      setError('Please select a student');
      return;
    }
    setError('');
    setSaving(true);
    try {
      await onSave({
        student_id: selectedStudent.id,
        exam_year: examYear,
        centre,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to register');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Register Student for Exam</h3>
          <button onClick={onCancel} className="modal-close">✕</button>
        </div>

        {error && <div className="form-error">{error}</div>}

        <form onSubmit={handleSubmit} className="student-form">
          {/* Student Search Dropdown */}
          <div className="form-group" ref={dropdownRef}>
            <label className="form-label">Select Student *</label>
            {selectedStudent ? (
              <div className="selected-student-chip">
                <span>{selectedStudent.name} ({selectedStudent.phone})</span>
                <button type="button" onClick={() => { setSelectedStudent(null); setStudentSearch(''); }} className="chip-remove">✕</button>
              </div>
            ) : (
              <div className="student-search-wrapper">
                <input
                  type="text"
                  value={studentSearch}
                  onChange={e => { setStudentSearch(e.target.value); setShowDropdown(true); }}
                  onFocus={() => setShowDropdown(true)}
                  className="form-input"
                  placeholder={loadingStudents ? 'Loading students...' : 'Search by name or phone...'}
                  disabled={loadingStudents}
                />
                {showDropdown && filteredStudents.length > 0 && (
                  <div className="student-dropdown">
                    {filteredStudents.slice(0, 10).map(s => (
                      <div
                        key={s.id}
                        className="student-dropdown-item"
                        onClick={() => {
                          setSelectedStudent(s);
                          setCentre(s.centre);
                          setShowDropdown(false);
                          setStudentSearch('');
                        }}
                      >
                        <span className="dropdown-student-name">{s.name}</span>
                        <span className="dropdown-student-meta">{s.phone} · {s.instrument}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Exam Year *</label>
              <select
                value={examYear}
                onChange={e => setExamYear(Number(e.target.value) as ExamYear)}
                className="form-select"
              >
                {EXAM_YEARS.map(y => <option key={y} value={y}>Year {y}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Centre *</label>
              <select
                value={centre}
                onChange={e => setCentre(e.target.value as Centre)}
                className="form-select"
              >
                {CENTRES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {examFee !== null && (
            <div className="form-group">
              <label className="form-label">Exam Fee (auto-filled)</label>
              <div className="fee-display">₹{examFee.toLocaleString('en-IN')}</div>
            </div>
          )}

          <div className="form-actions">
            <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving || !selectedStudent} className="btn-primary">
              {saving ? 'Registering...' : 'Register for Exam'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
