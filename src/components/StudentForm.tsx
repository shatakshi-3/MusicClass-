'use client';

import { useState } from 'react';
import type { Student, Instrument, Centre, StudentType, ExamYear } from '@/lib/types';
import { INSTRUMENTS, CENTRES, EXAM_YEARS, MONTHLY_FEE, EXAM_FEE_MAP } from '@/lib/types';

interface StudentFormProps {
  student?: Student;
  onSave: (data: Partial<Student>) => Promise<void>;
  onCancel: () => void;
  mode: 'create' | 'edit';
}

const CLASS_TIMINGS = [
  'Mon/Wed 4:00 PM', 'Mon/Wed 5:00 PM', 'Tue/Thu 4:00 PM', 'Tue/Thu 5:00 PM',
  'Tue/Thu 6:00 PM', 'Fri 4:00 PM', 'Sat 10:00 AM', 'Sat 11:00 AM',
  'Sat 2:00 PM', 'Sun 10:00 AM', 'Sun 11:00 AM',
];

export default function StudentForm({ student, onSave, onCancel, mode }: StudentFormProps) {
  const [name, setName] = useState(student?.name || '');
  const [phone, setPhone] = useState(student?.phone || '');
  const [age, setAge] = useState(student?.age?.toString() || '');
  const [parents_name, setParentsName] = useState(student?.parents_name || '');
  const [instrument, setInstrument] = useState<Instrument>(student?.instrument || 'Vocal');
  const [centre, setCentre] = useState<Centre>(student?.centre || 'Prayag Sangeet Samiti');
  const [class_timing, setClassTiming] = useState(student?.class_timing || CLASS_TIMINGS[0]);
  const [student_type, setStudentType] = useState<StudentType>(student?.student_type || 'MONTHLY');
  const [exam_year, setExamYear] = useState<ExamYear>((student?.exam_year as ExamYear) || 1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      await onSave({
        name: name.trim(),
        phone: phone.trim(),
        age: parseInt(age),
        parents_name: parents_name.trim(),
        instrument,
        centre,
        class_timing,
        student_type,
        exam_year: student_type === 'EXAM' ? exam_year : undefined,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">{mode === 'create' ? 'Add New Student' : 'Edit Student'}</h3>
          <button onClick={onCancel} className="modal-close">✕</button>
        </div>

        {error && <div className="form-error">{error}</div>}

        <form onSubmit={handleSubmit} className="student-form">
          {/* Student Type Selector */}
          <div className="form-group">
            <label className="form-label">Student Type *</label>
            <div className="student-type-selector">
              <button
                type="button"
                className={`student-type-option ${student_type === 'MONTHLY' ? 'student-type-active' : ''}`}
                onClick={() => setStudentType('MONTHLY')}
              >
                📅 Monthly Student
              </button>
              <button
                type="button"
                className={`student-type-option ${student_type === 'EXAM' ? 'student-type-active' : ''}`}
                onClick={() => setStudentType('EXAM')}
              >
                📝 Exam Student
              </button>
            </div>
          </div>

          {/* Fee Info */}
          {student_type === 'MONTHLY' ? (
            <div className="fee-info-card fee-info-monthly">
              <span className="fee-info-label">Monthly Fee</span>
              <span className="fee-info-amount">₹{MONTHLY_FEE.toLocaleString('en-IN')}</span>
            </div>
          ) : (
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Exam Year *</label>
                <select
                  value={exam_year}
                  onChange={e => setExamYear(Number(e.target.value) as ExamYear)}
                  className="form-select"
                >
                  {EXAM_YEARS.map(y => (<option key={y} value={y}>Year {y}</option>))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Yearly Fee (auto)</label>
                <div className="fee-info-card fee-info-exam" style={{ padding: '9px 14px' }}>
                  <span className="fee-info-label">Total</span>
                  <span className="fee-info-amount" style={{ fontSize: '16px' }}>
                    ₹{EXAM_FEE_MAP[exam_year].toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Full Name *</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="form-input"
                placeholder="Student name"
                required
                minLength={2}
                maxLength={100}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Phone Number *</label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                className="form-input"
                placeholder="10-digit number"
                required
                pattern="\d{10}"
                disabled={mode === 'edit'}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Age *</label>
              <input
                type="number"
                value={age}
                onChange={e => setAge(e.target.value)}
                className="form-input"
                min={3}
                max={80}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Parent/Guardian Name *</label>
              <input
                type="text"
                value={parents_name}
                onChange={e => setParentsName(e.target.value)}
                className="form-input"
                placeholder="Parent name"
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Subject *</label>
              <select
                value={instrument}
                onChange={e => setInstrument(e.target.value as Instrument)}
                className="form-select"
              >
                {INSTRUMENTS.map(i => (
                  <option key={i} value={i}>{i}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Centre *</label>
              <select
                value={centre}
                onChange={e => setCentre(e.target.value as Centre)}
                className="form-select"
              >
                {CENTRES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Class Timing *</label>
            <select
              value={class_timing}
              onChange={e => setClassTiming(e.target.value)}
              className="form-select"
            >
              {CLASS_TIMINGS.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div className="form-actions">
            <button type="button" onClick={onCancel} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Saving...' : mode === 'create' ? 'Add Student' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
