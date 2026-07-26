'use client';

import React, { useState } from 'react';
import type { FeePayment, PaymentMode, PaymentStatus, StudentType } from '@/lib/types';
import { PAYMENT_MODES } from '@/lib/types';

export interface ExtendedFeePayment extends FeePayment {
  student_name?: string;
  student_type?: StudentType;
  student_exam_year?: number;
}

export interface EditPaymentModalProps {
  payment: ExtendedFeePayment;
  onSave: (updates: Partial<FeePayment>) => Promise<void>;
  onCancel: () => void;
}

export default function EditPaymentModal({ payment, onSave, onCancel }: EditPaymentModalProps) {
  const [newAmount, setNewAmount] = useState<number>(0);
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [paymentMode, setPaymentMode] = useState<PaymentMode | ''>('');
  const [notes, setNotes] = useState<string>('');

  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const newTotalPaid = Number(payment.amount_paid || 0) + Number(newAmount || 0);
  const newRemaining = Math.max(0, Number(payment.total_fee || 0) - newTotalPaid);
  const newInstallment = Number(payment.installment_number || 0) + (newAmount > 0 ? 1 : 0);

  let autoStatus: PaymentStatus = 'Pending';
  if (newRemaining <= 0) {
    autoStatus = 'Paid';
  } else if (newTotalPaid > 0) {
    autoStatus = 'Partially Paid';
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newAmount <= 0) {
      setError('New payment amount must be greater than 0');
      return;
    }

    if (newAmount > Number(payment.remaining_balance)) {
      setError('New payment amount cannot exceed remaining balance');
      return;
    }

    try {
      setIsSaving(true);
      await onSave({
        amount_paid: newTotalPaid,
        remaining_balance: newRemaining,
        installment_number: newInstallment,
        status: autoStatus,
        payment_date: paymentDate,
        payment_mode: paymentMode || undefined,
        notes: notes || undefined,
      });
    } catch (err: any) {
      setError(err?.message || 'Failed to save payment');
    } finally {
      setIsSaving(false);
    }
  };

  const totalFee = Number(payment.total_fee || 0);
  const progressPercentage = totalFee > 0
    ? Math.min(100, Math.max(0, (newTotalPaid / totalFee) * 100))
    : 100;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2 className="modal-title">Edit Payment</h2>
          <button type="button" className="modal-close" onClick={onCancel} disabled={isSaving}>&times;</button>
        </div>

        <div className="payment-summary" style={{ padding: '16px', backgroundColor: '#f9fafb', borderRadius: '8px', marginBottom: '24px', border: '1px solid #e5e7eb' }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '1.1rem', color: '#111827' }}>
            {payment.student_name || 'Unknown Student'}
            {payment.student_type && (
              <span style={{ fontSize: '0.85em', color: '#6b7280', marginLeft: '8px', fontWeight: 'normal' }}>
                ({payment.student_type === 'EXAM' ? 'Exam Student' : 'Monthly Student'})
              </span>
            )}
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '16px', fontSize: '0.9rem', color: '#374151' }}>
            <div>
              <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>Total Fee</div>
              <div style={{ fontWeight: '500' }}>₹{payment.total_fee?.toLocaleString('en-IN')}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>Paid So Far</div>
              <div style={{ fontWeight: '500' }}>₹{payment.amount_paid?.toLocaleString('en-IN')}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>Remaining</div>
              <div style={{ fontWeight: '500' }}>₹{payment.remaining_balance?.toLocaleString('en-IN')}</div>
            </div>
          </div>

          <div style={{ width: '100%', height: '8px', backgroundColor: '#e5e7eb', borderRadius: '4px', overflow: 'hidden' }}>
            <div
              style={{
                width: `${progressPercentage}%`,
                height: '100%',
                backgroundColor: autoStatus === 'Paid' ? '#10b981' : '#f59e0b',
                transition: 'width 0.3s ease, background-color 0.3s ease',
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '0.85rem', color: '#6b7280' }}>
            <span>{progressPercentage.toFixed(0)}% Paid</span>
            <span>Installment: {payment.installment_number || 1} &rarr; {newInstallment}</span>
          </div>
        </div>

        <form className="student-form" onSubmit={handleSave}>
          <div className="form-group">
            <label className="form-label">New Payment Amount (₹)</label>
            <input
              type="number"
              className="form-input"
              value={newAmount || ''}
              onChange={(e) => setNewAmount(Number(e.target.value))}
              min="1"
              max={payment.remaining_balance}
              step="any"
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Payment Date</label>
              <input
                type="date"
                className="form-input"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Payment Mode</label>
              <select
                className="form-select"
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value as PaymentMode)}
              >
                <option value="">Select Mode (Optional)</option>
                {PAYMENT_MODES.map(mode => (
                  <option key={mode} value={mode}>{mode}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Remarks / Notes</label>
            <input
              type="text"
              className="form-input"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes"
            />
          </div>

          {error && <div className="form-error">{error}</div>}

          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={onCancel} disabled={isSaving}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
