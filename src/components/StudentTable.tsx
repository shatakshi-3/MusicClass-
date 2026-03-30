'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import FeeStatusBadge from './FeeStatusBadge';
import { TableSkeleton } from './LoadingSkeleton';
import type { Student, Instrument } from '@/lib/types';
import { INSTRUMENTS } from '@/lib/types';

interface StudentTableProps {
  students: Student[];
  loading: boolean;
}

type SortKey = 'name' | 'phone' | 'age' | 'instrument' | 'centre' | 'status';
type SortDir = 'asc' | 'desc';

const PAGE_SIZE = 15;

export default function StudentTable({ students, loading }: StudentTableProps) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [centreFilter, setCentreFilter] = useState<string>('all');
  const [instrumentFilter, setInstrumentFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [page, setPage] = useState(1);
  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (searchRef.current) clearTimeout(searchRef.current);
    searchRef.current = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => {
      if (searchRef.current) clearTimeout(searchRef.current);
    };
  }, [search]);

  const filtered = useMemo(() => {
    let result = [...students];

    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      result = result.filter(s =>
        s.name.toLowerCase().includes(q) ||
        s.phone.includes(q) ||
        s.parents_name.toLowerCase().includes(q)
      );
    }
    if (centreFilter !== 'all') result = result.filter(s => s.centre === centreFilter);
    if (instrumentFilter !== 'all') result = result.filter(s => s.instrument === instrumentFilter);
    if (statusFilter !== 'all') result = result.filter(s => s.status === statusFilter);

    result.sort((a, b) => {
      const aVal = a[sortKey] as string | number;
      const bVal = b[sortKey] as string | number;
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
      }
      return 0;
    });

    return result;
  }, [students, debouncedSearch, centreFilter, instrumentFilter, statusFilter, sortKey, sortDir]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

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

  const confirmDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/students/${deleteId}`, { method: 'DELETE' });
      if (res.ok) {
        setDeleteId(null);
        router.refresh();
      } else {
        alert('Failed to delete student');
      }
    } catch {
      alert('Network error while deleting');
    } finally {
      setIsDeleting(false);
    }
  };

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortKey !== column) return <span className="sort-icon sort-icon-inactive">↕</span>;
    return <span className="sort-icon">{sortDir === 'asc' ? '↑' : '↓'}</span>;
  };

  const pageNumbers = useMemo(() => {
    const pages: number[] = [];
    const maxVisible = 5;
    let start = Math.max(1, page - Math.floor(maxVisible / 2));
    const end = Math.min(totalPages, start + maxVisible - 1);
    start = Math.max(1, end - maxVisible + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }, [page, totalPages]);

  return (
    <div className="student-table-wrapper">
      <div className="table-filters">
        <div className="table-search">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 search-icon">
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <input
            type="text"
            placeholder="Search by name, phone, or parent..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="table-search-input"
          />
        </div>
        <div className="table-filter-group">
          <select value={centreFilter} onChange={e => { setCentreFilter(e.target.value); setPage(1); }} className="table-select">
            <option value="all">All Centres</option>
            <option value="Prayag Sangeet Samiti">Prayag Sangeet Samiti</option>
            <option value="Khairagarh University">Khairagarh University</option>
          </select>
          <select value={instrumentFilter} onChange={e => { setInstrumentFilter(e.target.value); setPage(1); }} className="table-select">
            <option value="all">All Instruments</option>
            {INSTRUMENTS.map(i => <option key={i} value={i}>{i}</option>)}
          </select>
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} className="table-select">
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      <div className="table-meta">
        <span className="table-count">{filtered.length} student{filtered.length !== 1 ? 's' : ''} found</span>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('name')} className="sortable-th">Name <SortIcon column="name" /></th>
              <th onClick={() => handleSort('phone')} className="sortable-th">Phone <SortIcon column="phone" /></th>
              <th onClick={() => handleSort('age')} className="sortable-th">Age <SortIcon column="age" /></th>
              <th>Parent</th>
              <th onClick={() => handleSort('instrument')} className="sortable-th">Instrument <SortIcon column="instrument" /></th>
              <th>Timing</th>
              <th onClick={() => handleSort('centre')} className="sortable-th">Centre <SortIcon column="centre" /></th>
              <th onClick={() => handleSort('status')} className="sortable-th">Status <SortIcon column="status" /></th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <TableSkeleton rows={10} columns={9} />
            ) : paginated.length === 0 ? (
              <tr>
                <td colSpan={9} className="table-empty">No students found</td>
              </tr>
            ) : (
              paginated.map(student => (
                <tr key={student.id} onClick={() => router.push(`/admin/students/${student.id}`)} className="table-row-clickable">
                  <td className="table-cell-name">{student.name}</td>
                  <td className="table-cell-mono">{student.phone}</td>
                  <td>{student.age}</td>
                  <td>{student.parents_name}</td>
                  <td>{student.instrument}</td>
                  <td className="table-cell-timing">{student.class_timing}</td>
                  <td>
                    <span className={`centre-badge ${student.centre === 'Prayag Sangeet Samiti' ? 'centre-badge-a' : 'centre-badge-b'}`}>
                      {student.centre}
                    </span>
                  </td>
                  <td><FeeStatusBadge status={student.status === 'active' ? 'Active' : 'Inactive'} /></td>
                  <td onClick={e => e.stopPropagation()}>
                    <button 
                      className="p-1 rounded hover:bg-rose-100 text-rose-500 transition-colors"
                      onClick={() => setDeleteId(student.id)}
                      title="Delete Student"
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

      {totalPages > 1 && (
        <div className="table-pagination">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="pagination-btn">← Previous</button>
          <div className="pagination-pages">
            {pageNumbers.map(p => (
              <button key={p} onClick={() => setPage(p)} className={`pagination-page ${p === page ? 'pagination-page-active' : ''}`}>
                {p}
              </button>
            ))}
          </div>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="pagination-btn">Next →</button>
        </div>
      )}

      {deleteId && (
        <div className="modal-overlay" onClick={() => setDeleteId(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ color: '#e11d48' }}>Permanently Delete Student?</h3>
            </div>
            <div style={{ padding: '1rem' }}>
              <p style={{ marginBottom: '1rem' }}>Are you sure? This action cannot be undone.</p>
              <p style={{ marginBottom: '1rem', fontSize: '0.875rem', fontWeight: 500, color: '#b45309', backgroundColor: '#fffbeb', padding: '0.75rem', borderRadius: '0.375rem', border: '1px solid #fde68a' }}>
                ⚠️ If this student has payment history OR exam records, deleting them will permanently remove all related financial data.
              </p>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                <button onClick={() => setDeleteId(null)} className="btn-secondary" disabled={isDeleting}>Cancel</button>
                <button onClick={confirmDelete} className="btn-primary" style={{ backgroundColor: '#e11d48', borderColor: '#e11d48' }} disabled={isDeleting}>
                  {isDeleting ? 'Deleting...' : 'Delete Student'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
