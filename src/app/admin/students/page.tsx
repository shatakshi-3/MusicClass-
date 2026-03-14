'use client';

import { useEffect, useState, useCallback } from 'react';
import StudentTable from '@/components/StudentTable';
import StudentForm from '@/components/StudentForm';
import type { Student } from '@/lib/types';

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

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

  return (
    <div>
      <div className="page-header page-header-with-action">
        <div>
          <h2 className="page-title">Students</h2>
          <p className="page-subtitle">Manage all enrolled students</p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(true)}>
          + Add Student
        </button>
      </div>

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
