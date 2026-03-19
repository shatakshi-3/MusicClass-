'use client';

import { useEffect, useState, useCallback } from 'react';
import StudentTable from '@/components/StudentTable';
import StudentForm from '@/components/StudentForm';
import type { Student } from '@/lib/types';

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');
  const [syncErrors, setSyncErrors] = useState<string[]>([]);

  const fetchStudents = useCallback(() => {
    setLoading(true);
    fetch('/api/students')
      .then(res => res.json())
      .then(data => {
        setStudents(data.students || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => { fetchStudents(); }, [fetchStudents]);

  const handleCreate = async (data: Partial<Student>) => {
    const res = await fetch('/api/students', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Failed to create student');
    setShowForm(false);
    fetchStudents();
  };

  const handleSync = async () => {
    setSyncing(true);
    setSyncMessage('');
    setSyncErrors([]);
    try {
      const res = await fetch('/api/sync', { method: 'POST' });
      const data = await res.json();

      if (!res.ok) {
        if (data.setupRequired) {
          setSyncMessage('⚙️ Google Form not configured. See GOOGLE_FORM_SETUP.md for instructions.');
        } else {
          setSyncMessage('❌ ' + (data.error || 'Sync failed'));
        }
        return;
      }

      if (data.imported > 0) {
        setSyncMessage(`✅ ${data.message}`);
        fetchStudents(); // Refresh the student list
      } else {
        setSyncMessage(`ℹ️ ${data.message}`);
      }

      if (data.errors && data.errors.length > 0) {
        setSyncErrors(data.errors);
      }
    } catch {
      setSyncMessage('❌ Network error. Please try again.');
    } finally {
      setSyncing(false);
      // Auto-clear success messages after 8 seconds
      setTimeout(() => { setSyncMessage(''); setSyncErrors([]); }, 8000);
    }
  };

  return (
    <div>
      <div className="page-header page-header-with-action">
        <div>
          <h2 className="page-title">Students</h2>
          <p className="page-subtitle">Manage all enrolled students</p>
        </div>
        <div className="student-page-actions">
          <button className="btn-sync" onClick={handleSync} disabled={syncing}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182M2.985 19.644l3.181 3.183" />
            </svg>
            {syncing ? 'Syncing...' : 'Sync Google Form'}
          </button>
          <button className="btn-primary" onClick={() => setShowForm(true)}>
            + Add Student
          </button>
        </div>
      </div>

      {syncMessage && (
        <div className={`sync-message ${syncMessage.startsWith('✅') ? 'sync-success' : syncMessage.startsWith('ℹ️') ? 'sync-info' : 'sync-error'}`}>
          <span>{syncMessage}</span>
          {syncErrors.length > 0 && (
            <details className="sync-errors-detail">
              <summary>{syncErrors.length} row error{syncErrors.length > 1 ? 's' : ''}</summary>
              <ul>
                {syncErrors.map((err, i) => <li key={i}>{err}</li>)}
              </ul>
            </details>
          )}
        </div>
      )}

      <StudentTable students={students} loading={loading} />

      {showForm && (
        <StudentForm
          mode="create"
          onSave={handleCreate}
          onCancel={() => setShowForm(false)}
        />
      )}
    </div>
  );
}

