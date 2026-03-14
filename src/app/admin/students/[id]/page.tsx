'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import FeeStatusBadge from '@/components/FeeStatusBadge';
import StudentForm from '@/components/StudentForm';
import { ProfileSkeleton } from '@/components/LoadingSkeleton';
import type { Student, MonthlyFeePayment, ExamRegistration, Instrument, Centre, PaymentStatus } from '@/lib/types';

interface PaymentRow extends MonthlyFeePayment {
  student_name: string;
  student_phone: string;
  student_instrument: Instrument;
  student_centre: Centre;
}

interface ExamRow extends ExamRegistration {
  student_name: string;
  student_phone: string;
  student_instrument: Instrument;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function StudentProfilePage() {
  const params = useParams();
  const router = useRouter();
  const studentId = params.id as string;

  const [student, setStudent] = useState<Student | null>(null);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [exams, setExams] = useState<ExamRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [deactivating, setDeactivating] = useState(false);

  const fetchStudent = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetch(`/api/students/${studentId}`).then(r => r.json()),
      fetch('/api/fees/monthly').then(r => r.json()),
      fetch('/api/exams/registrations').then(r => r.json()),
    ]).then(([studentData, feeData, examData]) => {
      setStudent(studentData.student || null);
      setPayments((feeData.payments || []).filter((p: PaymentRow) => p.student_id === studentId));
      setExams((examData.registrations || []).filter((e: ExamRow) => e.student_id === studentId));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [studentId]);

  useEffect(() => { fetchStudent(); }, [fetchStudent]);

  const handleEdit = async (data: Partial<Student>) => {
    const res = await fetch(`/api/students/${studentId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Failed to update');
    setShowEdit(false);
    fetchStudent();
  };

  const handleDeactivate = async () => {
    if (!confirm('Are you sure you want to deactivate this student?')) return;
    setDeactivating(true);
    try {
      await fetch(`/api/students/${studentId}`, { method: 'DELETE' });
      router.push('/admin/students');
    } catch {
      setDeactivating(false);
    }
  };

  const handlePaymentUpdate = async (paymentId: string, status: PaymentStatus) => {
    await fetch(`/api/fees/monthly/${paymentId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    fetchStudent();
  };

  if (loading) {
    return (
      <div>
        <div className="page-header"><h2 className="page-title">Student Profile</h2></div>
        <ProfileSkeleton />
      </div>
    );
  }

  if (!student) {
    return (
      <div>
        <div className="page-header"><h2 className="page-title">Student Not Found</h2></div>
        <button onClick={() => router.back()} className="btn-secondary">← Go Back</button>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div className="profile-header-top">
          <button onClick={() => router.back()} className="btn-back">← Back</button>
          <div className="profile-header-actions">
            <button onClick={() => setShowEdit(true)} className="btn-secondary">Edit</button>
            {student.status === 'active' && (
              <button onClick={handleDeactivate} disabled={deactivating} className="btn-danger">
                {deactivating ? 'Deactivating...' : 'Deactivate'}
              </button>
            )}
          </div>
        </div>
        <h2 className="page-title">{student.name}</h2>
        <p className="page-subtitle">
          <FeeStatusBadge status={student.status === 'active' ? 'Active' : 'Inactive'} />
        </p>
      </div>

      <div className="profile-grid">
        {/* Student Details */}
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
              <span className="profile-label">Parent/Guardian</span>
              <span className="profile-value">{student.parents_name}</span>
            </div>
            <div className="profile-detail">
              <span className="profile-label">Instrument</span>
              <span className="profile-value">{student.instrument}</span>
            </div>
            <div className="profile-detail">
              <span className="profile-label">Centre</span>
              <span className="profile-value">
                <span className={`centre-badge ${student.centre === 'Centre A' ? 'centre-badge-a' : 'centre-badge-b'}`}>
                  {student.centre}
                </span>
              </span>
            </div>
            <div className="profile-detail">
              <span className="profile-label">Class Timing</span>
              <span className="profile-value">{student.class_timing}</span>
            </div>
            <div className="profile-detail">
              <span className="profile-label">Enrolled On</span>
              <span className="profile-value">{new Date(student.created_at).toLocaleDateString('en-IN')}</span>
            </div>
          </div>
        </div>

        {/* Monthly Fees */}
        <div className="profile-card">
          <h3 className="profile-card-title">Monthly Fee History</h3>
          {payments.length === 0 ? (
            <p className="empty-text">No payment records yet</p>
          ) : (
            <div className="table-container">
              <table className="data-table compact-table">
                <thead>
                  <tr>
                    <th>Month</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {payments
                    .sort((a, b) => b.year - a.year || b.month - a.month)
                    .map(p => (
                      <tr key={p.id}>
                        <td>{MONTHS[p.month - 1]} {p.year}</td>
                        <td className="table-cell-mono">₹{p.amount.toLocaleString('en-IN')}</td>
                        <td>
                          <select
                            value={p.status}
                            onChange={e => handlePaymentUpdate(p.id, e.target.value as PaymentStatus)}
                            className={`inline-status-select status-${p.status.toLowerCase()}`}
                          >
                            <option value="Paid">Paid</option>
                            <option value="Pending">Pending</option>
                            <option value="Late">Late</option>
                            <option value="Waived">Waived</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Exam Registrations */}
      <div className="profile-card" style={{ marginTop: '20px' }}>
        <h3 className="profile-card-title">Exam Registrations</h3>
        {exams.length === 0 ? (
          <p className="empty-text">Not registered for any exams</p>
        ) : (
          <div className="table-container">
            <table className="data-table compact-table">
              <thead>
                <tr>
                  <th>Exam Year</th>
                  <th>Centre</th>
                  <th>Fee</th>
                  <th>Payment</th>
                </tr>
              </thead>
              <tbody>
                {exams.map(e => (
                  <tr key={e.id}>
                    <td>Year {e.exam_year}</td>
                    <td>
                      <span className={`centre-badge ${e.centre === 'Centre A' ? 'centre-badge-a' : 'centre-badge-b'}`}>
                        {e.centre}
                      </span>
                    </td>
                    <td className="table-cell-mono">₹{e.exam_fee.toLocaleString('en-IN')}</td>
                    <td><FeeStatusBadge status={e.payment_status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showEdit && (
        <StudentForm
          student={student}
          mode="edit"
          onSave={handleEdit}
          onCancel={() => setShowEdit(false)}
        />
      )}
    </div>
  );
}
