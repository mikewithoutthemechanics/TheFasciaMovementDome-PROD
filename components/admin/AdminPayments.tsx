import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as Icons from '../Icons';

const focusRing = "focus:outline-none focus:ring-2 focus:ring-[#6E7568] focus:ring-offset-2 focus-visible:ring-2 focus-visible:ring-[#6E7568] focus-visible:ring-offset-2";

export interface AdminPaymentsProps {
  onShowToast: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
  adminId?: string;
  isSuperAdmin?: boolean;
}

interface PaymentLog {
  id: string;
  payment_id: string;
  user_id: string;
  amount: number;
  credits: number;
  package_id?: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded' | 'refund_failed' | 'retry_initiated';
  created_at: string;
  raw_data?: {
    pf_payment_id?: string;
    retry_count?: number;
    last_retry_at?: string;
    refund_id?: string;
    refunded_at?: string;
    refunded_amount?: number;
    refunded_by?: string;
    refund_reason?: string;
    retry_by?: string;
    new_payment_id?: string;
  };
}

interface RefundDialogData {
  paymentId: string;
  amount: number;
  reason: string;
}

const MAX_RETRY_ATTEMPTS = 3;

export const AdminPayments: React.FC<AdminPaymentsProps> = ({ 
  onShowToast, 
  adminId = '', 
  isSuperAdmin = false 
}) => {
  const [payments, setPayments] = useState<PaymentLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showRefundDialog, setShowRefundDialog] = useState(false);
  const [refundData, setRefundData] = useState<RefundDialogData>({
    paymentId: '',
    amount: 0,
    reason: ''
  });
  const [processingRefund, setProcessingRefund] = useState(false);
  const [processingRetry, setProcessingRetry] = useState<string | null>(null);

  const fetchPayments = async () => {
    try {
      const response = await fetch(`/api/payments/history?adminId=${adminId}&limit=100`, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch payments');
      }
      
      const data = await response.json();
      setPayments(data.payments || []);
    } catch (error) {
      console.error('Error fetching payments:', error);
      onShowToast('Failed to load payment history', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [adminId]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchPayments();
  };

  const handleRefund = async () => {
    if (!refundData.paymentId || refundData.amount <= 0) {
      onShowToast('Please enter a valid refund amount', 'error');
      return;
    }

    setProcessingRefund(true);
    try {
      const response = await fetch('/api/payments/refund', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          paymentId: refundData.paymentId,
          amount: refundData.amount,
          reason: refundData.reason,
          adminId
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Refund failed');
      }

      onShowToast(`Refund of R${refundData.amount} processed successfully!`, 'success');
      setShowRefundDialog(false);
      setRefundData({ paymentId: '', amount: 0, reason: '' });
      fetchPayments();
    } catch (error) {
      console.error('Refund error:', error);
      onShowToast(error instanceof Error ? error.message : 'Refund failed', 'error');
    } finally {
      setProcessingRefund(false);
    }
  };

  const handleRetry = async (paymentId: string) => {
    setProcessingRetry(paymentId);
    try {
      const response = await fetch('/api/payments/retry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          paymentId,
          adminId
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Retry failed');
      }

      onShowToast(data.message || 'Payment retry initiated!', 'success');
      fetchPayments();
    } catch (error) {
      console.error('Retry error:', error);
      onShowToast(error instanceof Error ? error.message : 'Retry failed', 'error');
    } finally {
      setProcessingRetry(null);
    }
  };

  const openRefundDialog = (payment: PaymentLog) => {
    setRefundData({
      paymentId: payment.payment_id,
      amount: payment.amount,
      reason: ''
    });
    setShowRefundDialog(true);
  };

  const filteredPayments = payments.filter(payment => {
    const matchesSearch = !searchTerm || 
      payment.payment_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.user_id.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || payment.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      completed: 'bg-green-100 text-green-700 border-green-200',
      failed: 'bg-red-100 text-red-700 border-red-200',
      refunded: 'bg-purple-100 text-purple-700 border-purple-200',
      refund_failed: 'bg-red-100 text-red-700 border-red-200',
      retry_initiated: 'bg-blue-100 text-blue-700 border-blue-200'
    };
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${styles[status] || 'bg-gray-100 text-gray-700'}`}>
        {status.replace('_', ' ')}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatAmount = (amount: number) => {
    return `R ${amount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`;
  };

  const canRefund = (payment: PaymentLog) => {
    return payment.status === 'completed' && isSuperAdmin;
  };

  const canRetry = (payment: PaymentLog) => {
    if (payment.status !== 'failed' && payment.status !== 'pending') return false;
    const retryCount = payment.raw_data?.retry_count || 0;
    return retryCount < MAX_RETRY_ATTEMPTS && isSuperAdmin;
  };

  const getRetryCount = (payment: PaymentLog) => {
    return payment.raw_data?.retry_count || 0;
  };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 border-b border-gray-200 pb-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-[#26150B] tracking-tight">Payment History</h1>
          <p className="text-sm text-[#6E7568] mt-1 font-medium">View and manage all payment transactions</p>
        </div>
        <div className="flex items-center gap-3">
<button 
            onClick={handleRefresh}
            disabled={refreshing}
            className={`btn-secondary rounded-full py-3 px-6 flex items-center gap-2 text-xs font-bold uppercase tracking-wider cursor-pointer shadow-md justify-center hover:bg-[#5a6155] hover:-translate-y-0.5 transition-all disabled:opacity-50 ${focusRing}`}
          >
            <Icons.RefreshIcon size={16} className={refreshing ? 'animate-spin' : ''} /> 
            Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search by payment ID or user ID..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full p-3 rounded-xl bg-white text-[#26150B] border border-[#6E7568]/10 focus:border-[#6E7568]/50 outline-none transition-all shadow-sm"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="p-3 rounded-xl bg-white text-[#26150B] border border-[#6E7568]/10 focus:border-[#6E7568]/50 outline-none transition-all shadow-sm"
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
          <option value="refunded">Refunded</option>
          <option value="retry_initiated">Retry Initiated</option>
        </select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-4 rounded-2xl border border-[#6E7568]/10 shadow-sm">
          <p className="text-xs font-bold text-[#6E7568] uppercase tracking-wider">Total</p>
          <p className="text-2xl font-extrabold text-[#26150B]">{payments.length}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-[#6E7568]/10 shadow-sm">
          <p className="text-xs font-bold text-[#6E7568] uppercase tracking-wider">Completed</p>
          <p className="text-2xl font-extrabold text-green-600">
            {payments.filter(p => p.status === 'completed').length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-[#6E7568]/10 shadow-sm">
          <p className="text-xs font-bold text-[#6E7568] uppercase tracking-wider">Failed</p>
          <p className="text-2xl font-extrabold text-red-600">
            {payments.filter(p => p.status === 'failed').length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-[#6E7568]/10 shadow-sm">
          <p className="text-xs font-bold text-[#6E7568] uppercase tracking-wider">Refunded</p>
          <p className="text-2xl font-extrabold text-purple-600">
            {payments.filter(p => p.status === 'refunded').length}
          </p>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
          <div className="inline-block w-8 h-8 border-4 border-[#6E7568]/20 border-t-[#6E7568] rounded-full animate-spin"></div>
          <p className="text-[#6E7568] mt-4">Loading payments...</p>
        </div>
      )}

      {/* Payment List */}
      {!loading && (
        <div className="space-y-4">
          {filteredPayments.map(payment => (
            <motion.div
              key={payment.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl p-6 border border-[#6E7568]/10 shadow-sm hover:shadow-md transition-all"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                {/* Payment Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-mono text-sm font-bold text-[#26150B]">
                      {payment.payment_id}
                    </span>
                    {getStatusBadge(payment.status)}
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-4 text-sm text-[#6E7568]">
                    <span className="flex items-center gap-1">
                      <Icons.UsersIcon size={14} />
                      {payment.user_id.substring(0, 8)}...
                    </span>
                    <span className="flex items-center gap-1">
                      <Icons.CreditCardIcon size={14} />
                      {formatAmount(payment.amount)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Icons.ZapIcon size={14} />
                      {payment.credits} credits
                    </span>
                    <span className="flex items-center gap-1">
                      <Icons.CalendarIcon size={14} />
                      {formatDate(payment.created_at)}
                    </span>
                  </div>

                  {/* Retry Info */}
                  {payment.raw_data?.retry_count && payment.raw_data.retry_count > 0 && (
                    <div className="mt-2 text-xs text-blue-600">
                      Retry attempts: {payment.raw_data.retry_count}/{MAX_RETRY_ATTEMPTS}
                      {payment.raw_data.last_retry_at && ` (Last: ${formatDate(payment.raw_data.last_retry_at)})`}
                    </div>
                  )}

                  {/* Refund Info */}
                  {payment.status === 'refunded' && payment.raw_data?.refunded_at && (
                    <div className="mt-2 text-xs text-purple-600">
                      Refunded: R{payment.raw_data.refunded_amount} on {formatDate(payment.raw_data.refunded_at)}
                      {payment.raw_data.refund_reason && ` - "${payment.raw_data.refund_reason}"`}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
{canRetry(payment) && (
                    <button
                      onClick={() => handleRetry(payment.payment_id)}
                      disabled={processingRetry === payment.payment_id}
                      className={`px-4 py-2 rounded-xl bg-blue-50 text-blue-600 text-xs font-bold uppercase tracking-wider hover:bg-blue-100 transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer ${focusRing}`}
                    >
                      <Icons.RefreshIcon size={14} className={processingRetry === payment.payment_id ? 'animate-spin' : ''} />
                      Retry ({getRetryCount(payment)}/{MAX_RETRY_ATTEMPTS})
                    </button>
                  )}
                  
{canRefund(payment) && (
                    <button
                      onClick={() => openRefundDialog(payment)}
                      className={`px-4 py-2 rounded-xl bg-red-50 text-red-600 text-xs font-bold uppercase tracking-wider hover:bg-red-100 transition-all flex items-center gap-2 cursor-pointer ${focusRing}`}
                    >
                      <Icons.RefreshIcon size={14} className="rotate-180" />
                      Refund
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredPayments.length === 0 && (
        <div className="text-center py-16 text-[#6E7568]/40 text-sm italic bg-[#FBF7EF]/30 rounded-[2rem] border-2 border-dashed border-[#6E7568]/10">
          <div className="w-16 h-16 bg-[#6E7568]/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Icons.CreditCardIcon size={28} />
          </div>
          <p className="text-[#6E7568] font-bold mb-2">No payments found</p>
          <p className="text-xs">Try adjusting your search or filter criteria</p>
        </div>
      )}

      {/* Refund Dialog */}
      <AnimatePresence>
        {showRefundDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#26150B]/60 backdrop-blur-md z-[200] flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#FBF7EF] border border-[#6E7568]/20 rounded-[2.5rem] p-8 sm:p-10 w-full max-w-lg shadow-2xl"
            >
              {/* Header */}
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-extrabold text-[#26150B] tracking-tight">
                  Process Refund
                </h2>
<button 
                  onClick={() => setShowRefundDialog(false)} 
                  className={`text-[#26150B]/40 hover:text-[#26150B] hover:bg-[#26150B]/5 rounded-full p-2 transition-all cursor-pointer ${focusRing}`}
                >
                  <Icons.XIcon />
                </button>
              </div>

              {/* Payment Info */}
              <div className="mb-6 p-4 bg-white rounded-2xl border border-[#6E7568]/10">
                <p className="text-xs font-bold text-[#6E7568] uppercase tracking-wider mb-2">Payment</p>
                <p className="font-mono text-sm font-bold text-[#26150B]">{refundData.paymentId}</p>
                <p className="text-lg font-extrabold text-[#26150B] mt-2">
                  {formatAmount(refundData.amount)}
                </p>
              </div>

              {/* Refund Amount */}
              <div className="mb-4">
                <label className="text-xs font-bold text-[#6E7568] block mb-2 uppercase tracking-wider pl-1">
                  Refund Amount (R)
                </label>
                <input
                  type="number"
                  min="0.01"
                  max={refundData.amount}
                  step="0.01"
                  className="w-full p-4 rounded-2xl bg-white text-[#26150B] border border-[#6E7568]/10 focus:border-[#6E7568]/50 outline-none transition-all shadow-sm focus:shadow-md font-medium"
                  value={refundData.amount || ''}
                  onChange={e => setRefundData({ ...refundData, amount: parseFloat(e.target.value) || 0 })}
                />
                <p className="text-xs text-[#6E7568] mt-1">
                  Maximum: {formatAmount(refundData.amount)}
                </p>
              </div>

              {/* Refund Reason */}
              <div className="mb-6">
                <label className="text-xs font-bold text-[#6E7568] block mb-2 uppercase tracking-wider pl-1">
                  Reason (optional)
                </label>
                <textarea
                  rows={3}
                  className="w-full p-4 rounded-2xl bg-white text-[#26150B] border border-[#6E7568]/10 focus:border-[#6E7568]/50 outline-none transition-all shadow-sm focus:shadow-md font-medium resize-none"
                  value={refundData.reason}
                  onChange={e => setRefundData({ ...refundData, reason: e.target.value })}
                  placeholder="e.g. Customer requested cancellation"
                />
              </div>

              {/* Warning */}
              <div className="mb-6 p-4 bg-red-50 rounded-2xl border border-red-200">
                <p className="text-sm text-red-700 font-medium">
                  ⚠️ This action will reverse the payment and deduct credits from the user's account. This cannot be undone.
                </p>
              </div>

              {/* Actions */}
<div className="flex gap-4">
                <button
                  onClick={() => setShowRefundDialog(false)}
                  className={`flex-1 py-4 rounded-2xl bg-[#6E7568]/10 text-[#6E7568] font-bold text-sm tracking-widest uppercase cursor-pointer ${focusRing}`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleRefund}
                  disabled={processingRefund || refundData.amount <= 0 || refundData.amount > refundData.amount}
                  className={`flex-1 py-4 rounded-2xl bg-red-600 text-white font-bold text-sm tracking-widest uppercase hover:bg-red-700 transition-all disabled:opacity-50 cursor-pointer ${focusRing}`}
                >
                  {processingRefund ? 'Processing...' : 'Confirm Refund'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminPayments;
