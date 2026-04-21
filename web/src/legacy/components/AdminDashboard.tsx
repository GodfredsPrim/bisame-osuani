import React, { useEffect, useState } from 'react';
import {
  adminAPI,
  type AdminAnalytics,
  type Competition,
  type PaymentRequest,
} from '../services/api';

type CouponInventoryItem = {
  code: string;
  duration_months: number;
  created_at: string;
};

export const AdminDashboard: React.FC = () => {
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [coupons, setCoupons] = useState<CouponInventoryItem[]>([]);
  const [pendingPayments, setPendingPayments] = useState<PaymentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [couponBusy, setCouponBusy] = useState(false);
  const [couponForm, setCouponForm] = useState({ quantity: 5, durationMonths: 3 });
  const [generatedCodes, setGeneratedCodes] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'purchases' | 'announcements' | 'codes'>('overview');

  const [newComp, setNewComp] = useState({
    title: '',
    description: '',
    prize: '',
    start_date: '',
    end_date: '',
    quiz_json: '[]',
  });

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const [stats, comps, codes, payments] = await Promise.all([
        adminAPI.getAnalytics(),
        adminAPI.listAllCompetitions(),
        adminAPI.getCouponInventory(),
        adminAPI.getPendingPayments(),
      ]);
      setAnalytics(stats);
      setCompetitions(comps);
      setCoupons(codes);
      setPendingPayments(payments);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const pollId = setInterval(() => loadData(), 40000);
    return () => clearInterval(pollId);
  }, []);

  const handleCreateCompetition = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await adminAPI.createCompetition(newComp);
      alert('Announcement / competition posted successfully.');
      setNewComp({ title: '', description: '', prize: '', start_date: '', end_date: '', quiz_json: '[]' });
      const modal = document.getElementById('create-comp-modal');
      if (modal) modal.style.display = 'none';
      await loadData();
    } catch (err: any) {
      alert('Error: ' + (err?.response?.data?.detail || 'Unknown error'));
    }
  };

  const handleConfirmPayment = async (requestId: number) => {
    if (!window.confirm('Confirm this purchase and activate user subscription?')) return;
    try {
      await adminAPI.confirmPayment(requestId);
      alert('Purchase confirmed.');
      await loadData();
    } catch (err: any) {
      alert('Error: ' + (err?.response?.data?.detail || 'Error'));
    }
  };

  const handleRejectPayment = async (requestId: number) => {
    if (!window.confirm('Reject this purchase request?')) return;
    try {
      await adminAPI.rejectPayment(requestId);
      alert('Purchase request rejected.');
      await loadData();
    } catch (err: any) {
      alert('Error: ' + (err?.response?.data?.detail || 'Error'));
    }
  };

  const handleGenerateCoupons = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setCouponBusy(true);
      const result = await adminAPI.generateCoupons({
        quantity: couponForm.quantity,
        duration_months: couponForm.durationMonths,
      });
      setGeneratedCodes(result.codes);
      await loadData();
    } catch (err: any) {
      alert('Coupon generation failed: ' + (err?.response?.data?.detail || 'Error'));
    } finally {
      setCouponBusy(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
        <div className="pulse-loader"></div>
        <p style={{ marginLeft: '15px', color: '#64748b', fontWeight: 600 }}>Loading Administrative Dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', background: '#f1f5f9', padding: '40px 20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ maxWidth: '450px', background: 'white', padding: '40px', borderRadius: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '20px' }}>🔐</div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '10px' }}>Authentication Error</h2>
          <p style={{ color: '#64748b', marginBottom: '25px' }}>{error}</p>
          <button 
            onClick={() => window.location.hash = ''}
            style={{ padding: '12px 24px', borderRadius: '12px', background: '#0f172a', color: 'white', fontWeight: 700, border: 'none', cursor: 'pointer' }}
          >
            Return to Study Home
          </button>
        </div>
      </div>
    );
  }

  const cards = [
    { label: 'Pending Purchases', value: pendingPayments.length, color: '#ef4444', icon: '💳' },
    { label: 'Access Codes', value: coupons.length, color: '#f59e0b', icon: '🎟️' },
    { label: 'Codes Generated', value: analytics?.total_codes_generated ?? 0, color: '#3b82f6', icon: '✨' },
    { label: 'Codes Used', value: analytics?.total_codes_used ?? 0, color: '#10b981', icon: '✅' },
  ];

  const tabs = [
    { id: 'overview' as const, label: '📊 Overview' },
    { id: 'purchases' as const, label: '💳 Purchases', badge: pendingPayments.length },
    { id: 'announcements' as const, label: '📢 Announcements' },
    { id: 'codes' as const, label: '🎟️ Access Codes' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9', color: '#1e293b', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '40px 20px' }}>
        {/* Header */}
        <div style={{ marginBottom: '40px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>⚙️ Administrative Dashboard</h1>
              <p style={{ color: '#64748b', margin: '8px 0 0 0', fontSize: '0.95rem' }}>Professional control panel for managing system operations</p>
            </div>
            <button
              onClick={() => void loadData()}
              style={{ padding: '10px 20px', borderRadius: '10px', background: 'white', border: '1px solid #e2e8f0', color: '#0f172a', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
            >
              🔄 Refresh
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div style={{ display: 'flex', borderBottom: '2px solid #e2e8f0', background: 'white', borderRadius: '12px 12px 0 0', gap: '0', marginBottom: 0 }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1,
                padding: '18px 24px',
                border: 'none',
                background: activeTab === tab.id ? 'white' : 'transparent',
                borderBottom: activeTab === tab.id ? '3px solid #0f172a' : 'none',
                marginBottom: '-2px',
                cursor: 'pointer',
                fontSize: '0.95rem',
                fontWeight: activeTab === tab.id ? 800 : 600,
                color: activeTab === tab.id ? '#0f172a' : '#64748b',
                transition: 'all 0.25s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                position: 'relative',
                userSelect: 'none',
                whiteSpace: 'nowrap',
              }}
            >
              <span>{tab.label}</span>
              {'badge' in tab && tab.badge && (
                <span style={{ background: '#ef4444', color: 'white', borderRadius: '999px', padding: '3px 8px', fontSize: '0.75rem', fontWeight: 800, minWidth: '20px', textAlign: 'center' }}>
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab Content Container */}
        <div style={{ background: 'white', borderRadius: '0 0 12px 12px', borderLeft: '1px solid #e2e8f0', borderRight: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0', padding: '30px', animation: 'fadeIn 0.3s ease-in' }}>
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
                {cards.map((stat) => (
                  <div key={stat.label} style={{ padding: '24px', background: '#f8fafc', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '2.2rem', marginBottom: '12px' }}>{stat.icon}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.5px', marginBottom: '8px' }}>{stat.label}</div>
                    <div style={{ fontSize: '2rem', fontWeight: 800, color: stat.color }}>{stat.value}</div>
                  </div>
                ))}
              </div>

              <div style={{ padding: '24px', background: '#f8fafc', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: '0 0 20px 0' }}>📊 System Status</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px' }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Active Users</div>
                    <div style={{ fontSize: '2rem', fontWeight: 800, color: '#3b82f6' }}>{analytics?.total_users ?? 0}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Subscription Rate</div>
                    <div style={{ fontSize: '2rem', fontWeight: 800, color: '#10b981' }}>
                      {analytics?.total_users ? Math.round(((analytics as any).total_subscribed_users || 0) / analytics.total_users * 100) : 0}%
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Total Revenue</div>
                    <div style={{ fontSize: '2rem', fontWeight: 800, color: '#f59e0b' }}>GH₵{analytics?.total_revenue_ghs ?? 0}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Purchases Tab */}
          {activeTab === 'purchases' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 800, margin: 0 }}>💳 Pending Purchases</h3>
                <span style={{ padding: '6px 14px', background: '#fee2e2', color: '#991b1b', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 800 }}>
                  {pendingPayments.length} Pending
                </span>
              </div>

              {pendingPayments.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '12px' }}>✅</div>
                  <p style={{ fontSize: '1rem' }}>No pending purchases. All transactions verified!</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '600px', overflowY: 'auto' }}>
                  {pendingPayments.map((payment) => (
                    <div key={payment.id} style={{ padding: '20px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '20px', flex: 1 }}>
                        <div>
                          <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', marginBottom: '4px' }}>User</div>
                          <div style={{ fontWeight: 700 }}>{payment.full_name}</div>
                          <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>{payment.email}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', marginBottom: '4px' }}>MoMo Provider</div>
                          <div style={{ fontWeight: 700 }}>{payment.momo_name}</div>
                          <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>{payment.momo_number}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', marginBottom: '4px' }}>Reference</div>
                          <div style={{ fontWeight: 700 }}>{payment.reference || '—'}</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '10px', flexShrink: 0 }}>
                        <button onClick={() => void handleConfirmPayment(payment.id)} style={{ padding: '10px 18px', borderRadius: '10px', background: '#10b981', border: 'none', color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem', transition: 'all 0.2s' }}>
                          ✓ Approve
                        </button>
                        <button onClick={() => void handleRejectPayment(payment.id)} style={{ padding: '10px 18px', borderRadius: '10px', background: 'white', border: '1px solid #ef4444', color: '#ef4444', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem', transition: 'all 0.2s' }}>
                          ✕ Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Announcements Tab */}
          {activeTab === 'announcements' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 800, margin: 0 }}>📢 Announcements & Competitions</h3>
                <button
                  onClick={() => {
                    const modal = document.getElementById('create-comp-modal');
                    if (modal) modal.style.display = 'flex';
                  }}
                  style={{ padding: '10px 20px', borderRadius: '10px', background: '#0f172a', color: 'white', fontWeight: 600, border: 'none', cursor: 'pointer', fontSize: '0.9rem', transition: 'all 0.2s' }}
                >
                  + New Post
                </button>
              </div>

              {competitions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '12px' }}>📢</div>
                  <p style={{ fontSize: '1rem' }}>No announcements or competitions yet. Create your first post!</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gap: '16px', maxHeight: '600px', overflowY: 'auto' }}>
                  {competitions.map((item) => (
                    <div key={item.id} style={{ padding: '20px', border: '1px solid #e2e8f0', borderRadius: '12px', background: '#f8fafc' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'start', marginBottom: '12px' }}>
                        <div>
                          <div style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '6px' }}>{item.title}</div>
                          <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>{item.description}</p>
                        </div>
                        <span style={{ padding: '6px 12px', background: item.is_active ? '#dcfce7' : '#e2e8f0', color: item.is_active ? '#166534' : '#475569', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 800, whiteSpace: 'nowrap' }}>
                          {item.is_active ? '🟢 Active' : '⏱️ Scheduled'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', fontSize: '0.85rem', color: '#475569', paddingTop: '12px', borderTop: '1px solid #e2e8f0' }}>
                        <span><strong>📅</strong> {item.start_date}</span>
                        <span><strong>🏁</strong> {item.end_date}</span>
                        {item.prize && <span><strong>🏆</strong> {item.prize}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Access Codes Tab */}
          {activeTab === 'codes' && (
            <div>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 800, margin: '0 0 24px 0' }}>🎟️ Access Code Inventory</h3>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '30px' }}>
                {/* Generate Section */}
                <div style={{ padding: '20px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', height: 'fit-content' }}>
                  <h4 style={{ margin: '0 0 16px 0', fontSize: '0.95rem', fontWeight: 800 }}>Generate Codes</h4>
                  <form onSubmit={handleGenerateCoupons} style={{ display: 'grid', gap: '12px' }}>
                    <div>
                      <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 800, marginBottom: '6px', display: 'block', textTransform: 'uppercase' }}>Quantity</label>
                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={couponForm.quantity}
                        onChange={(e) => setCouponForm((prev) => ({ ...prev, quantity: Number(e.target.value) || 1 }))}
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'white', border: '1px solid #e2e8f0', boxSizing: 'border-box', fontSize: '0.9rem' }}
                        placeholder="Quantity"
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 800, marginBottom: '6px', display: 'block', textTransform: 'uppercase' }}>Duration (Months)</label>
                      <input
                        type="number"
                        min={1}
                        max={12}
                        value={couponForm.durationMonths}
                        onChange={(e) => setCouponForm((prev) => ({ ...prev, durationMonths: Number(e.target.value) || 1 }))}
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'white', border: '1px solid #e2e8f0', boxSizing: 'border-box', fontSize: '0.9rem' }}
                        placeholder="Duration (months)"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={couponBusy}
                      style={{ padding: '12px', borderRadius: '8px', background: '#0f172a', color: 'white', fontWeight: 700, border: 'none', cursor: 'pointer', fontSize: '0.9rem', transition: 'all 0.2s' }}
                    >
                      {couponBusy ? '⏳ Generating...' : '✨ Generate'}
                    </button>
                  </form>

                  {generatedCodes.length > 0 && (
                    <div style={{ marginTop: '16px', padding: '12px', background: '#ecfeff', border: '1px solid #a5f3fc', borderRadius: '8px' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#155e75', marginBottom: '10px', textTransform: 'uppercase' }}>✨ New Codes Generated</div>
                      <div style={{ display: 'grid', gap: '6px', maxHeight: '160px', overflowY: 'auto' }}>
                        {generatedCodes.map((code) => (
                          <code key={code} style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a', padding: '4px', background: 'white', borderRadius: '4px', display: 'block', border: '1px solid #a5f3fc' }}>{code}</code>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Inventory Section */}
                <div>
                  <h4 style={{ margin: '0 0 16px 0', fontSize: '0.95rem', fontWeight: 800 }}>Available Codes ({coupons.length})</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '500px', overflowY: 'auto' }}>
                    {coupons.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '40px 20px', fontSize: '0.85rem', color: '#94a3b8' }}>
                        <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>🎫</div>
                        <p>No unused codes available. Generate new ones!</p>
                      </div>
                    ) : (
                      coupons.map((coupon) => (
                        <div key={coupon.code} style={{ padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', transition: 'all 0.2s' }}>
                          <div style={{ flex: 1 }}>
                            <code style={{ fontSize: '0.85rem', color: '#0f172a', fontWeight: 800, display: 'block', letterSpacing: '0.5px' }}>{coupon.code}</code>
                            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>⏱️ {coupon.duration_months} month{coupon.duration_months > 1 ? 's' : ''}</div>
                          </div>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(coupon.code);
                              alert('✅ Code copied to clipboard!');
                            }}
                            style={{ padding: '8px 12px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', whiteSpace: 'nowrap', transition: 'all 0.2s' }}
                          >
                            Copy
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Create Competition Modal */}
        <div id="create-comp-modal" style={{ display: 'none', position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', zIndex: 1000, alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: 'white', padding: '40px', borderRadius: '16px', width: '100%', maxWidth: '600px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 24px 0' }}>📢 Post Announcement / Competition</h2>
            <form onSubmit={handleCreateCompetition} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '12px' }}>
                <input type="text" placeholder="Title" value={newComp.title} onChange={(e) => setNewComp({ ...newComp, title: e.target.value })} style={{ padding: '12px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0' }} required />
                <input type="text" placeholder="Prize (optional)" value={newComp.prize} onChange={(e) => setNewComp({ ...newComp, prize: e.target.value })} style={{ padding: '12px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <input type="date" value={newComp.start_date} onChange={(e) => setNewComp({ ...newComp, start_date: e.target.value })} style={{ padding: '12px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0' }} required />
                <input type="date" value={newComp.end_date} onChange={(e) => setNewComp({ ...newComp, end_date: e.target.value })} style={{ padding: '12px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0' }} required />
              </div>
              <textarea placeholder="Write announcement or competition details here..." value={newComp.description} onChange={(e) => setNewComp({ ...newComp, description: e.target.value })} style={{ padding: '12px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0', minHeight: '100px', fontFamily: 'inherit' }} required />
              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button type="button" onClick={() => { const modal = document.getElementById('create-comp-modal'); if (modal) modal.style.display = 'none'; }} style={{ flex: 1, padding: '12px', borderRadius: '8px', background: 'white', border: '1px solid #e2e8f0', color: '#64748b', fontWeight: 600, cursor: 'pointer' }}>
                  Cancel
                </button>
                <button type="submit" style={{ flex: 1, padding: '12px', borderRadius: '8px', background: '#0f172a', color: 'white', fontWeight: 700, border: 'none', cursor: 'pointer' }}>
                  🚀 Publish
                </button>
              </div>
            </form>
          </div>
        </div>

        <style>{`
          @keyframes fadeIn {
            from { 
              opacity: 0;
              transform: translateY(8px);
            }
            to { 
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}</style>
      </div>
    </div>
  );
};

export default AdminDashboard;
