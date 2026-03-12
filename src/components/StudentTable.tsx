'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import FeeStatusBadge from './FeeStatusBadge';
import { TableSkeleton } from './LoadingSkeleton';
import type { Student } from '@/lib/mockData';

interface StudentTableProps {
  students: Student[];
  loading: boolean;
  showFeeFilter?: boolean;
}

type SortKey = keyof Student;
type SortDir = 'asc' | 'desc';

const PAGE_SIZE = 15;

export default function StudentTable({ students, loading, showFeeFilter = false }: StudentTableProps) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [centreFilter, setCentreFilter] = useState<string>('all');
  const [feeFilter, setFeeFilter] = useState<string>('all');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [page, setPage] = useState(1);
  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce search input
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

  // Filter and sort
  const filtered = useMemo(() => {
    let result = [...students];

    // Search by name or phone
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.phone.includes(q)
      );
    }

    // Filter by centre
    if (centreFilter !== 'all') {
      result = result.filter((s) => s.examCentre === centreFilter);
    }

    // Filter by fee status
    if (feeFilter !== 'all') {
      result = result.filter((s) => s.feeStatus === feeFilter);
    }

    // Sort
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
  }, [students, debouncedSearch, centreFilter, feeFilter, sortKey, sortDir]);

  // Pagination
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  const handleSort = useCallback((key: SortKey) => {
    setSortKey((prev) => {
      if (prev === key) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
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

  return (
    <div className="student-table-wrapper">
      {/* Filters */}
      <div className="table-filters">
        <div className="table-search">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 search-icon">
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <input
            type="text"
            placeholder="Search by name or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="table-search-input"
          />
        </div>
        <div className="table-filter-group">
          <select
            value={centreFilter}
            onChange={(e) => { setCentreFilter(e.target.value); setPage(1); }}
            className="table-select"
          >
            <option value="all">All Centres</option>
            <option value="Centre A">Centre A</option>
            <option value="Centre B">Centre B</option>
          </select>
          {showFeeFilter && (
            <select
              value={feeFilter}
              onChange={(e) => { setFeeFilter(e.target.value); setPage(1); }}
              className="table-select"
            >
              <option value="all">All Fee Status</option>
              <option value="Paid">Paid</option>
              <option value="Due">Due</option>
            </select>
          )}
        </div>
      </div>

      {/* Results count */}
      <div className="table-meta">
        <span className="table-count">
          {filtered.length} student{filtered.length !== 1 ? 's' : ''} found
        </span>
      </div>

      {/* Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('name')} className="sortable-th">
                Name <SortIcon column="name" />
              </th>
              <th onClick={() => handleSort('phone')} className="sortable-th">
                Phone <SortIcon column="phone" />
              </th>
              <th onClick={() => handleSort('age')} className="sortable-th">
                Age <SortIcon column="age" />
              </th>
              <th>Parent</th>
              <th onClick={() => handleSort('course')} className="sortable-th">
                Course <SortIcon column="course" />
              </th>
              <th>Timing</th>
              <th onClick={() => handleSort('examCentre')} className="sortable-th">
                Centre <SortIcon column="examCentre" />
              </th>
              <th onClick={() => handleSort('feeStatus')} className="sortable-th">
                Fee Status <SortIcon column="feeStatus" />
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <TableSkeleton rows={10} columns={8} />
            ) : paginated.length === 0 ? (
              <tr>
                <td colSpan={8} className="table-empty">
                  No students found
                </td>
              </tr>
            ) : (
              paginated.map((student) => (
                <tr
                  key={student.id}
                  onClick={() => router.push(`/admin/students/${student.phone}`)}
                  className="table-row-clickable"
                >
                  <td className="table-cell-name">{student.name}</td>
                  <td className="table-cell-mono">{student.phone}</td>
                  <td>{student.age}</td>
                  <td>{student.parentName}</td>
                  <td>{student.course}</td>
                  <td className="table-cell-timing">{student.classTiming}</td>
                  <td>
                    <span className={`centre-badge ${student.examCentre === 'Centre A' ? 'centre-badge-a' : 'centre-badge-b'}`}>
                      {student.examCentre}
                    </span>
                  </td>
                  <td><FeeStatusBadge status={student.feeStatus} /></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="table-pagination">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="pagination-btn"
          >
            ← Previous
          </button>
          <div className="pagination-pages">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`pagination-page ${p === page ? 'pagination-page-active' : ''}`}
              >
                {p}
              </button>
            ))}
          </div>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="pagination-btn"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
