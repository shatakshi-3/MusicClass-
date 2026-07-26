'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import FeeStatusBadge from '@/components/FeeStatusBadge';
import StudentForm from '@/components/StudentForm';
import EditPaymentModal from '@/components/EditPaymentModal';
import type { ExtendedFeePayment } from '@/components/EditPaymentModal';
import { ProfileSkeleton } from '@/components/LoadingSkeleton';
import type { Student, FeePayment, ExamRegistration, Instrument, Centre, PaymentStatus, PaymentLabel, ExamYear } from '@/lib/types';
import { PAYMENT_LABELS, PAYMENT_STATUSES, EXAM_FEE_MAP } from '@/lib/types';

interface PaymentRow extends FeePayment {
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
  const [editPayment, setEditPayment] = useState<PaymentRow | null>(null);

  const fetchStudent = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetch(`/api/students/${studentId}`).then(r => r.json()),
      fetch('/api/fees').then(r => r.json()),
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

  const handlePaymentUpdate = async (paymentId: string, updates: Partial<FeePayment>) => {
    await fetch(`/api/fees/${paymentId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    fetchStudent();
  };

  const handleEditPaymentSave = async (updates: Partial<FeePayment>) => {
    if (!editPayment) return;
    await fetch(`/api/fees/${editPayment.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    setEditPayment(null);
    fetchStudent();
  };

  const handleExamPaymentUpdate = async (examId: string, updates: any) => {
    await fetch(`/api/exams/registrations/${examId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
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
          {' '}
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '3px 10px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: 600,
            background: student.student_type === 'EXAM' ? '#eff6ff' : '#f5f3ff',
            color: student.student_type === 'EXAM' ? '#3b82f6' : '#8b5cf6',
            marginLeft: '6px',
          }}>
            {student.student_type === 'EXAM' ? '📝 Exam Student' : '📅 Monthly Student'}
          </span>
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
              <span className="profile-label">Student Type</span>
              <span className="profile-value">
                {student.student_type === 'EXAM' ? 'Exam Student' : 'Monthly Student'}
                {student.student_type === 'EXAM' && student.exam_year && (
                  <span style={{ color: '#64748b', marginLeft: '8px' }}>
                    (Year {student.exam_year} — ₹{EXAM_FEE_MAP[student.exam_year as ExamYear]?.toLocaleString('en-IN')})
                  </span>
                )}
              </span>
            </div>
            <div className="profile-detail">
              <span className="profile-label">Parent/Guardian</span>
              <span className="profile-value">{student.parents_name}</span>
            </div>
            <div className="profile-detail">
              <span className="profile-label">Subject</span>
              <span className="profile-value">{student.instrument}</span>
            </div>
            <div className="profile-detail">
              <span className="profile-label">Centre</span>
              <span className="profile-value">
                <span className={`centre-badge ${student.centre === 'Prayag Sangeet Samiti' ? 'centre-badge-a' : 'centre-badge-b'}`}>
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

        {/* Fee History */}
        <div className="profile-card">
          <h3 className="profile-card-title">Payment History</h3>
          {payments.length === 0 ? (
            <p className="empty-text">No payment records yet</p>
          ) : (
            <div className="table-container">
              <table className="data-table compact-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Total</th>
                    <th>Paid</th>
                    <th>Remaining</th>
                    <th>Inst.</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {payments
                    .sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime())
                    .map(p => (
                      <tr key={p.id}>
                        <td>{new Date(p.payment_date).toLocaleDateString('en-IN')}</td>
                        <td className="table-cell-mono">₹{Number(p.total_fee).toLocaleString('en-IN')}</td>
                        <td className="table-cell-mono" style={{ color: '#10b981' }}>₹{Number(p.amount_paid).toLocaleString('en-IN')}</td>
                        <td className="table-cell-mono" style={{ color: Number(p.remaining_balance) > 0 ? '#ef4444' : '#10b981' }}>
                          ₹{Number(p.remaining_balance).toLocaleString('en-IN')}
                        </td>
                        <td style={{ textAlign: 'center' }}>{p.installment_number || 1}</td>
                        <td><FeeStatusBadge status={p.status} /></td>
                        <td>
                          <button
                            className="btn-edit-payment"
                            onClick={() => setEditPayment(p)}
                            title="Edit Payment"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                            </svg>
                          </button>
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
                  <th>Total Fee</th>
                  <th>Paid</th>
                  <th>Remaining</th>
                  <th>Installment</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {exams.map(e => (
                  <tr key={e.id}>
                    <td>Year {e.exam_year}</td>
                    <td>
                      <span className={`centre-badge ${e.centre === 'Prayag Sangeet Samiti' ? 'centre-badge-a' : 'centre-badge-b'}`}>
                        {e.centre}
                      </span>
                    </td>
                    <td className="table-cell-mono">₹{Number(e.exam_fee).toLocaleString('en-IN')}</td>
                    <td className="table-cell-mono" style={{ color: '#10b981' }}>₹{Number(e.amount_paid || 0).toLocaleString('en-IN')}</td>
                    <td className="table-cell-mono" style={{ color: Number(e.remaining_balance) > 0 ? '#ef4444' : '#10b981' }}>
                      ₹{Number(e.remaining_balance || 0).toLocaleString('en-IN')}
                    </td>
                    <td style={{ textAlign: 'center' }}>{e.installment_number || 0}</td>
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

      {editPayment && (
        <EditPaymentModal
          payment={{
            ...editPayment,
            student_name: student.name,
            student_type: student.student_type,
            student_exam_year: student.exam_year ? Number(student.exam_year) : undefined,
          } as ExtendedFeePayment}
          onSave={handleEditPaymentSave}
          onCancel={() => setEditPayment(null)}
        />
      )}
    </div>
  );
}
