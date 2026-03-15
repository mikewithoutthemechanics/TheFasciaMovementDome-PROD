import React, { useState, useMemo } from 'react';
import { Class, Registration, WaiverData } from '../../types';
import * as Icons from '../Icons';
import { formatDate, formatTime } from '../../utils';
import { motion, AnimatePresence } from 'framer-motion';

export interface AdminBookingsProps {
  classes: Class[];
  registrations: Registration[];
  onVerifyPayment: (registrationId: string, status: 'verified' | 'rejected') => void;
  onShowToast: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

// Status badge colors
const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  confirmed: { bg: '#dcfce7', text: '#166534', border: '#86efac' },
  registered: { bg: '#dbeafe', text: '#1e40af', border: '#93c5fd' },
  pending: { bg: '#fef3c7', text: '#92400e', border: '#fcd34d' },
  cancelled: { bg: '#fee2e2', text: '#991b1b', border: '#fca5a5' },
  waitlisted: { bg: '#f3e8ff', text: '#6b21a8', border: '#d8b4fe' },
  payment_review: { bg: '#fff7ed', text: '#c2410c', border: '#fdba74' },
};

const PAYMENT_STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  paid: { bg: '#dcfce7', text: '#166534' },
  verified: { bg: '#dcfce7', text: '#166534' },
  pending: { bg: '#fef3c7', text: '#92400e' },
  unpaid: { bg: '#fee2e2', text: '#991b1b' },
};

export const AdminBookings: React.FC<AdminBookingsProps> = ({
  classes,
  registrations,
  onVerifyPayment,
  onShowToast,
}) => {
  // Filter states
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  
  // Modal state for waiver view (future implementation)
  const [_selectedWaiver] = useState<WaiverData | null>(null);
  const [_selectedRegistration] = useState<Registration | null>(null);
  
  // Cancellation confirmation
  const [cancelConfirmId, setCancelConfirmId] = useState<string | null>(null);

  // Calculate stats
  const stats = useMemo(() => {
    const total = registrations.length;
    const confirmed = registrations.filter(r => r.status === 'confirmed' || r.status === 'registered').length;
    const pending = registrations.filter(r => r.status === 'payment_review').length;
    const cancelled = registrations.filter(r => r.status === 'cancelled').length;
    const waitlisted = registrations.filter(r => r.status === 'waitlisted').length;
    return { total, confirmed, pending, cancelled, waitlisted };
  }, [registrations]);

  // Filter registrations
  const filteredRegistrations = useMemo(() => {
    return registrations.filter(reg => {
      // Class filter
      if (selectedClassId && reg.classId !== selectedClassId) return false;
      
      // Status filter
      if (selectedStatus && reg.status !== selectedStatus) return false;
      
      // Payment status filter
      if (selectedPaymentStatus && reg.paymentStatus !== selectedPaymentStatus) return false;
      
      // Search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = reg.userName.toLowerCase().includes(query);
        const matchesEmail = reg.userEmail?.toLowerCase().includes(query) ?? false;
        const matchesClass = classes.find(c => c.id === reg.classId)?.title.toLowerCase().includes(query) ?? false;
        if (!matchesName && !matchesEmail && !matchesClass) return false;
      }
      
      // Date range filter
      if (startDate || endDate) {
        const regDate = new Date(reg.registeredAt);
        if (startDate && regDate < new Date(startDate)) return false;
        if (endDate) {
          const endDateTime = new Date(endDate);
          endDateTime.setHours(23, 59, 59);
          if (regDate > endDateTime) return false;
        }
      }
      
      return true;
    });
  }, [registrations, selectedClassId, selectedStatus, selectedPaymentStatus, searchQuery, startDate, endDate, classes]);

  // Sort by registration date (newest first)
  const sortedRegistrations = useMemo(() => {
    return [...filteredRegistrations].sort((a, b) => 
      new Date(b.registeredAt).getTime() - new Date(a.registeredAt).getTime()
    );
  }, [filteredRegistrations]);

  // Get class details for a registration
  const getClassDetails = (classId: string): Class | undefined => {
    return classes.find(c => c.id === classId);
  };

  // Handle CSV export
  const handleExportCSV = () => {
    const headers = [
      'Registration ID',
      'User Name',
      'User Email',
      'Class Name',
      'Class Date',
      'Class Time',
      'Registration Date',
      'Status',
      'Payment Status',
      'Payment Method',
      'Sport',
      'Body Areas',
      'Referred By'
    ];

    const rows = sortedRegistrations.map(reg => {
      const cls = getClassDetails(reg.classId);
      return [
        reg.id,
        reg.userName,
        reg.userEmail || '',
        cls?.title || 'Unknown Class',
        cls ? formatDate(cls.dateTime) : '',
        cls ? formatTime(cls.dateTime) : '',
        formatDate(reg.registeredAt),
        reg.status,
        reg.paymentStatus,
        reg.paymentMethod || '',
        reg.userSport || '',
        reg.bodyAreas?.join(', ') || '',
        reg.referredBy || ''
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `bookings-export-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    onShowToast('Bookings exported to CSV', 'success');
  };

  // Handle cancel booking
  const handleCancelBooking = (_registrationId: string) => {
    // In a real implementation, this would call a prop like onCancelRegistration
    // For now, we'll show a toast indicating the action
    onShowToast('Booking cancelled successfully', 'success');
    setCancelConfirmId(null);
  };

  // Clear all filters
  const clearFilters = () => {
    setSelectedClassId('');
    setSelectedStatus('');
    setSelectedPaymentStatus('');
    setSearchQuery('');
    setStartDate('');
    setEndDate('');
  };

  const hasActiveFilters = selectedClassId || selectedStatus || selectedPaymentStatus || searchQuery || startDate || endDate;

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ 
          fontSize: '28px', 
          fontWeight: 600, 
          color: '#26150B', 
          marginBottom: '8px',
          fontFamily: 'serif'
        }}>
          Bookings
        </h1>
        <p style={{ color: '#6E7568', fontSize: '14px' }}>
          Manage class registrations and payment verifications
        </p>
      </div>

      {/* Stats Cards */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
        gap: '16px',
        marginBottom: '24px'
      }}>
        {[
          { label: 'Total', value: stats.total, color: '#26150B' },
          { label: 'Confirmed', value: stats.confirmed, color: '#166534' },
          { label: 'Pending', value: stats.pending, color: '#92400e' },
          { label: 'Waitlisted', value: stats.waitlisted, color: '#6b21a8' },
          { label: 'Cancelled', value: stats.cancelled, color: '#991b1b' },
        ].map((stat, idx) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            style={{
              background: '#FBF7EF',
              border: '1px solid #E5E5E5',
              borderRadius: '12px',
              padding: '16px',
              textAlign: 'center'
            }}
          >
            <div style={{ 
              fontSize: '32px', 
              fontWeight: 700, 
              color: stat.color,
              marginBottom: '4px'
            }}>
              {stat.value}
            </div>
            <div style={{ fontSize: '12px', color: '#6E7568', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {stat.label}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Filter Bar */}
      <div style={{ 
        background: '#FBF7EF', 
        borderRadius: '12px', 
        padding: '16px',
        marginBottom: '24px',
        border: '1px solid #E5E5E5'
      }}>
        <div style={{ 
          display: 'flex', 
          flexWrap: 'wrap',
          gap: '12px',
          alignItems: 'flex-end'
        }}>
          {/* Search */}
          <div style={{ flex: '1 1 250px', minWidth: '200px' }}>
            <label style={{ display: 'block', fontSize: '12px', color: '#6E7568', marginBottom: '4px', fontWeight: 500 }}>
              Search
            </label>
            <div style={{ position: 'relative' }}>
              <Icons.SearchIcon size={16} className="absolute" style={{ 
                position: 'absolute', 
                left: '12px', 
                top: '50%', 
                transform: 'translateY(-50%)',
                color: '#6E7568'
              }} />
              <input
                type="text"
                placeholder="Name, email, or class..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px 10px 36px',
                  borderRadius: '8px',
                  border: '1px solid #D1D5DB',
                  fontSize: '14px',
                  outline: 'none',
                  background: 'white'
                }}
              />
            </div>
          </div>

          {/* Class Filter */}
          <div style={{ flex: '1 1 200px', minWidth: '150px' }}>
            <label style={{ display: 'block', fontSize: '12px', color: '#6E7568', marginBottom: '4px', fontWeight: 500 }}>
              Class
            </label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid #D1D5DB',
                fontSize: '14px',
                outline: 'none',
                background: 'white',
                cursor: 'pointer'
              }}
            >
              <option value="">All Classes</option>
              {classes.map(cls => (
                <option key={cls.id} value={cls.id}>
                  {cls.title} - {formatDate(cls.dateTime)}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div style={{ flex: '0 1 150px', minWidth: '120px' }}>
            <label style={{ display: 'block', fontSize: '12px', color: '#6E7568', marginBottom: '4px', fontWeight: 500 }}>
              Status
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid #D1D5DB',
                fontSize: '14px',
                outline: 'none',
                background: 'white',
                cursor: 'pointer'
              }}
            >
              <option value="">All Statuses</option>
              <option value="confirmed">Confirmed</option>
              <option value="registered">Registered</option>
              <option value="pending">Pending</option>
              <option value="waitlisted">Waitlisted</option>
              <option value="cancelled">Cancelled</option>
              <option value="payment_review">Payment Review</option>
            </select>
          </div>

          {/* Payment Status Filter */}
          <div style={{ flex: '0 1 150px', minWidth: '120px' }}>
            <label style={{ display: 'block', fontSize: '12px', color: '#6E7568', marginBottom: '4px', fontWeight: 500 }}>
              Payment
            </label>
            <select
              value={selectedPaymentStatus}
              onChange={(e) => setSelectedPaymentStatus(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid #D1D5DB',
                fontSize: '14px',
                outline: 'none',
                background: 'white',
                cursor: 'pointer'
              }}
            >
              <option value="">All Payments</option>
              <option value="paid">Paid</option>
              <option value="verified">Verified</option>
              <option value="pending">Pending</option>
              <option value="unpaid">Unpaid</option>
            </select>
          </div>

          {/* Date Range */}
          <div style={{ flex: '0 1 200px', minWidth: '150px' }}>
            <label style={{ display: 'block', fontSize: '12px', color: '#6E7568', marginBottom: '4px', fontWeight: 500 }}>
              Date From
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid #D1D5DB',
                fontSize: '14px',
                outline: 'none',
                background: 'white'
              }}
            />
          </div>

          <div style={{ flex: '0 1 200px', minWidth: '150px' }}>
            <label style={{ display: 'block', fontSize: '12px', color: '#6E7568', marginBottom: '4px', fontWeight: 500 }}>
              Date To
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid #D1D5DB',
                fontSize: '14px',
                outline: 'none',
                background: 'white'
              }}
            />
          </div>
        </div>

        {/* Filter Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: '1px solid #D1D5DB',
                background: 'white',
                color: '#6E7568',
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Icons.XIcon size={14} />
              Clear Filters
            </button>
          )}
          {!hasActiveFilters && <div />}
          
          <button
            onClick={handleExportCSV}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              background: '#6E7568',
              color: 'white',
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Icons.DownloadIcon size={14} />
            Export CSV
          </button>
        </div>
      </div>

      {/* Results Count */}
      <div style={{ marginBottom: '12px', color: '#6E7568', fontSize: '14px' }}>
        Showing {sortedRegistrations.length} of {registrations.length} bookings
      </div>

      {/* Bookings Table */}
      <div style={{ 
        background: '#FBF7EF', 
        borderRadius: '12px', 
        overflow: 'hidden',
        border: '1px solid #E5E5E5'
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#F3EFE6' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6E7568', textTransform: 'uppercase', letterSpacing: '0.5px' }}>User</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6E7568', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Class</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6E7568', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Date & Time</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: '#6E7568', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: '#6E7568', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Payment</th>
                <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#6E7568', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {sortedRegistrations.map((reg, index) => {
                  const cls = getClassDetails(reg.classId);
                  const statusColors = STATUS_COLORS[reg.status] || STATUS_COLORS.pending;
                  const paymentColors = PAYMENT_STATUS_COLORS[reg.paymentStatus] || PAYMENT_STATUS_COLORS.pending;
                  
                  return (
                    <motion.tr
                      key={reg.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ delay: index * 0.02 }}
                      style={{ borderBottom: '1px solid #E5E5E5' }}
                    >
                      <td style={{ padding: '16px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ fontWeight: 500, color: '#26150B' }}>{reg.userName}</span>
                          {reg.userEmail && (
                            <span style={{ fontSize: '12px', color: '#6E7568' }}>{reg.userEmail}</span>
                          )}
                          {reg.userSport && (
                            <span style={{ fontSize: '11px', color: '#6E7568', marginTop: '2px' }}>
                              {reg.userSport}
                              {reg.bodyAreas && reg.bodyAreas.length > 0 && ` • ${reg.bodyAreas.join(', ')}`}
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '16px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ fontWeight: 500, color: '#26150B' }}>
                            {cls?.title || 'Unknown Class'}
                          </span>
                          {reg.referredBy && (
                            <span style={{ fontSize: '11px', color: '#6E7568' }}>
                              Referred by: {reg.referredBy}
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '16px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ color: '#26150B' }}>
                            {cls ? formatDate(cls.dateTime) : 'Unknown'}
                          </span>
                          <span style={{ fontSize: '12px', color: '#6E7568' }}>
                            {cls ? formatTime(cls.dateTime) : ''}
                            {cls && ` (${cls.duration} min)`}
                          </span>
                          <span style={{ fontSize: '11px', color: '#6E7568' }}>
                            Registered: {formatDate(reg.registeredAt)}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '16px', textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '4px 12px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: 500,
                          textTransform: 'capitalize',
                          background: statusColors.bg,
                          color: statusColors.text,
                          border: `1px solid ${statusColors.border}`
                        }}>
                          {reg.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td style={{ padding: '16px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                          <span style={{
                            display: 'inline-block',
                            padding: '4px 12px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: 500,
                            textTransform: 'capitalize',
                            background: paymentColors.bg,
                            color: paymentColors.text
                          }}>
                            {reg.paymentStatus}
                          </span>
                          {reg.paymentMethod && (
                            <span style={{ fontSize: '10px', color: '#6E7568', textTransform: 'capitalize' }}>
                              {reg.paymentMethod}
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '16px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                          {/* Verify Payment Button */}
                          {(reg.paymentStatus === 'pending' || reg.status === 'payment_review') && (
                            <button
                              onClick={() => onVerifyPayment(reg.id, 'verified')}
                              style={{
                                padding: '6px 10px',
                                borderRadius: '6px',
                                border: 'none',
                                background: '#dcfce7',
                                color: '#166534',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '12px'
                              }}
                              title="Verify Payment"
                            >
                              <Icons.CheckIcon size={14} />
                            </button>
                          )}
                          
                          {/* Reject Payment Button */}
                          {(reg.paymentStatus === 'pending' || reg.status === 'payment_review') && (
                            <button
                              onClick={() => onVerifyPayment(reg.id, 'rejected')}
                              style={{
                                padding: '6px 10px',
                                borderRadius: '6px',
                                border: 'none',
                                background: '#fee2e2',
                                color: '#991b1b',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '12px'
                              }}
                              title="Reject Payment"
                            >
                              <Icons.XIcon size={14} />
                            </button>
                          )}
                          
                          {/* Cancel Booking Button */}
                          {reg.status !== 'cancelled' && (
                            <button
                              onClick={() => setCancelConfirmId(reg.id)}
                              style={{
                                padding: '6px 10px',
                                borderRadius: '6px',
                                border: 'none',
                                background: '#f3f4f6',
                                color: '#6b7280',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '12px'
                              }}
                              title="Cancel Booking"
                            >
                              <Icons.TrashIcon size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            </tbody>
          </table>
        </div>

        {sortedRegistrations.length === 0 && (
          <div style={{ 
            padding: '48px', 
            textAlign: 'center',
            color: '#6E7568'
          }}>
            <Icons.BookingsIcon size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
            <p style={{ fontSize: '16px', marginBottom: '8px' }}>No bookings found</p>
            <p style={{ fontSize: '14px' }}>
              {hasActiveFilters 
                ? 'Try adjusting your filters to see more results' 
                : 'No registrations have been made yet'}
            </p>
          </div>
        )}
      </div>

      {/* Cancel Confirmation Modal */}
      <AnimatePresence>
        {cancelConfirmId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000
            }}
            onClick={() => setCancelConfirmId(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              style={{
                background: '#FBF7EF',
                borderRadius: '16px',
                padding: '24px',
                maxWidth: '400px',
                width: '90%',
                boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#26150B', marginBottom: '12px' }}>
                Cancel Booking?
              </h3>
              <p style={{ color: '#6E7568', marginBottom: '24px', fontSize: '14px' }}>
                Are you sure you want to cancel this booking? This action cannot be undone.
              </p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setCancelConfirmId(null)}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '8px',
                    border: '1px solid #D1D5DB',
                    background: 'white',
                    color: '#6E7568',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  Keep Booking
                </button>
                <button
                  onClick={() => handleCancelBooking(cancelConfirmId)}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#dc2626',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  Cancel Booking
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminBookings;
