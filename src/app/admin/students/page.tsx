'use client';

import { useEffect, useState } from 'react';
import StudentTable from '@/components/StudentTable';
import type { Student } from '@/lib/mockData';

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/students')
      .then((res) => res.json())
      .then((data) => {
        setStudents(data.students || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">Students</h2>
        <p className="page-subtitle">Manage all enrolled students</p>
      </div>
      <StudentTable students={students} loading={loading} showFeeFilter={true} />
    </div>
  );
}
