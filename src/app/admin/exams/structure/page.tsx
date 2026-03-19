'use client';

import { useEffect, useState, useCallback } from 'react';
import { TableSkeleton } from '@/components/LoadingSkeleton';
import type { ExamYear } from '@/lib/types';

interface ExamFeeRow {
  id: string;
  exam_year: ExamYear;
  exam_fee: number;
}

export default function ExamStructurePage() {
  const [fees, setFees] = useState<ExamFeeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const fetchFees = useCallback(() => {
    setLoading(true);
    fetch('/api/exams/structure')
      .then(r => r.json())
      .then(data => {
        setFees((data.structure || []).sort((a: ExamFeeRow, b: ExamFeeRow) => a.exam_year - b.exam_year));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => { fetchFees(); }, [fetchFees]);

  const handleEdit = (fee: ExamFeeRow) => {
    setEditingId(fee.id);
    setEditValue(fee.exam_fee.toString());
    setMessage('');
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditValue('');
  };

  const handleSave = async (fee: ExamFeeRow) => {
    const newFee = Number(editValue);
    if (isNaN(newFee) || newFee < 0 || newFee > 100000) {
      setMessage('Please enter a valid fee between ₹0 and ₹1,00,000');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/exams/structure', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: fee.id, exam_fee: newFee }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to update');

      setEditingId(null);
      setEditValue('');
      setMessage(`✅ Year ${fee.exam_year} exam fee updated to ₹${newFee.toLocaleString('en-IN')}`);
      fetchFees();
      setTimeout(() => setMessage(''), 4000);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to update');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">Exam Fee Structure</h2>
        <p className="page-subtitle">Manage exam fees for each year level (1–6)</p>
      </div>

      {message && <div className="alert-info">{message}</div>}

      <div className="student-table-wrapper">
        <div className="table-meta">
          <span className="table-count">{fees.length} exam year{fees.length !== 1 ? 's' : ''}</span>
        </div>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Exam Year</th>
                <th>Exam Fee</th>
                <th style={{ width: '160px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <TableSkeleton rows={6} columns={3} />
              ) : fees.length === 0 ? (
                <tr><td colSpan={3} className="table-empty">No exam fee structures found</td></tr>
              ) : (
                fees.map(fee => (
                  <tr key={fee.id}>
                    <td className="table-cell-name">Year {fee.exam_year}</td>
                    <td>
                      {editingId === fee.id ? (
                        <div className="inline-edit-wrapper">
                          <span className="inline-edit-prefix">₹</span>
                          <input
                            type="number"
                            value={editValue}
                            onChange={e => setEditValue(e.target.value)}
                            className="inline-edit-input"
                            min={0}
                            max={100000}
                            autoFocus
                            onKeyDown={e => {
                              if (e.key === 'Enter') handleSave(fee);
                              if (e.key === 'Escape') handleCancel();
                            }}
                          />
                        </div>
                      ) : (
                        <span className="table-cell-mono">₹{fee.exam_fee.toLocaleString('en-IN')}</span>
                      )}
                    </td>
                    <td>
                      {editingId === fee.id ? (
                        <div className="inline-edit-actions">
                          <button onClick={() => handleSave(fee)} disabled={saving} className="btn-inline-save">
                            {saving ? '...' : 'Save'}
                          </button>
                          <button onClick={handleCancel} className="btn-inline-cancel">Cancel</button>
                        </div>
                      ) : (
                        <button onClick={() => handleEdit(fee)} className="btn-inline-edit">Edit</button>
                      )}
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
