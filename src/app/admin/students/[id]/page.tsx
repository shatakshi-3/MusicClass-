'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import FeeStatusBadge from '@/components/FeeStatusBadge';
import { ProfileSkeleton } from '@/components/LoadingSkeleton';
import type { Student } from '@/lib/mockData';

export default function StudentProfilePage() {
  const params = useParams();
  const router = useRouter();
  const studentId = params.id as string;

  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  // Editable fields
  const [examCentre, setExamCentre] = useState('');
  const [feeStatus, setFeeStatus] = useState<'Paid' | 'Due'>('Due');
  const [lastFeePaid, setLastFeePaid] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    fetch('/api/students')
      .then((res) => res.json())
      .then((data) => {
        const found = (data.students || []).find((s: Student) => s.phone === studentId);
        if (found) {
          setStudent(found);
          setExamCentre(found.examCentre);
          setFeeStatus(found.feeStatus);
          setLastFeePaid(found.lastFeePaid);
          setNotes(found.notes);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [studentId]);

  const handleSave = async () => {
    if (!student) return;
    setSaving(true);
    setError('');
    setSaved(false);

    try {
      const res = await fetch('/api/student-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: student.phone,
          examCentre,
          feeStatus,
          lastFeePaid,
          notes,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to save');
      } else {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch {
      setError('Network error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div>
        <div className="page-header">
          <h2 className="page-title">Student Profile</h2>
        </div>
        <ProfileSkeleton />
      </div>
    );
  }

  if (!student) {
    return (
      <div>
        <div className="page-header">
          <h2 className="page-title">Student Not Found</h2>
          <p className="page-subtitle">No student found with phone number {studentId}</p>
        </div>
        <button onClick={() => router.back()} className="btn-secondary">← Go Back</button>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div className="profile-header-top">
          <button onClick={() => router.back()} className="btn-back">
            ← Back
          </button>
          <FeeStatusBadge status={student.feeStatus} />
        </div>
        <h2 className="page-title">{student.name}</h2>
        <p className="page-subtitle">Student Profile</p>
      </div>

      <div className="profile-grid">
        {/* Student Details - Read Only */}
        <div className="profile-card">
          <h3 className="profile-card-title">Student Information</h3>
          <div className="profile-details">
            <div className="profile-detail">
              <span className="profile-label">Full Name</span>
              <span className="profile-value">{student.name}</span>
            </div>
            <div className="profile-detail">
              <span className="profile-label">Phone Number</span>
              <span className="profile-value profile-value-mono">{student.phone}</span>
            </div>
            <div className="profile-detail">
              <span className="profile-label">Age</span>
              <span className="profile-value">{student.age} years</span>
            </div>
            <div className="profile-detail">
              <span className="profile-label">Parent Name</span>
              <span className="profile-value">{student.parentName}</span>
            </div>
            <div className="profile-detail">
              <span className="profile-label">Course Interest</span>
              <span className="profile-value">{student.course}</span>
            </div>
            <div className="profile-detail">
              <span className="profile-label">Class Timing</span>
              <span className="profile-value">{student.classTiming}</span>
            </div>
          </div>
        </div>

        {/* Editable Fields */}
        <div className="profile-card">
          <h3 className="profile-card-title">Admin Settings</h3>

          {error && (
            <div className="profile-error">{error}</div>
          )}
          {saved && (
            <div className="profile-success">✓ Changes saved successfully</div>
          )}

          <div className="profile-form">
            <div className="form-group">
              <label className="form-label">Exam Centre</label>
              <select
                value={examCentre}
                onChange={(e) => setExamCentre(e.target.value)}
                className="form-select"
              >
                <option value="Centre A">Centre A</option>
                <option value="Centre B">Centre B</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Fee Status</label>
              <select
                value={feeStatus}
                onChange={(e) => setFeeStatus(e.target.value as 'Paid' | 'Due')}
                className="form-select"
              >
                <option value="Paid">Paid</option>
                <option value="Due">Due</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Last Fee Month Paid</label>
              <input
                type="text"
                value={lastFeePaid}
                onChange={(e) => setLastFeePaid(e.target.value)}
                placeholder="e.g. March 2026"
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes about this student..."
                className="form-textarea"
                rows={4}
                maxLength={500}
              />
              <span className="form-hint">{notes.length}/500 characters</span>
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-primary"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
