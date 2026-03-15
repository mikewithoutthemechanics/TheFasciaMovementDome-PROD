
import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CRMContact, CRMTask, CRMNote, CRMActivity, 
  User, Template, Disclaimer, DisclaimerSection, AppSettings, Venue,
  LeadStatus, LeadSource, CRMEmailTemplate, DisclaimerContext
} from '../types';
import { db } from '../services/db-supabase';
import * as Icons from '../components/Icons';
import { formatDate, formatTime } from '../utils';

// =============== MARKETING TYPES ===============
export type ClientStatus = 'active' | 'unsubscribed' | 'pending' | 'bounced';

export interface MarketingCampaign {
  id: string;
  name: string;
  subject: string;
  status: 'draft' | 'scheduled' | 'active' | 'completed' | 'paused';
  scheduledAt?: string;
  sentAt?: string;
  sent: number; // number of emails sent (same as recipients when campaign is sent)
  recipients: number;
  delivered: number;
  opened: number;
  clicked: number;
  converted: number;
  createdAt: string;
  updatedAt: string;
  channel: 'email' | 'sms' | 'push';
  recipientType: 'all' | 'manual' | 'segment';
  manualRecipients: string[];
  segmentId?: string;
  priority: 'normal' | 'high';
  content?: string;
  templateId?: string;
  sendNow: boolean;
  bounced: number;
  unsubscribed: number;
  replied: number;
  spamReported: number;
}

export interface MarketingMetrics {
  totalClients: number;
  newUsersThisWeek: number;
  newClientsThisMonth: number;
  unsubscribedThisMonth: number;
  emailOpenRate: number;
  clickThroughRate: number;
  activeCampaigns: number;
  totalCampaignsSent: number;
  avgEngagementScore: number;
  avgBounceRate: number;
  avgUnsubscribeRate: number;
  avgReplyRate: number;
}

// =============== MARKETING METRICS CALCULATION ===============
const calculateMarketingMetrics = (contacts: CRMContact[], campaigns: MarketingCampaign[]): MarketingMetrics => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  
  const totalClients = contacts.length;
  
  const newUsersThisWeek = contacts.filter(c => {
    const created = new Date(c.createdAt);
    return created >= sevenDaysAgo;
  }).length;
  
  const newClientsThisMonth = contacts.filter(c => {
    const created = new Date(c.createdAt);
    return created >= startOfMonth;
  }).length;
  
  const unsubscribedThisMonth = contacts.filter(c => c.status === 'churned').length;
  
  // Calculate from campaigns
  const allCampaigns = campaigns.length > 0 ? campaigns : [];
  const totalDelivered = allCampaigns.reduce((sum, c) => sum + c.delivered, 0);
  const totalOpened = allCampaigns.reduce((sum, c) => sum + c.opened, 0);
  const totalClicked = allCampaigns.reduce((sum, c) => sum + c.clicked, 0);
  const totalBounced = allCampaigns.reduce((sum, c) => sum + (c.bounced || 0), 0);
  const totalUnsubscribed = allCampaigns.reduce((sum, c) => sum + (c.unsubscribed || 0), 0);
  const totalReplied = allCampaigns.reduce((sum, c) => sum + (c.replied || 0), 0);
  
  const emailOpenRate = totalDelivered > 0 ? Math.round((totalOpened / totalDelivered) * 100) : 0;
  const clickThroughRate = totalOpened > 0 ? Math.round((totalClicked / totalOpened) * 100) : 0;
  const avgBounceRate = totalDelivered > 0 ? Math.round((totalBounced / totalDelivered) * 100) : 0;
  const avgUnsubscribeRate = totalDelivered > 0 ? Math.round((totalUnsubscribed / totalDelivered) * 100) : 0;
  const avgReplyRate = totalDelivered > 0 ? Math.round((totalReplied / totalDelivered) * 100) : 0;
  
  const activeCampaigns = allCampaigns.filter(c => c.status === 'active').length;
  const totalCampaignsSent = allCampaigns.filter(c => c.status === 'completed').length;
  
  // Calculate average engagement score from contacts
  const avgEngagementScore = totalClients > 0 
    ? Math.round(contacts.reduce((sum, c) => sum + (c.totalInteractions || 0), 0) / totalClients)
    : 0;
  
  return {
    totalClients,
    newUsersThisWeek,
    newClientsThisMonth,
    unsubscribedThisMonth,
    emailOpenRate,
    clickThroughRate,
    avgBounceRate,
    avgUnsubscribeRate,
    avgReplyRate,
    activeCampaigns,
    totalCampaignsSent,
    avgEngagementScore
  };
};

// =============== SUBSCRIBER STATUS BADGE ===============
const ClientStatusBadge: React.FC<{ status: ClientStatus }> = ({ status }) => {
  const colors: Record<ClientStatus, string> = {
    active: 'bg-green-100 text-green-700 border-green-200',
    unsubscribed: 'bg-gray-100 text-gray-700 border-gray-200',
    pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    bounced: 'bg-red-100 text-red-700 border-red-200'
  };
  
  return (
    <span className={`px-2 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider border ${colors[status]}`}>
      {status}
    </span>
  );
};

// =============== CAMPAIGN STATUS BADGE ===============
const CampaignStatusBadge: React.FC<{ status: MarketingCampaign['status'] }> = ({ status }) => {
  const colors: Record<MarketingCampaign['status'], string> = {
    draft: 'bg-gray-100 text-gray-700 border-gray-200',
    scheduled: 'bg-blue-100 text-blue-700 border-blue-200',
    active: 'bg-green-100 text-green-700 border-green-200',
    completed: 'bg-purple-100 text-purple-700 border-purple-200',
    paused: 'bg-orange-100 text-orange-700 border-orange-200'
  };
  
  return (
    <span className={`px-2 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider border ${colors[status]}`}>
      {status}
    </span>
  );
};

// =============== PRIORITY BADGE ===============
const PriorityBadge: React.FC<{ priority: CRMTask['priority'] }> = ({ priority }) => {
  const colors = {
    low: 'bg-gray-100 text-gray-600',
    medium: 'bg-blue-100 text-blue-600',
    high: 'bg-orange-100 text-orange-600',
    urgent: 'bg-red-100 text-red-600'
  };
  
  return (
    <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase ${colors[priority]}`}>
      {priority}
    </span>
  );
};

// =============== MARKETING DASHBOARD ===============
interface MarketingDashboardProps {
  contacts: CRMContact[];
  campaigns: MarketingCampaign[];
  tasks: CRMTask[];
  onViewClients: () => void;
  onViewCampaigns: () => void;
  onViewTasks: () => void;
  onViewTemplates: () => void;
  onViewInviteTemplates: () => void;
  onViewLandingPage: () => void;
  onViewDisclaimers: () => void;
}

const MarketingDashboard: React.FC<MarketingDashboardProps> = ({ 
  contacts, campaigns, tasks, 
  onViewClients, onViewCampaigns, onViewTasks, 
  onViewTemplates, onViewInviteTemplates, onViewLandingPage, onViewDisclaimers 
}) => {
  const metrics = useMemo(() => calculateMarketingMetrics(contacts, campaigns), [contacts, campaigns]);
  
  const quickActions = [
    { label: 'New Campaign', icon: <Icons.MailIcon size={18} />, color: '#6E7568', bg: 'bg-[#6E7568]', onClick: onViewCampaigns, desc: 'Create email campaign' },
    { label: 'Add Client', icon: <Icons.UsersIcon size={18} />, color: '#22C55E', bg: 'bg-green-500', onClick: onViewClients, desc: 'Add new contact' },
    { label: 'Create Task', icon: <Icons.CheckIcon size={18} />, color: '#3B82F6', bg: 'bg-blue-500', onClick: onViewTasks, desc: 'Schedule follow-up' },
    { label: 'Edit Landing', icon: <Icons.ArticleIcon size={18} />, color: '#8B5CF6', bg: 'bg-purple-500', onClick: onViewLandingPage, desc: 'Customize invite page' },
  ];
  
  const statCards = [
    { label: 'Total Users', value: metrics.totalClients, subValue: `+${metrics.newUsersThisWeek} this week`, icon: <Icons.UsersIcon />, color: '#6E7568', onClick: onViewClients },
    { label: 'New This Month', value: metrics.newClientsThisMonth, icon: <Icons.TrendUpIcon />, color: '#22C55E' },
    { label: 'Open Rate', value: `${metrics.emailOpenRate}%`, icon: <Icons.MessageIcon />, color: '#3B82F6' },
    { label: 'Click Rate', value: `${metrics.clickThroughRate}%`, icon: <Icons.TrendUpIcon />, color: '#8B5CF6' },
    { label: 'Bounce Rate', value: `${metrics.avgBounceRate}%`, icon: <Icons.TrendUpIcon />, color: '#EF4444' },
    { label: 'Unsubscribe Rate', value: `${metrics.avgUnsubscribeRate}%`, icon: <Icons.TrendUpIcon />, color: '#F97316' },
    { label: 'Reply Rate', value: `${metrics.avgReplyRate}%`, icon: <Icons.MessageIcon />, color: '#14B8A6' },
    { label: 'Active Campaigns', value: metrics.activeCampaigns, icon: <Icons.MailIcon />, color: '#F59E0B', onClick: onViewCampaigns },
    { label: 'Email Templates', value: 'Manage', icon: <Icons.TemplateIcon />, color: '#EC4899', onClick: onViewTemplates },
    { label: 'Invite Templates', value: 'Edit', icon: <Icons.ShareIcon />, color: '#10B981', onClick: onViewInviteTemplates },
    { label: 'Landing Page', value: 'Customize', icon: <Icons.ArticleIcon />, color: '#8B5CF6', onClick: onViewLandingPage },
    { label: 'Disclaimers', value: 'Edit', icon: <Icons.ShieldIcon />, color: '#F97316', onClick: onViewDisclaimers },
    { label: 'Tasks Due Today', value: tasks.filter(t => t.status === 'pending').length, icon: <Icons.CalendarIcon />, color: '#EF4444', onClick: onViewTasks }
  ];
  
  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end border-b border-[#26150B]/5 pb-4">
        <div>
          <h1 className="text-xl md:text-3xl font-extrabold text-[#26150B] tracking-tight">Marketing Hub</h1>
          <p className="text-sm text-[#6E7568] mt-1 font-medium">Email Marketing & Subscriber Management</p>
        </div>
      </div>
      
      {/* Quick Actions - Polished */}
      <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#6E7568] to-[#4a524e] p-1">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSA2MCAwIEwgMCAwIDAgNjAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2ZmZmZmZi0wLjA1IiBzdHJva2Utd2lkdGg9IjAuNSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-30"></div>
        <div className="relative bg-[#6E7568]/95 backdrop-blur-sm rounded-[1.9rem] p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <h2 className="text-xl md:text-2xl font-extrabold text-[#FBF7EF] tracking-tight">Quick Actions</h2>
              <p className="text-sm text-[#FBF7EF]/70 mt-1 font-medium">Jump into your most common marketing tasks</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {quickActions.map((action, i) => (
                <button
                  key={i}
                  onClick={action.onClick}
                  className="group flex flex-col items-center gap-2 p-4 rounded-2xl bg-white/10 hover:bg-white/20 transition-all duration-200 cursor-pointer border border-white/5 hover:border-white/20 hover:shadow-lg hover:shadow-black/10 hover:-translate-y-1"
                >
                  <div className={`w-10 h-10 rounded-full ${action.bg} flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform duration-200`}>
                    {action.icon}
                  </div>
                  <span className="text-xs font-bold text-[#FBF7EF] text-center">{action.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {statCards.map((stat, i) => (
          <div 
            key={i}
            onClick={stat.onClick}
            className={`bg-white rounded-2xl p-5 border border-[#6E7568]/10 shadow-sm hover:shadow-lg transition-all ${stat.onClick ? 'cursor-pointer hover:-translate-y-1' : ''}`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: `${stat.color}20` }}>
                {React.cloneElement(stat.icon, { size: 16, className: 'text-current' })}
              </div>
            </div>
            <p className="text-2xl font-extrabold text-[#26150B]">{stat.value}</p>
            {stat.subValue && <p className="text-[9px] text-[#22C55E] font-bold mt-0.5">{stat.subValue}</p>}
            <p className="text-[9px] text-[#6E7568] font-bold uppercase tracking-wider mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Email Analytics Compact Card */}
      <div className="bg-white rounded-[2rem] p-6 border border-[#6E7568]/10 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-[#6E7568]/10 flex items-center justify-center">
            <Icons.MailIcon size={20} className="text-[#6E7568]" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#26150B]">Email Analytics</h3>
            <p className="text-[10px] text-[#6E7568]">Campaign performance metrics</p>
          </div>
        </div>
        <div className="grid grid-cols-5 gap-4">
          <div className="text-center p-3 bg-[#FBF7EF]/50 rounded-xl">
            <p className="text-xl font-extrabold text-[#26150B]">{metrics.emailOpenRate}%</p>
            <p className="text-[8px] text-[#6E7568] font-bold uppercase tracking-wider mt-1">Open Rate</p>
          </div>
          <div className="text-center p-3 bg-[#FBF7EF]/50 rounded-xl">
            <p className="text-xl font-extrabold text-[#26150B]">{metrics.clickThroughRate}%</p>
            <p className="text-[8px] text-[#6E7568] font-bold uppercase tracking-wider mt-1">Click Rate</p>
          </div>
          <div className="text-center p-3 bg-[#FBF7EF]/50 rounded-xl">
            <p className="text-xl font-extrabold text-[#26150B]">{metrics.avgBounceRate}%</p>
            <p className="text-[8px] text-[#6E7568] font-bold uppercase tracking-wider mt-1">Bounce</p>
          </div>
          <div className="text-center p-3 bg-[#FBF7EF]/50 rounded-xl">
            <p className="text-xl font-extrabold text-[#26150B]">{metrics.avgUnsubscribeRate}%</p>
            <p className="text-[8px] text-[#6E7568] font-bold uppercase tracking-wider mt-1">Unsub</p>
          </div>
          <div className="text-center p-3 bg-[#FBF7EF]/50 rounded-xl">
            <p className="text-xl font-extrabold text-[#26150B]">{metrics.avgReplyRate}%</p>
            <p className="text-[8px] text-[#6E7568] font-bold uppercase tracking-wider mt-1">Reply</p>
          </div>
        </div>
      </div>

      
      
      {/* Recent Clients & Upcoming Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Clients */}
        <div className="bg-white rounded-[2rem] p-6 border border-[#6E7568]/10 shadow-sm">
          <div className="flex justify-between items-center mb-6 border-b border-[#FBF7EF] pb-4">
            <h3 className="text-xs font-bold text-[#26150B] uppercase tracking-wider">Recent Clients</h3>
            <button onClick={onViewClients} className="text-[10px] font-bold text-[#6E7568] hover:text-[#26150B] bg-[#FBF7EF] px-3 py-1 rounded-full transition-colors">View All</button>
          </div>
          <div className="space-y-3">
            {contacts.slice(0, 5).map(contact => (
              <div key={contact.id} className="flex items-center justify-between p-3 bg-[#FBF7EF]/50 rounded-xl hover:bg-[#FBF7EF] transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#6E7568] text-[#FBF7EF] flex items-center justify-center text-sm font-bold">
                    {contact.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[#26150B]">{contact.name}</p>
                    <p className="text-[10px] text-[#6E7568]">{contact.email}</p>
                  </div>
                </div>
                <ClientStatusBadge status={contact.status === 'churned' ? 'unsubscribed' : contact.status === 'new_inquiry' ? 'pending' : 'active'} />
              </div>
            ))}
            {contacts.length === 0 && (
              <div className="text-center py-8 text-[#6E7568]/40 text-xs italic">No clients yet</div>
            )}
          </div>
        </div>
        
        {/* Upcoming Tasks */}
        <div className="bg-white rounded-[2rem] p-6 border border-[#6E7568]/10 shadow-sm">
          <div className="flex justify-between items-center mb-6 border-b border-[#FBF7EF] pb-4">
            <h3 className="text-xs font-bold text-[#26150B] uppercase tracking-wider">Marketing Tasks</h3>
            <button onClick={onViewTasks} className="text-[10px] font-bold text-[#6E7568] hover:text-[#26150B] bg-[#FBF7EF] px-3 py-1 rounded-full transition-colors">View All</button>
          </div>
          <div className="space-y-3">
            {tasks.filter(t => t.status === 'pending').slice(0, 5).map(task => (
              <div key={task.id} className="flex items-center justify-between p-3 bg-[#FBF7EF]/50 rounded-xl hover:bg-[#FBF7EF] transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#6E7568]/10 flex items-center justify-center">
                    <Icons.CalendarIcon size={14} className="text-[#6E7568]" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[#26150B]">{task.title}</p>
                    <p className="text-[10px] text-[#6E7568]">Due: {formatDate(task.dueDate)}</p>
                  </div>
                </div>
                <PriorityBadge priority={task.priority} />
              </div>
            ))}
            {tasks.length === 0 && (
              <div className="text-center py-8 text-[#6E7568]/40 text-xs italic">No tasks yet</div>
            )}
          </div>
        </div>
      </div>
      
      {/* Campaign Performance */}
      <div className="bg-white rounded-[2rem] p-6 border border-[#6E7568]/10 shadow-sm">
        <div className="flex justify-between items-center mb-6 border-b border-[#FBF7EF] pb-4">
          <h3 className="text-xs font-bold text-[#26150B] uppercase tracking-wider">Recent Campaigns</h3>
          <button onClick={onViewCampaigns} className="text-[10px] font-bold text-[#6E7568] hover:text-[#26150B] bg-[#FBF7EF] px-3 py-1 rounded-full transition-colors">View All</button>
        </div>
        <div className="grid gap-4">
          {campaigns.slice(0, 3).map(campaign => (
            <div key={campaign.id} className="flex items-center justify-between p-4 bg-[#FBF7EF]/50 rounded-xl">
              <div>
                <p className="text-sm font-bold text-[#26150B]">{campaign.name}</p>
                <p className="text-[10px] text-[#6E7568]">{campaign.subject}</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-sm font-bold text-[#26150B]">{campaign.recipients} sent</p>
                  <p className="text-[10px] text-[#6E7568]">{campaign.delivered} delivered</p>
                </div>
                <CampaignStatusBadge status={campaign.status} />
              </div>
            </div>
          ))}
          {campaigns.length === 0 && (
            <div className="text-center py-8 text-[#6E7568]/40 text-xs italic">
              No campaigns yet. Create your first email campaign!
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// =============== SUBSCRIBERS LIST VIEW ===============
interface ClientsListProps {
  contacts: CRMContact[];
  onSelectSubscriber: (contact: CRMContact) => void;
  onAddSubscriber: () => void;
}

const ClientsList: React.FC<ClientsListProps> = ({ contacts, onSelectSubscriber, onAddSubscriber }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ClientStatus | 'all'>('all');
  
  const filteredContacts = useMemo(() => {
    return contacts.filter(c => {
      const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           c.email.toLowerCase().includes(searchTerm.toLowerCase());
      let matchesStatus = statusFilter === 'all';
      if (statusFilter === 'active') matchesStatus = c.status !== 'churned';
      if (statusFilter === 'unsubscribed') matchesStatus = c.status === 'churned';
      if (statusFilter === 'pending') matchesStatus = c.status === 'new_inquiry';
      return matchesSearch && matchesStatus;
    });
  }, [contacts, searchTerm, statusFilter]);
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#26150B]/5 pb-4">
        <div>
          <h1 className="text-xl md:text-3xl font-extrabold text-[#26150B] tracking-tight">Clients</h1>
          <p className="text-sm text-[#6E7568] mt-1 font-medium">Manage your email audience</p>
        </div>
        <button 
          onClick={onAddSubscriber}
          className="btn-primary rounded-full py-3 px-6 flex items-center gap-2 text-xs font-bold uppercase tracking-wider cursor-pointer shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all"
        >
          <Icons.PlusIcon size={16}/> Add Client
        </button>
      </div>
       
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Icons.SearchIcon size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6E7568]/50" />
          <input 
            type="text"
            placeholder="Search clients..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl bg-white border border-[#6E7568]/10 text-[#26150B] text-sm focus:border-[#6E7568]/50 outline-none transition-all shadow-sm"
          />
        </div>
        <select 
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as ClientStatus | 'all')}
          className="px-4 py-3 rounded-xl bg-white border border-[#6E7568]/10 text-[#26150B] text-sm outline-none shadow-sm cursor-pointer"
        >
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="pending">Pending</option>
          <option value="unsubscribed">Unsubscribed</option>
          <option value="bounced">Bounced</option>
        </select>
      </div>
      
      {/* Clients Grid */}
      <div className="grid gap-4">
        {filteredContacts.map(contact => (
          <motion.div 
            key={contact.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => onSelectSubscriber(contact)}
            className="bg-white rounded-[1.5rem] p-6 border border-[#6E7568]/10 shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer hover:-translate-y-0.5 group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-[#6E7568] text-[#FBF7EF] flex items-center justify-center text-lg font-bold group-hover:scale-110 transition-transform">
                  {contact.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-[#26150B] font-bold text-lg group-hover:text-[#6E7568] transition-colors">{contact.name}</h3>
                  <p className="text-xs text-[#6E7568]">{contact.email} {contact.phone && `� ${contact.phone}`}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right mr-4">
                  <p className="text-sm font-bold text-[#26150B]">{contact.totalInteractions || 0}</p>
                  <p className="text-[10px] text-[#6E7568]">Interactions</p>
                </div>
                <ClientStatusBadge status={contact.status === 'churned' ? 'unsubscribed' : contact.status === 'new_inquiry' ? 'pending' : 'active'} />
              </div>
            </div>
            
            {contact.tags.length > 0 && (
              <div className="flex gap-2 mt-4 flex-wrap">
                {contact.tags.map(tag => (
                  <span key={tag} className="px-2 py-1 bg-[#FBF7EF] text-[#6E7568] rounded-lg text-[9px] font-bold uppercase tracking-wide border border-[#6E7568]/10">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </motion.div>
        ))}
        {filteredContacts.length === 0 && (
          <div className="text-center py-16 text-[#6E7568]/40 text-sm italic bg-[#FBF7EF]/30 rounded-[2rem] border-2 border-dashed border-[#6E7568]/10">
            No clients found. Click "Add Client" to get started.
          </div>
        )}
      </div>
    </div>
  );
};

// =============== SUBSCRIBER DETAIL VIEW ===============
interface SubscriberDetailProps {
  contact: CRMContact;
  onBack: () => void;
  onUpdate: (contact: CRMContact) => void;
  onDelete: (id: string) => void;
  onShowToast: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
  currentUserId: string;
}

const SubscriberDetail: React.FC<SubscriberDetailProps> = ({ 
  contact, onBack, onUpdate, onDelete, onShowToast, currentUserId 
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'activity' | 'tasks' | 'notes'>('overview');
  const [showAddNote, setShowAddNote] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', dueDate: '', priority: 'medium' as CRMTask['priority'] });
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState(contact);
  const [tasks, setTasks] = useState<CRMTask[]>([]);
  
  useEffect(() => {
    const loadTasks = async () => {
      const contactTasks = await db.getCRMTasksByContact(contact.id);
      setTasks(contactTasks);
    };
    loadTasks();
  }, [contact.id]);
  
  const handleAddNote = () => {
    if (!newNote.trim()) return;
    
    const note: CRMNote = {
      id: `note-${Date.now()}`,
      contactId: contact.id,
      content: newNote,
      createdBy: currentUserId,
      createdAt: new Date().toISOString(),
      isPinned: false
    };
    
    db.addCRMNote(contact.id, note);
    const updated = { ...contact, notes: [...contact.notes, note], updatedAt: new Date().toISOString() };
    onUpdate(updated);
    setNewNote('');
    setShowAddNote(false);
    onShowToast('Note added successfully!', 'success');
  };
  
  const handleAddTask = () => {
    if (!newTask.title.trim() || !newTask.dueDate) return;
    
    const task: CRMTask = {
      id: `task-${Date.now()}`,
      contactId: contact.id,
      title: newTask.title,
      dueDate: newTask.dueDate,
      priority: newTask.priority,
      status: 'pending',
      assignedTo: currentUserId,
      createdAt: new Date().toISOString(),
      reminders: []
    };
    
    db.addCRMTask(task);
    setNewTask({ title: '', dueDate: '', priority: 'medium' });
    setShowAddTask(false);
    onShowToast('Task created successfully!', 'success');
  };
  
  const handleStatusChange = (newStatus: ClientStatus) => {
    const leadStatus: LeadStatus = newStatus === 'unsubscribed' ? 'churned' : 
                                   newStatus === 'pending' ? 'new_inquiry' : 'active';
    
    const activity: CRMActivity = {
      id: `act-${Date.now()}`,
      contactId: contact.id,
      type: 'status_change',
      title: `Subscription status changed to ${newStatus}`,
      timestamp: new Date().toISOString(),
      createdBy: currentUserId,
      metadata: { oldStatus: contact.status, newStatus: leadStatus }
    };
    
    const updated = { ...contact, status: leadStatus, updatedAt: new Date().toISOString() };
    db.updateCRMContact(updated);
    db.addCRMActivity(contact.id, activity);
    onUpdate(updated);
    onShowToast('Status updated!', 'success');
  };
  
  const handleSaveEdit = () => {
    db.updateCRMContact(editData);
    onUpdate(editData);
    setIsEditing(false);
    onShowToast('Subscriber updated!', 'success');
  };
  
  const getClientStatus = (): ClientStatus => {
    if (contact.status === 'churned') return 'unsubscribed';
    if (contact.status === 'new_inquiry') return 'pending';
    return 'active';
  };
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 border-b border-[#26150B]/5 pb-4">
        <button onClick={onBack} className="p-2 hover:bg-[#FBF7EF] rounded-xl transition-colors">
          <Icons.ArrowLeftIcon size={20} className="text-[#6E7568]" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl md:text-2xl font-extrabold text-[#26150B] tracking-tight">{contact.name}</h1>
          <p className="text-sm text-[#6E7568]">{contact.email}</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setIsEditing(!isEditing)}
            className="p-2 hover:bg-[#FBF7EF] rounded-xl transition-colors text-[#6E7568]"
          >
            <Icons.EditIcon size={18} />
          </button>
          <button 
            onClick={() => {
              if (window.confirm('Delete this client?')) {
                onDelete(contact.id);
                onBack();
              }
            }}
            className="p-2 hover:bg-red-50 rounded-xl transition-colors text-red-500"
          >
            <Icons.TrashIcon size={18} />
          </button>
        </div>
      </div>
      
      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-[#6E7568]/10">
          <p className="text-[9px] font-bold text-[#6E7568] uppercase tracking-wider mb-1">Status</p>
          <select 
            value={getClientStatus()}
            onChange={e => handleStatusChange(e.target.value as ClientStatus)}
            className="w-full bg-transparent text-sm font-bold text-[#26150B] outline-none cursor-pointer"
          >
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="unsubscribed">Unsubscribed</option>
            <option value="bounced">Bounced</option>
          </select>
        </div>
        <div className="bg-white rounded-xl p-4 border border-[#6E7568]/10">
          <p className="text-[9px] font-bold text-[#6E7568] uppercase tracking-wider mb-1">Interactions</p>
          <p className="text-lg font-bold text-[#26150B]">{contact.totalInteractions || 0}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-[#6E7568]/10">
          <p className="text-[9px] font-bold text-[#6E7568] uppercase tracking-wider mb-1">Source</p>
          <p className="text-sm font-bold text-[#26150B] capitalize">{contact.source}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-[#6E7568]/10">
          <p className="text-[9px] font-bold text-[#6E7568] uppercase tracking-wider mb-1">Subscribed</p>
          <p className="text-sm font-bold text-[#26150B]">
            {formatDate(contact.createdAt)}
          </p>
        </div>
      </div>
      
      {/* Tabs */}
      <div className="flex gap-2 border-b border-[#6E7568]/10 pb-2">
        {(['overview', 'activity', 'tasks', 'notes'] as const).map(tab => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
              activeTab === tab 
                ? 'bg-[#6E7568] text-[#FBF7EF] shadow-md' 
                : 'text-[#6E7568] hover:bg-[#FBF7EF]'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>
      
      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'overview' && (
          <motion.div 
            key="overview"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            {/* Contact Info */}
            <div className="bg-white rounded-[2rem] p-6 border border-[#6E7568]/10 shadow-sm">
              <h3 className="text-xs font-bold text-[#26150B] uppercase tracking-wider mb-4">Subscriber Information</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-[9px] font-bold text-[#6E7568] uppercase tracking-wider mb-1">Email</p>
                  <p className="text-sm text-[#26150B]">{contact.email}</p>
                </div>
                <div>
                  <p className="text-[9px] font-bold text-[#6E7568] uppercase tracking-wider mb-1">Phone</p>
                  <p className="text-sm text-[#26150B]">{contact.phone || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-[9px] font-bold text-[#6E7568] uppercase tracking-wider mb-1">Company</p>
                  <p className="text-sm text-[#26150B]">{contact.company || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-[9px] font-bold text-[#6E7568] uppercase tracking-wider mb-1">Tags</p>
                  <div className="flex gap-2 flex-wrap">
                    {contact.tags.map(tag => (
                      <span key={tag} className="px-2 py-1 bg-[#FBF7EF] text-[#6E7568] rounded-lg text-[9px] font-bold uppercase tracking-wide border border-[#6E7568]/10">
                        {tag}
                      </span>
                    ))}
                    {contact.tags.length === 0 && <span className="text-sm text-[#6E7568]/50">No tags</span>}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Quick Actions */}
            <div className="space-y-6">
              <div className="bg-white rounded-[2rem] p-6 border border-[#6E7568]/10 shadow-sm">
                <h3 className="text-xs font-bold text-[#26150B] uppercase tracking-wider mb-4">Quick Actions</h3>
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => setShowAddNote(true)}
                    className="p-4 rounded-xl bg-[#FBF7EF] hover:bg-[#6E7568] hover:text-[#FBF7EF] transition-all text-[#6E7568] flex flex-col items-center gap-2"
                  >
                    <Icons.ArticleIcon size={20} />
                    <span className="text-[9px] font-bold uppercase tracking-wider">Add Note</span>
                  </button>
                  <button 
                    onClick={() => setShowAddTask(true)}
                    className="p-4 rounded-xl bg-[#FBF7EF] hover:bg-[#6E7568] hover:text-[#FBF7EF] transition-all text-[#6E7568] flex flex-col items-center gap-2"
                  >
                    <Icons.CalendarIcon size={20} />
                    <span className="text-[9px] font-bold uppercase tracking-wider">Create Task</span>
                  </button>
                  <button 
                    onClick={() => window.open(`mailto:${contact.email}`)}
                    className="p-4 rounded-xl bg-[#FBF7EF] hover:bg-[#6E7568] hover:text-[#FBF7EF] transition-all text-[#6E7568] flex flex-col items-center gap-2"
                  >
                    <Icons.MessageIcon size={20} />
                    <span className="text-[9px] font-bold uppercase tracking-wider">Send Email</span>
                  </button>
                  {contact.phone && (
                    <button 
                      onClick={() => window.open(`tel:${contact.phone}`)}
                      className="p-4 rounded-xl bg-[#FBF7EF] hover:bg-[#6E7568] hover:text-[#FBF7EF] transition-all text-[#6E7568] flex flex-col items-center gap-2"
                    >
                      <Icons.PhoneIcon size={20} />
                      <span className="text-[9px] font-bold uppercase tracking-wider">Call</span>
                    </button>
                  )}
                </div>
              </div>
              
              {/* Recent Activity */}
              <div className="bg-white rounded-[2rem] p-6 border border-[#6E7568]/10 shadow-sm">
                <h3 className="text-xs font-bold text-[#26150B] uppercase tracking-wider mb-4">Recent Activity</h3>
                <div className="space-y-3">
                  {contact.activities.slice(-5).reverse().map(activity => (
                    <div key={activity.id} className="flex items-start gap-3 p-2 bg-[#FBF7EF]/50 rounded-lg">
                      <div className="w-6 h-6 rounded-full bg-[#6E7568]/10 flex items-center justify-center flex-shrink-0">
                        {activity.type === 'call' && <Icons.PhoneIcon size={12} className="text-[#6E7568]" />}
                        {activity.type === 'email' && <Icons.MessageIcon size={12} className="text-[#6E7568]" />}
                        {activity.type === 'meeting' && <Icons.CalendarIcon size={12} className="text-[#6E7568]" />}
                        {activity.type === 'note' && <Icons.ArticleIcon size={12} className="text-[#6E7568]" />}
                        {activity.type === 'status_change' && <Icons.TrendUpIcon size={12} className="text-[#6E7568]" />}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[#26150B]">{activity.title}</p>
                        <p className="text-[9px] text-[#6E7568]">{formatDate(activity.timestamp)}</p>
                      </div>
                    </div>
                  ))}
                  {contact.activities.length === 0 && (
                    <p className="text-xs text-[#6E7568]/50 text-center py-4">No activity yet</p>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
        
        {activeTab === 'activity' && (
          <motion.div 
            key="activity"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-white rounded-[2rem] p-6 border border-[#6E7568]/10 shadow-sm"
          >
            <h3 className="text-xs font-bold text-[#26150B] uppercase tracking-wider mb-6">Activity Timeline</h3>
            <div className="space-y-4">
              {contact.activities.slice().reverse().map(activity => (
                <div key={activity.id} className="flex items-start gap-4 p-4 bg-[#FBF7EF]/50 rounded-xl">
                  <div className="w-10 h-10 rounded-full bg-[#6E7568]/10 flex items-center justify-center flex-shrink-0">
                    {activity.type === 'call' && <Icons.PhoneIcon size={16} className="text-[#6E7568]" />}
                    {activity.type === 'email' && <Icons.MessageIcon size={16} className="text-[#6E7568]" />}
                    {activity.type === 'meeting' && <Icons.CalendarIcon size={16} className="text-[#6E7568]" />}
                    {activity.type === 'note' && <Icons.ArticleIcon size={16} className="text-[#6E7568]" />}
                    {activity.type === 'status_change' && <Icons.TrendUpIcon size={16} className="text-[#6E7568]" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-[#26150B]">{activity.title}</p>
                    {activity.description && (
                      <p className="text-xs text-[#6E7568] mt-1">{activity.description}</p>
                    )}
                    <p className="text-[9px] text-[#6E7568]/60 mt-2">{formatDate(activity.timestamp)} at {formatTime(activity.timestamp)}</p>
                  </div>
                </div>
              ))}
              {contact.activities.length === 0 && (
                <p className="text-xs text-[#6E7568]/50 text-center py-8">No activity recorded</p>
              )}
            </div>
          </motion.div>
        )}
        
        {activeTab === 'tasks' && (
          <motion.div 
            key="tasks"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold text-[#26150B] uppercase tracking-wider">Tasks ({tasks.length})</h3>
              <button 
                onClick={() => setShowAddTask(true)}
                className="btn-primary rounded-xl py-2 px-4 text-xs font-bold uppercase tracking-wider flex items-center gap-2"
              >
                <Icons.PlusIcon size={14} /> Add Task
              </button>
            </div>
            
            <div className="grid gap-3">
              {tasks.map(task => (
                <div key={task.id} className="bg-white rounded-xl p-4 border border-[#6E7568]/10 shadow-sm flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => {
                        db.completeCRMTask(task.id, currentUserId);
                        onShowToast('Task completed!', 'success');
                      }}
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                        task.status === 'completed' 
                          ? 'bg-green-500 border-green-500 text-white' 
                          : 'border-[#6E7568]/30 hover:border-[#6E7568]'
                      }`}
                    >
                      {task.status === 'completed' && <Icons.CheckIcon size={12} />}
                    </button>
                    <div>
                      <p className={`text-sm font-bold ${task.status === 'completed' ? 'text-[#6E7568]/50 line-through' : 'text-[#26150B]'}`}>
                        {task.title}
                      </p>
                      <p className="text-[10px] text-[#6E7568]">Due: {formatDate(task.dueDate)}</p>
                    </div>
                  </div>
                  <PriorityBadge priority={task.priority} />
                </div>
              ))}
              {tasks.length === 0 && (
                <p className="text-xs text-[#6E7568]/50 text-center py-8 bg-white rounded-xl border border-[#6E7568]/10">No tasks yet</p>
              )}
            </div>
          </motion.div>
        )}
        
        {activeTab === 'notes' && (
          <motion.div 
            key="notes"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold text-[#26150B] uppercase tracking-wider">Notes ({contact.notes.length})</h3>
              <button 
                onClick={() => setShowAddNote(true)}
                className="btn-primary rounded-xl py-2 px-4 text-xs font-bold uppercase tracking-wider flex items-center gap-2"
              >
                <Icons.PlusIcon size={14} /> Add Note
              </button>
            </div>
            
            <div className="grid gap-3">
              {contact.notes.slice().reverse().map(note => (
                <div key={note.id} className="bg-white rounded-xl p-4 border border-[#6E7568]/10 shadow-sm">
                  <p className="text-sm text-[#26150B] whitespace-pre-wrap">{note.content}</p>
                  <p className="text-[9px] text-[#6E7568]/60 mt-3">{formatDate(note.createdAt)}</p>
                </div>
              ))}
              {contact.notes.length === 0 && (
                <p className="text-xs text-[#6E7568]/50 text-center py-8 bg-white rounded-xl border border-[#6E7568]/10">No notes yet</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Add Note Modal */}
      {showAddNote && (
        <div className="fixed inset-0 bg-[#26150B]/60 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="bg-[#FBF7EF] rounded-[2rem] p-8 w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-bold text-[#26150B] mb-6">Add Note</h2>
            <textarea 
              value={newNote}
              onChange={e => setNewNote(e.target.value)}
              placeholder="Enter your note..."
              className="w-full h-32 p-4 rounded-xl bg-white border border-[#6E7568]/10 text-[#26150B] text-sm resize-none outline-none focus:border-[#6E7568]/50"
            />
            <div className="flex gap-3 mt-6">
              <button 
                onClick={() => setShowAddNote(false)}
                className="flex-1 py-3 rounded-xl bg-[#6E7568]/10 text-[#6E7568] text-xs font-bold uppercase tracking-wider hover:bg-[#6E7568]/20 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleAddNote}
                className="flex-1 py-3 rounded-xl bg-[#6E7568] text-[#FBF7EF] text-xs font-bold uppercase tracking-wider hover:bg-[#5a6155] transition-colors"
              >
                Save Note
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Add Task Modal */}
      {showAddTask && (
        <div className="fixed inset-0 bg-[#26150B]/60 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="bg-[#FBF7EF] rounded-[2rem] p-8 w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-bold text-[#26150B] mb-6">Create Task</h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-[#6E7568] uppercase tracking-wider mb-2 block">Task Title</label>
                <input 
                  type="text"
                  value={newTask.title}
                  onChange={e => setNewTask({ ...newTask, title: e.target.value })}
                  placeholder="e.g. Send promotional email"
                  className="w-full p-4 rounded-xl bg-white border border-[#6E7568]/10 text-[#26150B] text-sm outline-none focus:border-[#6E7568]/50"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-[#6E7568] uppercase tracking-wider mb-2 block">Due Date</label>
                <input 
                  type="date"
                  value={newTask.dueDate}
                  onChange={e => setNewTask({ ...newTask, dueDate: e.target.value })}
                  className="w-full p-4 rounded-xl bg-white border border-[#6E7568]/10 text-[#26150B] text-sm outline-none focus:border-[#6E7568]/50"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-[#6E7568] uppercase tracking-wider mb-2 block">Priority</label>
                <select 
                  value={newTask.priority}
                  onChange={e => setNewTask({ ...newTask, priority: e.target.value as CRMTask['priority'] })}
                  className="w-full p-4 rounded-xl bg-white border border-[#6E7568]/10 text-[#26150B] text-sm outline-none"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button 
                onClick={() => setShowAddTask(false)}
                className="flex-1 py-3 rounded-xl bg-[#6E7568]/10 text-[#6E7568] text-xs font-bold uppercase tracking-wider hover:bg-[#6E7568]/20 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleAddTask}
                className="flex-1 py-3 rounded-xl bg-[#6E7568] text-[#FBF7EF] text-xs font-bold uppercase tracking-wider hover:bg-[#5a6155] transition-colors"
              >
                Create Task
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Edit Subscriber Modal */}
      {isEditing && (
        <div className="fixed inset-0 bg-[#26150B]/60 backdrop-blur-md z-[200] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#FBF7EF] rounded-[2rem] p-8 w-full max-w-lg shadow-2xl my-8">
            <h2 className="text-xl font-bold text-[#26150B] mb-6">Edit Subscriber</h2>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
              <div>
                <label className="text-xs font-bold text-[#6E7568] uppercase tracking-wider mb-2 block">Name</label>
                <input 
                  type="text"
                  value={editData.name}
                  onChange={e => setEditData({ ...editData, name: e.target.value })}
                  className="w-full p-4 rounded-xl bg-white border border-[#6E7568]/10 text-[#26150B] text-sm outline-none focus:border-[#6E7568]/50"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-[#6E7568] uppercase tracking-wider mb-2 block">Email</label>
                <input 
                  type="email"
                  value={editData.email}
                  onChange={e => setEditData({ ...editData, email: e.target.value })}
                  className="w-full p-4 rounded-xl bg-white border border-[#6E7568]/10 text-[#26150B] text-sm outline-none focus:border-[#6E7568]/50"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-[#6E7568] uppercase tracking-wider mb-2 block">Phone</label>
                <input 
                  type="tel"
                  value={editData.phone || ''}
                  onChange={e => setEditData({ ...editData, phone: e.target.value })}
                  className="w-full p-4 rounded-xl bg-white border border-[#6E7568]/10 text-[#26150B] text-sm outline-none focus:border-[#6E7568]/50"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-[#6E7568] uppercase tracking-wider mb-2 block">Company</label>
                <input 
                  type="text"
                  value={editData.company || ''}
                  onChange={e => setEditData({ ...editData, company: e.target.value })}
                  className="w-full p-4 rounded-xl bg-white border border-[#6E7568]/10 text-[#26150B] text-sm outline-none focus:border-[#6E7568]/50"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-[#6E7568] uppercase tracking-wider mb-2 block">Source</label>
                <select 
                  value={editData.source}
                  onChange={e => setEditData({ ...editData, source: e.target.value as LeadSource })}
                  className="w-full p-4 rounded-xl bg-white border border-[#6E7568]/10 text-[#26150B] text-sm outline-none"
                >
                  <option value="website">Website</option>
                  <option value="referral">Referral</option>
                  <option value="social">Social Media</option>
                  <option value="event">Event</option>
                  <option value="direct">Direct</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-[#6E7568] uppercase tracking-wider mb-2 block">Tags (comma separated)</label>
                <input 
                  type="text"
                  value={editData.tags.join(', ')}
                  onChange={e => setEditData({ ...editData, tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) })}
                  className="w-full p-4 rounded-xl bg-white border border-[#6E7568]/10 text-[#26150B] text-sm outline-none focus:border-[#6E7568]/50"
                  placeholder="Fitness, Newsletter, VIP"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button 
                onClick={() => setIsEditing(false)}
                className="flex-1 py-3 rounded-xl bg-[#6E7568]/10 text-[#6E7568] text-xs font-bold uppercase tracking-wider hover:bg-[#6E7568]/20 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveEdit}
                className="flex-1 py-3 rounded-xl bg-[#6E7568] text-[#FBF7EF] text-xs font-bold uppercase tracking-wider hover:bg-[#5a6155] transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// =============== CAMPAIGNS VIEW ===============
interface CampaignsViewProps {
  campaigns: MarketingCampaign[];
  onAddCampaign: () => void;
  onEditCampaign: (campaign: MarketingCampaign) => void;
  onDeleteCampaign: (id: string) => void;
  onSendCampaign: (id: string) => void;
  onShowToast: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

const CampaignsView: React.FC<CampaignsViewProps> = ({ 
  campaigns, onAddCampaign, onEditCampaign, onDeleteCampaign, onSendCampaign, onShowToast 
}) => {
  const [statusFilter, setStatusFilter] = useState<MarketingCampaign['status'] | 'all'>('all');
  
  const filteredCampaigns = useMemo(() => {
    if (statusFilter === 'all') return campaigns;
    return campaigns.filter(c => c.status === statusFilter);
  }, [campaigns, statusFilter]);
  
  const getStatusColor = (status: MarketingCampaign['status']) => {
    const colors: Record<MarketingCampaign['status'], string> = {
      draft: 'text-gray-600 bg-gray-50',
      scheduled: 'text-blue-600 bg-blue-50',
      active: 'text-green-600 bg-green-50',
      completed: 'text-purple-600 bg-purple-50',
      paused: 'text-orange-600 bg-orange-50'
    };
    return colors[status];
  };
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#26150B]/5 pb-4">
        <div>
          <h1 className="text-xl md:text-3xl font-extrabold text-[#26150B] tracking-tight">Campaigns</h1>
          <p className="text-sm text-[#6E7568] mt-1 font-medium">Email marketing campaigns</p>
        </div>
        <button 
          onClick={onAddCampaign}
          className="btn-primary rounded-full py-3 px-6 flex items-center gap-2 text-xs font-bold uppercase tracking-wider cursor-pointer shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all"
        >
          <Icons.PlusIcon size={16}/> Create Campaign
        </button>
      </div>
      
      {/* Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        {(['all', 'draft', 'scheduled', 'active', 'completed', 'paused'] as const).map(status => (
          <button 
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
              statusFilter === status 
                ? 'bg-[#6E7568] text-[#FBF7EF] shadow-md' 
                : 'bg-white text-[#6E7568] border border-[#6E7568]/10 hover:border-[#6E7568]/30'
            }`}
          >
            {status}
          </button>
        ))}
      </div>
      
      {/* Campaigns Grid */}
      <div className="grid gap-4">
        {filteredCampaigns.map(campaign => (
          <motion.div 
            key={campaign.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-[1.5rem] p-6 border border-[#6E7568]/10 shadow-sm hover:shadow-lg transition-all"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-[#26150B] font-bold text-lg">{campaign.name}</h3>
                  <CampaignStatusBadge status={campaign.status} />
                </div>
                <p className="text-sm text-[#6E7568] mb-4">{campaign.subject}</p>
                
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="bg-[#FBF7EF] rounded-xl p-3">
                    <p className="text-lg font-bold text-[#26150B]">{campaign.recipients}</p>
                    <p className="text-[9px] text-[#6E7568] uppercase">Sent</p>
                  </div>
                  <div className="bg-[#FBF7EF] rounded-xl p-3">
                    <p className="text-lg font-bold text-[#26150B]">{campaign.delivered}</p>
                    <p className="text-[9px] text-[#6E7568] uppercase">Delivered</p>
                  </div>
                  <div className="bg-[#FBF7EF] rounded-xl p-3">
                    <p className="text-lg font-bold text-[#26150B]">{campaign.opened}</p>
                    <p className="text-[9px] text-[#6E7568] uppercase">Opened</p>
                  </div>
                  <div className="bg-[#FBF7EF] rounded-xl p-3">
                    <p className="text-lg font-bold text-[#26150B]">{campaign.clicked}</p>
                    <p className="text-[9px] text-[#6E7568] uppercase">Clicked</p>
                  </div>
                  <div className="bg-[#FBF7EF] rounded-xl p-3">
                    <p className="text-lg font-bold text-[#26150B]">{campaign.converted}</p>
                    <p className="text-[9px] text-[#6E7568] uppercase">Converted</p>
                  </div>
                </div>
                
                <div className="flex gap-4 mt-4">
                  {campaign.delivered > 0 && (
                    <>
                      <span className="text-xs text-[#6E7568]">
                        <strong>Open Rate:</strong> {Math.round((campaign.opened / campaign.delivered) * 100)}%
                      </span>
                      <span className="text-xs text-[#6E7568]">
                        <strong>Click Rate:</strong> {Math.round((campaign.clicked / campaign.opened) * 100)}%
                      </span>
                    </>
                  )}
                </div>
              </div>
              
              <div className="flex gap-2 ml-4">
                {(campaign.status === 'draft' || campaign.status === 'scheduled') && campaign.sendNow && (
                  <button 
                    onClick={() => onSendCampaign(campaign.id)}
                    className="p-2 hover:bg-green-50 rounded-xl transition-colors text-green-600"
                    title="Send Now"
                  >
                    <Icons.MailIcon size={18} />
                  </button>
                )}
                <button 
                  onClick={() => onEditCampaign(campaign)}
                  className="p-2 hover:bg-[#FBF7EF] rounded-xl transition-colors text-[#6E7568]"
                >
                  <Icons.EditIcon size={18} />
                </button>
                <button 
                  onClick={() => {
                    if (window.confirm('Delete this campaign?')) {
                      onDeleteCampaign(campaign.id);
                    }
                  }}
                  className="p-2 hover:bg-red-50 rounded-xl transition-colors text-red-500"
                >
                  <Icons.TrashIcon size={18} />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
        {filteredCampaigns.length === 0 && (
          <div className="text-center py-16 text-[#6E7568]/40 text-sm italic bg-[#FBF7EF]/30 rounded-[2rem] border-2 border-dashed border-[#6E7568]/10">
            No campaigns found. Click "Create Campaign" to start your first email campaign.
          </div>
        )}
      </div>
    </div>
  );
};

// =============== TASKS VIEW ===============
interface TasksViewProps {
  tasks: CRMTask[];
  contacts: CRMContact[];
  onAddTask: () => void;
  onCompleteTask: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
  currentUserId: string;
}

const MarketingTasksView: React.FC<TasksViewProps> = ({ 
  tasks, contacts, onAddTask, onCompleteTask, onDeleteTask, currentUserId 
}) => {
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed' | 'overdue'>('all');
  const now = new Date();
  
  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      if (filter === 'all') return true;
      if (filter === 'pending') return t.status === 'pending';
      if (filter === 'completed') return t.status === 'completed';
      if (filter === 'overdue') return t.status === 'pending' && new Date(t.dueDate) < now;
      return true;
    }).sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }, [tasks, filter]);
  
  const getContactName = (contactId?: string) => {
    if (!contactId) return null;
    const contact = contacts.find(c => c.id === contactId);
    return contact?.name || 'Unknown';
  };
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#26150B]/5 pb-4">
        <div>
          <h1 className="text-xl md:text-3xl font-extrabold text-[#26150B] tracking-tight">Tasks</h1>
          <p className="text-sm text-[#6E7568] mt-1 font-medium">Marketing tasks and follow-ups</p>
        </div>
        <button 
          onClick={onAddTask}
          className="btn-primary rounded-full py-3 px-6 flex items-center gap-2 text-xs font-bold uppercase tracking-wider cursor-pointer shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all"
        >
          <Icons.PlusIcon size={16}/> Add Task
        </button>
      </div>
      
      {/* Filter Tabs */}
      <div className="flex gap-2">
        {(['all', 'pending', 'completed', 'overdue'] as const).map(f => (
          <button 
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
              filter === f 
                ? 'bg-[#6E7568] text-[#FBF7EF] shadow-md' 
                : 'bg-white text-[#6E7568] border border-[#6E7568]/10 hover:border-[#6E7568]/30'
            }`}
          >
            {f} {f === 'overdue' && `(${tasks.filter(t => t.status === 'pending' && new Date(t.dueDate) < now).length})`}
          </button>
        ))}
      </div>
      
      {/* Tasks List */}
      <div className="grid gap-3">
        {filteredTasks.map(task => {
          const isOverdue = task.status === 'pending' && new Date(task.dueDate) < now;
          const contactName = getContactName(task.contactId);
          
          return (
            <div 
              key={task.id}
              className={`bg-white rounded-xl p-5 border shadow-sm flex items-center justify-between gap-4 ${
                isOverdue ? 'border-red-200 bg-red-50/30' : 'border-[#6E7568]/10'
              }`}
            >
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => onCompleteTask(task.id)}
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0 ${
                    task.status === 'completed' 
                      ? 'bg-green-500 border-green-500 text-white' 
                      : 'border-[#6E7568]/30 hover:border-[#6E7568]'
                  }`}
                >
                  {task.status === 'completed' && <Icons.CheckIcon size={12} />}
                </button>
                <div>
                  <p className={`text-sm font-bold ${task.status === 'completed' ? 'text-[#6E7568]/50 line-through' : 'text-[#26150B]'}`}>
                    {task.title}
                  </p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className={`text-[10px] ${isOverdue ? 'text-red-500 font-bold' : 'text-[#6E7568]'}`}>
                      <Icons.CalendarIcon size={10} className="inline mr-1" />
                      {formatDate(task.dueDate)}
                      {isOverdue && ' (Overdue)'}
                    </span>
                    {contactName && (
                      <span className="text-[10px] text-[#6E7568]">
                        <Icons.PersonIcon size={10} className="inline mr-1" />
                        {contactName}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <PriorityBadge priority={task.priority} />
                <button 
                  onClick={() => onDeleteTask(task.id)}
                  className="p-2 text-[#6E7568]/50 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                >
                  <Icons.TrashIcon size={14} />
                </button>
              </div>
            </div>
          );
        })}
        {filteredTasks.length === 0 && (
          <div className="text-center py-16 text-[#6E7568]/40 text-sm italic bg-[#FBF7EF]/30 rounded-[2rem] border-2 border-dashed border-[#6E7568]/10">
            No tasks found
          </div>
        )}
      </div>
    </div>
  );
};

// =============== ADD SUBSCRIBER MODAL ===============
interface AddSubscriberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (contact: CRMContact) => void;
  onShowToast: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

const AddSubscriberModal: React.FC<AddSubscriberModalProps> = ({ isOpen, onClose, onSave, onShowToast }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    position: '',
    source: 'website' as LeadSource,
    tags: '',
    notes: ''
  });
  
  const handleSubmit = () => {
    if (!formData.name || !formData.email) {
      onShowToast('Name and email are required', 'error');
      return;
    }
    
    const contact: CRMContact = {
      id: `contact-${Date.now()}`,
      name: formData.name,
      email: formData.email,
      phone: formData.phone || undefined,
      company: formData.company || undefined,
      position: formData.position || undefined,
      status: 'active',
      source: formData.source,
      isClient: false,
      primaryBodyAreas: [],
      injuries: [],
      totalSessions: 0,
      packageHistory: [],
      totalSpent: 0,
      totalInteractions: 0,
      tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
      notes: [],
      activities: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      estimatedValue: 0,
      actualValue: 0
    };
    
    onSave(contact);
    setFormData({
      name: '',
      email: '',
      phone: '',
      company: '',
      position: '',
      source: 'website',
      tags: '',
      notes: ''
    });
    onClose();
    onShowToast('Subscriber added successfully!', 'success');
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-[#26150B]/60 backdrop-blur-md z-[200] flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#FBF7EF] rounded-[2.5rem] p-8 sm:p-10 w-full max-w-lg shadow-2xl relative my-8">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-extrabold text-[#26150B] tracking-tight">Add New Subscriber</h2>
          <button onClick={onClose} className="text-[#26150B]/40 hover:text-[#26150B] hover:bg-[#26150B]/5 rounded-full p-2 transition-all">
            <Icons.XIcon />
          </button>
        </div>
        
        <div className="space-y-5 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
          <div>
            <label className="text-xs font-bold text-[#6E7568] uppercase tracking-wider mb-2 block">Name *</label>
            <input 
              type="text"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="w-full p-4 rounded-2xl bg-white text-[#26150B] border border-[#6E7568]/10 focus:border-[#6E7568]/50 outline-none transition-all shadow-sm"
              placeholder="Full name"
            />
          </div>
          
          <div>
            <label className="text-xs font-bold text-[#6E7568] uppercase tracking-wider mb-2 block">Email *</label>
            <input 
              type="email"
              value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
              className="w-full p-4 rounded-2xl bg-white text-[#26150B] border border-[#6E7568]/10 focus:border-[#6E7568]/50 outline-none transition-all shadow-sm"
              placeholder="email@example.com"
            />
          </div>
          
          <div>
            <label className="text-xs font-bold text-[#6E7568] uppercase tracking-wider mb-2 block">Phone</label>
            <input 
              type="tel"
              value={formData.phone}
              onChange={e => setFormData({ ...formData, phone: e.target.value })}
              className="w-full p-4 rounded-2xl bg-white text-[#26150B] border border-[#6E7568]/10 focus:border-[#6E7568]/50 outline-none transition-all shadow-sm"
              placeholder="+27 82 123 4567"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-[#6E7568] uppercase tracking-wider mb-2 block">Company</label>
              <input 
                type="text"
                value={formData.company}
                onChange={e => setFormData({ ...formData, company: e.target.value })}
                className="w-full p-4 rounded-2xl bg-white text-[#26150B] border border-[#6E7568]/10 focus:border-[#6E7568]/50 outline-none transition-all shadow-sm"
                placeholder="Company name"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-[#6E7568] uppercase tracking-wider mb-2 block">Source</label>
              <select 
                value={formData.source}
                onChange={e => setFormData({ ...formData, source: e.target.value as LeadSource })}
                className="w-full p-4 rounded-2xl bg-white text-[#26150B] border border-[#6E7568]/10 outline-none shadow-sm"
              >
                <option value="website">Website</option>
                <option value="referral">Referral</option>
                <option value="social">Social Media</option>
                <option value="event">Event</option>
                <option value="direct">Direct</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
          
          <div>
            <label className="text-xs font-bold text-[#6E7568] uppercase tracking-wider mb-2 block">Tags (comma separated)</label>
            <input 
              type="text"
              value={formData.tags}
              onChange={e => setFormData({ ...formData, tags: e.target.value })}
              className="w-full p-4 rounded-2xl bg-white text-[#26150B] border border-[#6E7568]/10 focus:border-[#6E7568]/50 outline-none transition-all shadow-sm"
              placeholder="Fitness, Newsletter, VIP"
            />
          </div>
          
          <div>
            <label className="text-xs font-bold text-[#6E7568] uppercase tracking-wider mb-2 block">Initial Notes</label>
            <textarea 
              value={formData.notes}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
              className="w-full p-4 rounded-2xl bg-white text-[#26150B] border border-[#6E7568]/10 focus:border-[#6E7568]/50 outline-none transition-all shadow-sm resize-none h-24"
              placeholder="Any initial notes about this client..."
            />
          </div>
        </div>
        
        <div className="flex gap-3 mt-8">
          <button 
            onClick={onClose}
            className="flex-1 py-4 rounded-2xl bg-[#6E7568]/10 text-[#6E7568] text-xs font-bold uppercase tracking-wider hover:bg-[#6E7568]/20 transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleSubmit}
            className="flex-1 py-4 rounded-2xl bg-[#6E7568] text-[#FBF7EF] text-xs font-bold uppercase tracking-wider hover:bg-[#5a6155] transition-colors shadow-lg"
          >
            Add Client
          </button>
        </div>
      </div>
    </div>
  );
};

// =============== EMAIL TEMPLATES VIEW ===============
interface EmailTemplatesViewProps {
  onShowToast: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

const EmailTemplatesView: React.FC<EmailTemplatesViewProps> = ({ onShowToast }) => {
  const [templates, setTemplates] = useState<CRMEmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<CRMEmailTemplate | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  
  const loadTemplates = async () => {
    setLoading(true);
    try {
      const data = await db.getCRMEmailTemplates();
      setTemplates(data);
    } catch (err) {
      console.error('Failed to load templates:', err);
      onShowToast('Failed to load templates', 'error');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    loadTemplates();
  }, []);

  // Auto-seed prebuilt templates on first load
  useEffect(() => {
    const seedIfNeeded = async () => {
      if (templates.length === 0) {
        await db.seedPrebuiltTemplates();
        await loadTemplates();
      }
    };
    seedIfNeeded();
  }, []);
  
  // Marketing-focused categories
  const categories = ['welcome', 'newsletter', 'promotion', 'class_reminder', 're_engagement', 'thank_you', 'other'];
  
  const filteredTemplates = useMemo(() => {
    return templates.filter(t => {
      const matchesSearch = t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           t.subject.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || t.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [templates, searchTerm, categoryFilter]);
  
  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this template?')) return;
    try {
      await db.deleteCRMEmailTemplate(id);
      await loadTemplates();
      onShowToast('Template deleted', 'success');
    } catch (err) {
      onShowToast('Failed to delete template', 'error');
    }
  };
  
  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      welcome: 'bg-green-100 text-green-700',
      newsletter: 'bg-blue-100 text-blue-700',
      promotion: 'bg-orange-100 text-orange-700',
      class_reminder: 'bg-purple-100 text-purple-700',
      re_engagement: 'bg-pink-100 text-pink-700',
      thank_you: 'bg-yellow-100 text-yellow-700',
      other: 'bg-gray-100 text-gray-700'
    };
    return colors[category] || colors.other;
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#6E7568]"></div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#26150B]/5 pb-4">
        <div>
          <h1 className="text-xl md:text-3xl font-extrabold text-[#26150B] tracking-tight">Email Templates</h1>
          <p className="text-sm text-[#6E7568] mt-1 font-medium">Marketing email templates</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="btn-primary rounded-full py-3 px-6 flex items-center gap-2 text-xs font-bold uppercase tracking-wider cursor-pointer shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all"
        >
          <Icons.PlusIcon size={16}/> Add Template
        </button>
      </div>
       
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Icons.SearchIcon size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6E7568]/50" />
          <input 
            type="text"
            placeholder="Search templates..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl bg-white border border-[#6E7568]/10 text-[#26150B] text-sm focus:border-[#6E7568]/50 outline-none transition-all shadow-sm"
          />
        </div>
        <select 
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
          className="px-4 py-3 rounded-xl bg-white border border-[#6E7568]/10 text-[#26150B] text-sm outline-none shadow-sm cursor-pointer"
        >
          <option value="all">All Categories</option>
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>
          ))}
        </select>
      </div>
      
      {/* Templates Grid */}
      <div className="grid gap-4">
        {filteredTemplates.map(template => (
          <motion.div 
            key={template.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-[1.5rem] p-6 border border-[#6E7568]/10 shadow-sm hover:shadow-lg transition-all duration-300"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-[#26150B] font-bold text-lg">{template.name}</h3>
                  <span className={`px-2 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider ${getCategoryColor(template.category)}`}>
                    {template.category.replace('_', ' ')}
                  </span>
                </div>
                <p className="text-sm text-[#6E7568] mb-2"><span className="font-bold">Subject:</span> {template.subject}</p>
                <p className="text-xs text-[#6E7568]/70 line-clamp-2">{template.body}</p>
                {template.variables.length > 0 && (
                  <div className="flex gap-2 mt-3 flex-wrap">
                    {template.variables.map(v => (
                      <span key={v} className="px-2 py-1 bg-[#FBF7EF] text-[#6E7568] rounded-lg text-[9px] font-bold border border-[#6E7568]/10">
                        {`{{${v}}}`}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-2 ml-4">
                <button 
                  onClick={() => setEditingTemplate(template)}
                  className="p-2 hover:bg-[#FBF7EF] rounded-xl transition-colors text-[#6E7568]"
                >
                  <Icons.EditIcon size={18} />
                </button>
                <button 
                  onClick={() => handleDelete(template.id)}
                  className="p-2 hover:bg-red-50 rounded-xl transition-colors text-red-500"
                >
                  <Icons.TrashIcon size={18} />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
        {filteredTemplates.length === 0 && (
          <div className="text-center py-16 text-[#6E7568]/40 text-sm italic bg-[#FBF7EF]/30 rounded-[2rem] border-2 border-dashed border-[#6E7568]/10">
            No templates found. Click "Add Template" to get started.
          </div>
        )}
      </div>
      
      {/* Add/Edit Modal */}
      {(showAddModal || editingTemplate) && (
        <TemplateModal 
          template={editingTemplate}
          onSave={async (template) => {
            try {
              if (editingTemplate) {
                await db.updateCRMEmailTemplate(template);
                onShowToast('Template updated!', 'success');
              } else {
                await db.addCRMEmailTemplate(template);
                onShowToast('Template created!', 'success');
              }
              await loadTemplates();
              setShowAddModal(false);
              setEditingTemplate(null);
            } catch (err) {
              onShowToast('Failed to save template', 'error');
            }
          }}
          onClose={() => {
            setShowAddModal(false);
            setEditingTemplate(null);
          }}
        />
      )}
    </div>
  );
};

// =============== TEMPLATE MODAL ===============
interface TemplateModalProps {
  template: CRMEmailTemplate | null;
  onSave: (template: CRMEmailTemplate) => void;
  onClose: () => void;
}

const TemplateModal: React.FC<TemplateModalProps> = ({ template, onSave, onClose }) => {
  const [formData, setFormData] = useState({
    name: template?.name || '',
    subject: template?.subject || '',
    body: template?.body || '',
    category: template?.category || 'other' as CRMEmailTemplate['category'],
    variables: template?.variables.join(', ') || ''
  });
  
  const categories: CRMEmailTemplate['category'][] = ['follow_up', 'consultation', 'welcome', 'renewal', 'check_in', 'promotion', 'other'];
  
  const handleSubmit = () => {
    if (!formData.name || !formData.subject) {
      return;
    }
    
    const newTemplate: CRMEmailTemplate = {
      id: template?.id || `template-${Date.now()}`,
      name: formData.name,
      subject: formData.subject,
      body: formData.body,
      category: formData.category,
      variables: formData.variables.split(',').map(v => v.trim()).filter(Boolean),
      createdAt: template?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    onSave(newTemplate);
  };
  
  return (
    <div className="fixed inset-0 bg-[#26150B]/60 backdrop-blur-md z-[200] flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#FBF7EF] rounded-[2rem] p-8 w-full max-w-lg shadow-2xl my-8">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-extrabold text-[#26150B] tracking-tight">
            {template ? 'Edit Template' : 'Add Template'}
          </h2>
          <button onClick={onClose} className="text-[#26150B]/40 hover:text-[#26150B] hover:bg-[#26150B]/5 rounded-full p-2 transition-all">
            <Icons.XIcon />
          </button>
        </div>
        
        <div className="space-y-5 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
          <div>
            <label className="text-xs font-bold text-[#6E7568] uppercase tracking-wider mb-2 block">Template Name *</label>
            <input 
              type="text"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="w-full p-4 rounded-2xl bg-white text-[#26150B] border border-[#6E7568]/10 focus:border-[#6E7568]/50 outline-none transition-all shadow-sm"
              placeholder="e.g. Welcome Email"
            />
          </div>
          
          <div>
            <label className="text-xs font-bold text-[#6E7568] uppercase tracking-wider mb-2 block">Category</label>
            <select 
              value={formData.category}
              onChange={e => setFormData({ ...formData, category: e.target.value as CRMEmailTemplate['category'] })}
              className="w-full p-4 rounded-2xl bg-white text-[#26150B] border border-[#6E7568]/10 outline-none shadow-sm"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="text-xs font-bold text-[#6E7568] uppercase tracking-wider mb-2 block">Email Subject *</label>
            <input 
              type="text"
              value={formData.subject}
              onChange={e => setFormData({ ...formData, subject: e.target.value })}
              className="w-full p-4 rounded-2xl bg-white text-[#26150B] border border-[#6E7568]/10 focus:border-[#6E7568]/50 outline-none transition-all shadow-sm"
              placeholder="e.g. Welcome to Fascia Studio!"
            />
          </div>
          
          <div>
            <label className="text-xs font-bold text-[#6E7568] uppercase tracking-wider mb-2 block">Email Body</label>
            <textarea 
              value={formData.body}
              onChange={e => setFormData({ ...formData, body: e.target.value })}
              className="w-full p-4 rounded-2xl bg-white text-[#26150B] border border-[#6E7568]/10 focus:border-[#6E7568]/50 outline-none transition-all shadow-sm resize-none h-40"
              placeholder="Hi {{name}}, Welcome to Fascia Studio..."
            />
            <p className="text-[9px] text-[#6E7568]/60 mt-1">Use {'{{variable}}'} for dynamic content</p>
          </div>
          
          <div>
            <label className="text-xs font-bold text-[#6E7568] uppercase tracking-wider mb-2 block">Variables (comma separated)</label>
            <input 
              type="text"
              value={formData.variables}
              onChange={e => setFormData({ ...formData, variables: e.target.value })}
              className="w-full p-4 rounded-2xl bg-white text-[#26150B] border border-[#6E7568]/10 focus:border-[#6E7568]/50 outline-none transition-all shadow-sm"
              placeholder="name, class_name, date"
            />
          </div>
        </div>
        
        <div className="flex gap-3 mt-8">
          <button 
            onClick={onClose}
            className="flex-1 py-4 rounded-2xl bg-[#6E7568]/10 text-[#6E7568] text-xs font-bold uppercase tracking-wider hover:bg-[#6E7568]/20 transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleSubmit}
            disabled={!formData.name || !formData.subject}
            className="flex-1 py-4 rounded-2xl bg-[#6E7568] text-[#FBF7EF] text-xs font-bold uppercase tracking-wider hover:bg-[#5a6155] transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {template ? 'Update' : 'Create'} Template
          </button>
        </div>
      </div>
    </div>
  );
};

// =============== INVITE TEMPLATES VIEW (Booking Invite Templates) ===============
interface InviteTemplatesViewProps {
  templates: Template[];
  onShowToast: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

const InviteTemplatesView: React.FC<InviteTemplatesViewProps> = ({ templates, onShowToast }) => {
  const [localTemplates, setLocalTemplates] = useState<Template[]>(templates);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    setLocalTemplates(templates);
  }, [templates]);

  const filteredTemplates = useMemo(() => {
    return localTemplates.filter(t => 
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.sportTags.some(s => s.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [localTemplates, searchTerm]);

  const handleSave = async (template: Template) => {
    try {
      await db.updateTemplate(template);
      setLocalTemplates(prev => prev.map(t => t.id === template.id ? template : t));
      setEditingTemplate(null);
      onShowToast('Template saved', 'success');
    } catch (err) {
      onShowToast('Failed to save template', 'error');
    }
  };

  const handleAdd = async (template: Template) => {
    try {
      await db.addTemplate(template);
      setLocalTemplates(prev => [...prev, template]);
      onShowToast('Template added', 'success');
    } catch (err) {
      onShowToast('Failed to add template', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this template?')) return;
    try {
      await db.deleteTemplate(id);
      setLocalTemplates(prev => prev.filter(t => t.id !== id));
      onShowToast('Template deleted', 'success');
    } catch (err) {
      onShowToast('Failed to delete template', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#26150B]/5 pb-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-[#26150B] tracking-tight">Invite Templates</h1>
          <p className="text-sm text-[#6E7568] mt-1 font-medium">WhatsApp & Email templates for booking invites</p>
        </div>
        <button 
          onClick={() => setEditingTemplate({ 
            id: `new-${Date.now()}`, 
            name: 'New Template', 
            sportTags: [], 
            bodyAreaTags: [],
            active: true,
            whatsappBody: '',
            emailSubject: '',
            emailBody: ''
          })}
          className="btn-primary rounded-full py-3 px-6 text-xs font-bold uppercase tracking-wider cursor-pointer"
        >
          + Add Template
        </button>
      </div>

      <input
        type="text"
        placeholder="Search templates..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="w-full bg-white border border-[#6E7568]/10 rounded-2xl p-4 text-sm focus:border-[#6E7568]/50 outline-none"
      />

      <div className="grid gap-4">
        {filteredTemplates.map(template => (
          <div key={template.id} className="bg-white rounded-2xl p-6 border border-[#6E7568]/10 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-bold text-[#26150B]">{template.name}</h3>
                <div className="flex gap-2 mt-2">
                  {template.sportTags.map(tag => (
                    <span key={tag} className="px-2 py-1 bg-[#FBF7EF] text-[#6E7568] rounded-full text-xs font-medium">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => setEditingTemplate(template)}
                  className="p-2 text-[#6E7568] hover:bg-[#FBF7EF] rounded-full transition-colors"
                >
                  <Icons.EditIcon size={16} />
                </button>
                <button 
                  onClick={() => handleDelete(template.id)}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors"
                >
                  <Icons.TrashIcon size={16} />
                </button>
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-bold text-[#6E7568] text-xs uppercase">WhatsApp</span>
                <p className="text-[#26150B]/70 mt-1 whitespace-pre-wrap">{template.whatsappBody || '(No message)'}</p>
              </div>
              <div>
                <span className="font-bold text-[#6E7568] text-xs uppercase">Email</span>
                <p className="font-medium text-[#26150B]">{template.emailSubject || '(No subject)'}</p>
                <p className="text-[#26150B]/70 mt-1 whitespace-pre-wrap">{template.emailBody || '(No body)'}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Edit Modal */}
      {editingTemplate && (
        <div className="fixed inset-0 bg-[#26150B]/60 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="bg-[#FBF7EF] rounded-[2rem] p-8 w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-[#26150B] mb-6">
              {editingTemplate.id.startsWith('new-') ? 'Add Template' : 'Edit Template'}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#6E7568] mb-2 uppercase">Template Name</label>
                <input
                  type="text"
                  value={editingTemplate.name}
                  onChange={(e) => setEditingTemplate({...editingTemplate, name: e.target.value})}
                  className="w-full bg-white border border-[#6E7568]/10 rounded-xl p-3 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#6E7568] mb-2 uppercase">Sport Tags (comma separated)</label>
                <input
                  type="text"
                  value={editingTemplate.sportTags.join(', ')}
                  onChange={(e) => setEditingTemplate({...editingTemplate, sportTags: e.target.value.split(',').map(s => s.trim()).filter(Boolean)})}
                  className="w-full bg-white border border-[#6E7568]/10 rounded-xl p-3 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#6E7568] mb-2 uppercase">WhatsApp Message</label>
                <textarea
                  value={editingTemplate.whatsappBody}
                  onChange={(e) => setEditingTemplate({...editingTemplate, whatsappBody: e.target.value})}
                  rows={5}
                  className="w-full bg-white border border-[#6E7568]/10 rounded-xl p-3 text-sm"
                  placeholder="Use {{class_date}}, {{invite_link}}, {{referrer_first_name}} as placeholders"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#6E7568] mb-2 uppercase">Email Subject</label>
                <input
                  type="text"
                  value={editingTemplate.emailSubject}
                  onChange={(e) => setEditingTemplate({...editingTemplate, emailSubject: e.target.value})}
                  className="w-full bg-white border border-[#6E7568]/10 rounded-xl p-3 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#6E7568] mb-2 uppercase">Email Body</label>
                <textarea
                  value={editingTemplate.emailBody}
                  onChange={(e) => setEditingTemplate({...editingTemplate, emailBody: e.target.value})}
                  rows={5}
                  className="w-full bg-white border border-[#6E7568]/10 rounded-xl p-3 text-sm"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="active"
                  checked={editingTemplate.active}
                  onChange={(e) => setEditingTemplate({...editingTemplate, active: e.target.checked})}
                />
                <label htmlFor="active" className="text-sm font-medium">Active</label>
              </div>
            </div>
            <div className="flex gap-4 mt-6">
              <button
                onClick={() => setEditingTemplate(null)}
                className="flex-1 py-3 px-6 rounded-full border border-[#6E7568]/20 font-bold text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => editingTemplate.id.startsWith('new-') ? handleAdd(editingTemplate) : handleSave(editingTemplate)}
                className="flex-1 bg-[#26150B] text-white py-3 px-6 rounded-full font-bold text-sm"
              >
                Save Template
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// =============== MARKETING DISCLAIMERS VIEW ===============
interface MarketingDisclaimersViewProps {
  disclaimers: Disclaimer[];
  venues: Venue[];
  onAddDisclaimer: (d: Disclaimer) => void;
  onUpdateDisclaimer: (d: Disclaimer) => void;
  onDeleteDisclaimer: (id: string) => void;
  onShowToast: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

const MarketingDisclaimersView: React.FC<MarketingDisclaimersViewProps> = ({ disclaimers, venues, onAddDisclaimer, onUpdateDisclaimer, onDeleteDisclaimer, onShowToast }) => {
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Disclaimer>>({
    name: '',
    context: 'general',
    title: '',
    introText: '',
    sections: [],
    signatureRequired: true,
    active: true
  });
  const [sectionInput, setSectionInput] = useState<Partial<DisclaimerSection>>({
    title: '',
    content: '',
    required: true
  });

  const contextOptions = [
    { value: 'general', label: 'General' },
    { value: 'waiver', label: 'Waiver (Onboarding)' },
    { value: 'registration', label: 'Registration' },
    { value: 'class', label: 'Class-Specific' },
    { value: 'venue', label: 'Venue-Specific' }
  ];

  const handleOpenCreate = () => {
    setEditingId(null);
    setFormData({
      name: '',
      context: 'general',
      title: 'Disclaimer',
      introText: '',
      sections: [],
      signatureRequired: true,
      active: true
    });
    setShowModal(true);
  };

  const handleOpenEdit = (disclaimer: Disclaimer) => {
    setEditingId(disclaimer.id);
    setFormData({ ...disclaimer });
    setShowModal(true);
  };

  const handleAddSection = () => {
    if (!sectionInput.title || !sectionInput.content) {
      onShowToast('Please fill in section title and content', 'error');
      return;
    }
    const newSection: DisclaimerSection = {
      id: `section-${Date.now()}`,
      title: sectionInput.title,
      content: sectionInput.content,
      order: (formData.sections?.length || 0) + 1,
      required: sectionInput.required ?? true
    };
    setFormData({
      ...formData,
      sections: [...(formData.sections || []), newSection]
    });
    setSectionInput({ title: '', content: '', required: true });
  };

  const handleRemoveSection = (sectionId: string) => {
    setFormData({
      ...formData,
      sections: formData.sections?.filter(s => s.id !== sectionId) || []
    });
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.title) {
      onShowToast('Please fill in required fields', 'error');
      return;
    }

    if (editingId) {
      onUpdateDisclaimer({
        ...formData as Disclaimer,
        id: editingId,
        updatedAt: new Date().toISOString()
      });
      onShowToast('Disclaimer updated successfully!', 'success');
    } else {
      onAddDisclaimer({
        ...formData as Disclaimer,
        id: `disclaimer-${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      onShowToast('Disclaimer created successfully!', 'success');
    }
    setShowModal(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this disclaimer?')) {
      onDeleteDisclaimer(id);
      onShowToast('Disclaimer deleted', 'success');
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 border-b border-[#26150B]/5 pb-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-[#26150B] tracking-tight">Disclaimers & Waivers</h1>
          <p className="text-sm text-[#6E7568] mt-1 font-medium">Manage liability disclaimers and waivers</p>
        </div>
        <button onClick={handleOpenCreate} className="btn-primary rounded-full py-3 px-6 text-xs font-bold uppercase tracking-wider cursor-pointer">
          + Add Disclaimer
        </button>
      </div>

      <div className="grid gap-4">
        {disclaimers.map(disclaimer => (
          <div key={disclaimer.id} className="bg-white rounded-[2rem] p-6 border border-[#6E7568]/10 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-bold text-[#26150B]">{disclaimer.title}</h3>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${disclaimer.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {disclaimer.active ? 'Active' : 'Inactive'}
                  </span>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#FBF7EF] text-[#6E7568]">
                    {contextOptions.find(c => c.value === disclaimer.context)?.label || disclaimer.context}
                  </span>
                </div>
                <p className="text-sm text-[#6E7568] mb-2">{disclaimer.name}</p>
                {disclaimer.introText && (
                  <p className="text-sm text-[#26150B]/70 mb-3">{disclaimer.introText}</p>
                )}
                <div className="flex gap-2 text-xs text-[#6E7568]">
                  <span>{disclaimer.sections?.length || 0} sections</span>
                  {disclaimer.signatureRequired && <span className="font-bold">Signature required</span>}
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleOpenEdit(disclaimer)} className="p-2 rounded-full hover:bg-[#FBF7EF]">
                  <Icons.EditIcon size={18} />
                </button>
                <button onClick={() => handleDelete(disclaimer.id)} className="p-2 rounded-full hover:bg-red-50 text-red-500">
                  <Icons.TrashIcon size={18} />
                </button>
              </div>
            </div>
          </div>
        ))}
        {disclaimers.length === 0 && (
          <div className="text-center py-12 text-[#6E7568]">
            <Icons.ShieldIcon size={48} className="mx-auto mb-4 opacity-30" />
            <p>No disclaimers yet. Create one to get started.</p>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-[#26150B]/60 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="bg-[#FBF7EF] rounded-[2rem] p-8 w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-[#26150B] mb-6">
              {editingId ? 'Edit Disclaimer' : 'Add Disclaimer'}
            </h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#6E7568] mb-2 uppercase">Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full bg-white border border-[#6E7568]/10 rounded-xl p-3 text-sm"
                    placeholder="e.g. Standard Waiver"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#6E7568] mb-2 uppercase">Context</label>
                  <select
                    value={formData.context}
                    onChange={(e) => setFormData({...formData, context: e.target.value as DisclaimerContext})}
                    className="w-full bg-white border border-[#6E7568]/10 rounded-xl p-3 text-sm"
                  >
                    {contextOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-[#6E7568] mb-2 uppercase">Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  className="w-full bg-white border border-[#6E7568]/10 rounded-xl p-3 text-sm"
                  placeholder="e.g. Liability Waiver"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#6E7568] mb-2 uppercase">Intro Text</label>
                <textarea
                  value={formData.introText}
                  onChange={(e) => setFormData({...formData, introText: e.target.value})}
                  className="w-full bg-white border border-[#6E7568]/10 rounded-xl p-3 text-sm h-24"
                  placeholder="Optional introduction text..."
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#6E7568] mb-2 uppercase">Sections</label>
                {formData.sections?.map((section, idx) => (
                  <div key={section.id} className="bg-white p-3 rounded-xl mb-2 border border-[#6E7568]/10">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-bold text-sm">{section.title}</p>
                        <p className="text-xs text-[#6E7568]">{section.content}</p>
                      </div>
                      <button onClick={() => handleRemoveSection(section.id)} className="text-red-500 text-xs">Remove</button>
                    </div>
                  </div>
                ))}
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <input
                    type="text"
                    placeholder="Section title"
                    value={sectionInput.title}
                    onChange={(e) => setSectionInput({...sectionInput, title: e.target.value})}
                    className="bg-white border border-[#6E7568]/10 rounded-xl p-2 text-xs"
                  />
                  <input
                    type="text"
                    placeholder="Section content"
                    value={sectionInput.content}
                    onChange={(e) => setSectionInput({...sectionInput, content: e.target.value})}
                    className="bg-white border border-[#6E7568]/10 rounded-xl p-2 text-xs col-span-2"
                  />
                  <button onClick={handleAddSection} className="col-span-3 btn-secondary text-xs py-2 rounded-xl">
                    + Add Section
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="sigRequired"
                  checked={formData.signatureRequired}
                  onChange={(e) => setFormData({...formData, signatureRequired: e.target.checked})}
                />
                <label htmlFor="sigRequired" className="text-sm font-medium">Signature Required</label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="active"
                  checked={formData.active}
                  onChange={(e) => setFormData({...formData, active: e.target.checked})}
                />
                <label htmlFor="active" className="text-sm font-medium">Active</label>
              </div>
            </div>
            <div className="flex gap-4 mt-6">
              <button onClick={() => setShowModal(false)} className="flex-1 py-3 px-6 rounded-full border border-[#6E7568]/20 font-bold text-sm">
                Cancel
              </button>
              <button onClick={handleSubmit} className="flex-1 bg-[#26150B] text-white py-3 px-6 rounded-full font-bold text-sm">
                {editingId ? 'Update' : 'Create'} Disclaimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// =============== MAIN MARKETING APP COMPONENT ===============
interface MarketingAppProps {
  currentUser: User;
  settings: AppSettings;
  templates: Template[];
  disclaimers: Disclaimer[];
  venues: Venue[];
  onShowToast: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
  onUpdateSettings: (settings: AppSettings) => void;
  onAddTemplate: (template: Template) => void;
  onUpdateTemplate: (template: Template) => void;
  onAddDisclaimer: (disclaimer: Disclaimer) => void;
  onUpdateDisclaimer: (disclaimer: Disclaimer) => void;
  onDeleteDisclaimer: (id: string) => void;
  onPreviewLanding: () => void;
}

export const MarketingApp: React.FC<MarketingAppProps> = ({ 
  currentUser, settings, templates, disclaimers, venues,
  onShowToast, onUpdateSettings, onAddTemplate, onUpdateTemplate,
  onAddDisclaimer, onUpdateDisclaimer, onDeleteDisclaimer, onPreviewLanding
}) => {
  const [view, setView] = useState<'dashboard' | 'clients' | 'campaigns' | 'tasks' | 'templates' | 'invite_templates' | 'landing_page' | 'disclaimers' | 'detail'>('dashboard');
  const [selectedSubscriber, setSelectedSubscriber] = useState<CRMContact | null>(null);
  const [showAddSubscriber, setShowAddSubscriber] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [showAddCampaign, setShowAddCampaign] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<MarketingCampaign | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading] = useState(true);
  
  // Data state
  const [contacts, setContacts] = useState<CRMContact[]>([]);
  const [tasks, setTasks] = useState<CRMTask[]>([]);
  const [campaigns, setCampaigns] = useState<MarketingCampaign[]>([]);
  const [inviteTemplates, setInviteTemplates] = useState<Template[]>([]);
  
  // Load data on mount and refresh
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [contactsData, tasksData] = await Promise.all([
          db.getCRMContacts(),
          db.getCRMTasks()
        ]);
        setContacts(contactsData);
        setTasks(tasksData);
        
        // Load campaigns from Supabase
        const campaignsData = await db.getCampaigns();
        setCampaigns(campaignsData || []);

        // Load invite templates (booking invite templates)
        const templatesData = await db.getTemplates();
        setInviteTemplates(templatesData);
      } catch (err) {
        console.error('Failed to load Marketing data:', err);
        onShowToast('Failed to load data', 'error');
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [refreshKey]);
  
  const refresh = () => setRefreshKey(k => k + 1);
  
  const handleAddSubscriber = (contact: CRMContact) => {
    db.addCRMContact(contact);
    refresh();
  };
  
  const handleUpdateSubscriber = (contact: CRMContact) => {
    db.updateCRMContact(contact);
    refresh();
  };
  
  const handleDeleteSubscriber = (id: string) => {
    db.deleteCRMContact(id);
    refresh();
  };
  
  const handleAddTask = (task: CRMTask) => {
    db.addCRMTask(task);
    refresh();
  };
  
  const handleCompleteTask = (taskId: string) => {
    db.completeCRMTask(taskId, currentUser.id);
    refresh();
    onShowToast('Task completed!', 'success');
  };
  
  const handleDeleteTask = (taskId: string) => {
    db.deleteCRMTask(taskId);
    refresh();
    onShowToast('Task deleted', 'info');
  };
  
  const handleSelectSubscriber = (contact: CRMContact) => {
    setSelectedSubscriber(contact);
    setView('detail');
  };
  
  const handleAddCampaign = async (campaign: MarketingCampaign) => {
    const newCampaigns = [...campaigns, campaign];
    setCampaigns(newCampaigns);
    await db.saveCampaign(campaign);
    setShowAddCampaign(false);
    onShowToast('Campaign created!', 'success');
  };
  
  const handleUpdateCampaign = async (campaign: MarketingCampaign) => {
    const newCampaigns = campaigns.map(c => c.id === campaign.id ? campaign : c);
    setCampaigns(newCampaigns);
    await db.saveCampaign(campaign);
    setEditingCampaign(null);
    onShowToast('Campaign updated!', 'success');
  };
  
  const handleDeleteCampaign = async (id: string) => {
    const newCampaigns = campaigns.filter(c => c.id !== id);
    setCampaigns(newCampaigns);
    await db.deleteCampaign(id);
    onShowToast('Campaign deleted', 'success');
  };
  
  const handleSendCampaign = async (id: string) => {
    const campaign = campaigns.find(c => c.id === id);
    if (!campaign) return;
    
    const recipientCount = campaign.recipientType === 'manual' 
      ? campaign.manualRecipients?.length || 0
      : campaign.recipients;
    
    const updatedCampaign: MarketingCampaign = {
      ...campaign,
      status: 'active',
      sent: recipientCount,
      sentAt: new Date().toISOString(),
      delivered: Math.floor(recipientCount * 0.95),
      opened: Math.floor(recipientCount * 0.95 * 0.3),
      clicked: Math.floor(recipientCount * 0.95 * 0.3 * 0.15),
      converted: Math.floor(recipientCount * 0.95 * 0.3 * 0.15 * 0.05),
      bounced: Math.floor(recipientCount * 0.02),
      unsubscribed: Math.floor(recipientCount * 0.01),
      replied: Math.floor(recipientCount * 0.95 * 0.1),
      spamReported: Math.floor(recipientCount * 0.005)
    };
    
    const newCampaigns = campaigns.map(c => c.id === id ? updatedCampaign : c);
    setCampaigns(newCampaigns);
    await db.saveCampaign(updatedCampaign);
    onShowToast(`Campaign "${campaign.name}" sent to ${recipientCount} recipients!`, 'success');
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center p-16">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#6E7568]"></div>
      </div>
    );
  }
  
  return (
    <div className="animate-fade-in">
      {view === 'dashboard' && (
        <MarketingDashboard 
          contacts={contacts}
          campaigns={campaigns}
          tasks={tasks}
          onViewClients={() => setView('clients')}
          onViewCampaigns={() => setView('campaigns')}
          onViewTasks={() => setView('tasks')}
          onViewTemplates={() => setView('templates')}
          onViewInviteTemplates={() => setView('invite_templates')}
          onViewLandingPage={() => setView('landing_page')}
          onViewDisclaimers={() => setView('disclaimers')}
        />
      )}
      
      {view === 'clients' && (
        <ClientsList 
          contacts={contacts}
          onSelectSubscriber={handleSelectSubscriber}
          onAddSubscriber={() => setShowAddSubscriber(true)}
        />
      )}
      
      {view === 'campaigns' && (
        <CampaignsView 
          campaigns={campaigns}
          onAddCampaign={() => setShowAddCampaign(true)}
          onEditCampaign={(c) => setEditingCampaign(c)}
          onDeleteCampaign={handleDeleteCampaign}
          onSendCampaign={handleSendCampaign}
          onShowToast={onShowToast}
        />
      )}
      
      {view === 'tasks' && (
        <MarketingTasksView 
          tasks={tasks}
          contacts={contacts}
          onAddTask={() => setShowAddTask(true)}
          onCompleteTask={handleCompleteTask}
          onDeleteTask={handleDeleteTask}
          currentUserId={currentUser.id}
        />
      )}
      
      {view === 'templates' && (
        <EmailTemplatesView onShowToast={onShowToast} />
      )}
      
      {view === 'invite_templates' && (
        <InviteTemplatesView 
          templates={inviteTemplates} 
          onShowToast={onShowToast}
        />
      )}
      
      {view === 'landing_page' && (
        <div className="animate-fade-in">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 border-b border-[#26150B]/5 pb-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-[#26150B] tracking-tight">Invite Page</h1>
              <p className="text-sm text-[#6E7568] mt-1 font-medium">Customize the First Impression</p>
            </div>
            <button onClick={onPreviewLanding} className="btn-primary rounded-full py-3 px-6 text-xs font-bold uppercase tracking-wider cursor-pointer shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center gap-2">
              <Icons.ShareIcon size={16} /> Preview Live
            </button>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="bg-white rounded-[2rem] p-8 border border-[#6E7568]/10 shadow-sm hover:shadow-md transition-shadow">
              <h3 className="text-sm font-bold text-[#26150B] mb-6 uppercase tracking-wider border-b border-[#FBF7EF] pb-4 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#6E7568]"></span> Header Content
              </h3>
              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-[#6E7568] mb-2 uppercase tracking-wider pl-1">Brand Tagline</label>
                  <input 
                    value={settings.landingPage.headerText} 
                    onChange={(e) => onUpdateSettings({ ...settings, landingPage: { ...settings.landingPage, headerText: e.target.value } })} 
                    className="w-full bg-[#FBF7EF] border border-[#6E7568]/10 text-[#26150B] rounded-2xl p-4 text-xs focus:border-[#6E7568]/50 outline-none shadow-inner font-medium transition-all focus:bg-white focus:shadow-md" 
                    placeholder="e.g. where fascia becomes FLUID"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#6E7568] mb-2 uppercase tracking-wider pl-1">Welcome Subheader</label>
                  <input 
                    value={settings.landingPage.subheaderText} 
                    onChange={(e) => onUpdateSettings({ ...settings, landingPage: { ...settings.landingPage, subheaderText: e.target.value } })} 
                    className="w-full bg-[#FBF7EF] border border-[#6E7568]/10 text-[#26150B] rounded-2xl p-4 text-xs focus:border-[#6E7568]/50 outline-none shadow-inner font-medium transition-all focus:bg-white focus:shadow-md" 
                    placeholder="e.g. Step into the Dome"
                  />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-[2rem] p-8 border border-[#6E7568]/10 shadow-sm hover:shadow-md transition-shadow">
              <h3 className="text-sm font-bold text-[#26150B] mb-6 uppercase tracking-wider border-b border-[#FBF7EF] pb-4 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#6E7568]"></span> "What to Expect" List
              </h3>
              <div>
                <label className="block text-xs font-bold text-[#6E7568] mb-2 uppercase tracking-wider pl-1">Bullet Points (One per line)</label>
                <textarea 
                  value={settings.landingPage.expectations.join('\n')} 
                  onChange={(e) => onUpdateSettings({ ...settings, landingPage: { ...settings.landingPage, expectations: e.target.value.split('\n') } })}
                  className="w-full bg-[#FBF7EF] border border-[#6E7568]/10 text-[#26150B] rounded-2xl p-4 text-xs font-mono h-48 focus:border-[#6E7568]/50 outline-none leading-relaxed shadow-inner transition-all focus:bg-white focus:shadow-md resize-none"
                  placeholder="- Point 1\n- Point 2\n- Point 3"
                />
              </div>
            </div>
          </div>
        </div>
      )}
      
      {view === 'disclaimers' && disclaimers && (
        <MarketingDisclaimersView 
          disclaimers={disclaimers}
          venues={venues}
          onAddDisclaimer={onAddDisclaimer}
          onUpdateDisclaimer={onUpdateDisclaimer}
          onDeleteDisclaimer={onDeleteDisclaimer}
          onShowToast={onShowToast}
        />
      )}
      
      {view === 'detail' && selectedSubscriber && (
        <SubscriberDetail 
          contact={selectedSubscriber}
          onBack={() => {
            setView('clients');
            setSelectedSubscriber(null);
          }}
          onUpdate={handleUpdateSubscriber}
          onDelete={handleDeleteSubscriber}
          onShowToast={onShowToast}
          currentUserId={currentUser.id}
        />
      )}
      
      {/* Add Client Modal */}
      <AddSubscriberModal 
        isOpen={showAddSubscriber}
        onClose={() => setShowAddSubscriber(false)}
        onSave={handleAddSubscriber}
        onShowToast={onShowToast}
      />
      
      {/* Add Task Modal */}
      {showAddTask && (
        <div className="fixed inset-0 bg-[#26150B]/60 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="bg-[#FBF7EF] rounded-[2rem] p-8 w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-bold text-[#26150B] mb-6">Create Task</h2>
            <MarketingTaskForm 
              contacts={contacts}
              onSave={(task) => {
                handleAddTask(task);
                setShowAddTask(false);
              }}
              onCancel={() => setShowAddTask(false)}
              currentUserId={currentUser.id}
            />
          </div>
        </div>
      )}
      
      {/* Add/Edit Campaign Modal */}
      {(showAddCampaign || editingCampaign) && (
        <CampaignModal 
          campaign={editingCampaign}
          clientCount={contacts.length}
          onSave={(campaign) => {
            if (editingCampaign) {
              handleUpdateCampaign(campaign);
            } else {
              handleAddCampaign(campaign);
            }
          }}
          onClose={() => {
            setShowAddCampaign(false);
            setEditingCampaign(null);
          }}
        />
      )}
    </div>
  );
};

// =============== MARKETING TASK FORM ===============
interface MarketingTaskFormProps {
  contacts: CRMContact[];
  onSave: (task: CRMTask) => void;
  onCancel: () => void;
  currentUserId: string;
  initialContactId?: string;
}

const MarketingTaskForm: React.FC<MarketingTaskFormProps> = ({ contacts, onSave, onCancel, currentUserId, initialContactId }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    dueDate: new Date().toISOString().split('T')[0],
    dueTime: '09:00',
    priority: 'medium' as CRMTask['priority'],
    contactId: initialContactId || ''
  });
  
  const handleSubmit = () => {
    if (!formData.title || !formData.dueDate) return;
    
    const task: CRMTask = {
      id: `task-${Date.now()}`,
      contactId: formData.contactId || undefined,
      title: formData.title,
      description: formData.description || undefined,
      dueDate: `${formData.dueDate}T${formData.dueTime}:00`,
      priority: formData.priority,
      status: 'pending',
      assignedTo: currentUserId,
      createdAt: new Date().toISOString(),
      reminders: []
    };
    
    onSave(task);
  };
  
  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs font-bold text-[#6E7568] uppercase tracking-wider mb-2 block">Task Title *</label>
        <input 
          type="text"
          value={formData.title}
          onChange={e => setFormData({ ...formData, title: e.target.value })}
          className="w-full p-4 rounded-xl bg-white border border-[#6E7568]/10 text-[#26150B] text-sm outline-none focus:border-[#6E7568]/50"
          placeholder="e.g. Send promotional email"
        />
      </div>
      
      <div>
        <label className="text-xs font-bold text-[#6E7568] uppercase tracking-wider mb-2 block">Link to Client (optional)</label>
        <select 
          value={formData.contactId}
          onChange={e => setFormData({ ...formData, contactId: e.target.value })}
          className="w-full p-4 rounded-xl bg-white border border-[#6E7568]/10 text-[#26150B] text-sm outline-none"
        >
          <option value="">No client</option>
          {contacts.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-bold text-[#6E7568] uppercase tracking-wider mb-2 block">Due Date *</label>
          <input 
            type="date"
            value={formData.dueDate}
            onChange={e => setFormData({ ...formData, dueDate: e.target.value })}
            className="w-full p-4 rounded-xl bg-white border border-[#6E7568]/10 text-[#26150B] text-sm outline-none focus:border-[#6E7568]/50"
          />
        </div>
        <div>
          <label className="text-xs font-bold text-[#6E7568] uppercase tracking-wider mb-2 block">Time</label>
          <input 
            type="time"
            value={formData.dueTime}
            onChange={e => setFormData({ ...formData, dueTime: e.target.value })}
            className="w-full p-4 rounded-xl bg-white border border-[#6E7568]/10 text-[#26150B] text-sm outline-none focus:border-[#6E7568]/50"
          />
        </div>
      </div>
      
      <div>
        <label className="text-xs font-bold text-[#6E7568] uppercase tracking-wider mb-2 block">Priority</label>
        <select 
          value={formData.priority}
          onChange={e => setFormData({ ...formData, priority: e.target.value as CRMTask['priority'] })}
          className="w-full p-4 rounded-xl bg-white border border-[#6E7568]/10 text-[#26150B] text-sm outline-none"
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="urgent">Urgent</option>
        </select>
      </div>
      
      <div>
        <label className="text-xs font-bold text-[#6E7568] uppercase tracking-wider mb-2 block">Description</label>
        <textarea 
          value={formData.description}
          onChange={e => setFormData({ ...formData, description: e.target.value })}
          className="w-full p-4 rounded-xl bg-white border border-[#6E7568]/10 text-[#26150B] text-sm outline-none focus:border-[#6E7568]/50 resize-none h-20"
          placeholder="Additional details..."
        />
      </div>
      
      <div className="flex gap-3 mt-6">
        <button 
          onClick={onCancel}
          className="flex-1 py-3 rounded-xl bg-[#6E7568]/10 text-[#6E7568] text-xs font-bold uppercase tracking-wider hover:bg-[#6E7568]/20 transition-colors"
        >
          Cancel
        </button>
        <button 
          onClick={handleSubmit}
          disabled={!formData.title || !formData.dueDate}
          className="flex-1 py-3 rounded-xl bg-[#6E7568] text-[#FBF7EF] text-xs font-bold uppercase tracking-wider hover:bg-[#5a6155] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Create Task
        </button>
      </div>
    </div>
  );
};

// =============== CAMPAIGN MODAL ===============
interface CampaignModalProps {
  campaign: MarketingCampaign | null;
  clientCount: number;
  onSave: (campaign: MarketingCampaign) => void;
  onClose: () => void;
}

const CampaignModal: React.FC<CampaignModalProps> = ({ campaign, clientCount, onSave, onClose }) => {
  const [formData, setFormData] = useState({
    name: campaign?.name || '',
    subject: campaign?.subject || '',
    channel: campaign?.channel || 'email' as MarketingCampaign['channel'],
    recipientType: campaign?.recipientType || 'all' as MarketingCampaign['recipientType'],
    manualRecipients: campaign?.manualRecipients || [],
    content: campaign?.content || '',
    priority: campaign?.priority || 'normal' as MarketingCampaign['priority'],
    sendNow: campaign?.sendNow ?? true,
    status: campaign?.status || 'draft' as MarketingCampaign['status'],
    scheduledAt: campaign?.scheduledAt?.split('T')[0] || '',
    scheduledTime: campaign?.scheduledAt?.split('T')[1]?.substring(0, 5) || '09:00'
  });
  
  const handleSubmit = () => {
    if (!formData.name || !formData.subject) return;
    
    const scheduledAt = !formData.sendNow && formData.scheduledAt 
      ? `${formData.scheduledAt}T${formData.scheduledTime || '09:00'}:00`
      : undefined;
    
    const newCampaign: MarketingCampaign = {
      id: campaign?.id || `campaign-${Date.now()}`,
      name: formData.name,
      subject: formData.subject,
      channel: formData.channel,
      recipientType: formData.recipientType,
      manualRecipients: formData.manualRecipients,
      content: formData.content || undefined,
      priority: formData.priority,
      sendNow: formData.sendNow,
      status: formData.sendNow ? 'active' : (formData.status === 'draft' ? 'draft' : formData.status),
      scheduledAt,
      recipients: campaign?.recipients || 0,
      sent: campaign?.sent || 0,
      delivered: campaign?.delivered || 0,
      opened: campaign?.opened || 0,
      clicked: campaign?.clicked || 0,
      converted: campaign?.converted || 0,
      bounced: campaign?.bounced || 0,
      unsubscribed: campaign?.unsubscribed || 0,
      replied: campaign?.replied || 0,
      spamReported: campaign?.spamReported || 0,
      createdAt: campaign?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    onSave(newCampaign);
  };
  
  return (
    <div className="fixed inset-0 bg-[#26150B]/60 backdrop-blur-md z-[200] flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#FBF7EF] rounded-[2rem] p-8 w-full max-w-lg shadow-2xl my-8">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-extrabold text-[#26150B] tracking-tight">
            {campaign ? 'Edit Campaign' : 'Create Campaign'}
          </h2>
          <button onClick={onClose} className="text-[#26150B]/40 hover:text-[#26150B] hover:bg-[#26150B]/5 rounded-full p-2 transition-all">
            <Icons.XIcon />
          </button>
        </div>
        
        <div className="space-y-5 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
          <div>
            <label className="text-xs font-bold text-[#6E7568] uppercase tracking-wider mb-2 block">Campaign Name *</label>
            <input 
              type="text"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="w-full p-4 rounded-2xl bg-white text-[#26150B] border border-[#6E7568]/10 focus:border-[#6E7568]/50 outline-none transition-all shadow-sm"
              placeholder="e.g. Summer Promotion"
            />
          </div>
          
          <div>
            <label className="text-xs font-bold text-[#6E7568] uppercase tracking-wider mb-2 block">Channel *</label>
            <div className="flex gap-3">
              {(['email', 'sms', 'push'] as const).map((channel) => (
                <button
                  key={channel}
                  type="button"
                  onClick={() => setFormData({ ...formData, channel })}
                  className={`flex-1 py-3 px-4 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all ${
                    formData.channel === channel
                      ? 'bg-[#6E7568] text-[#FBF7EF] shadow-lg'
                      : 'bg-white text-[#6E7568] border border-[#6E7568]/10 hover:bg-[#6E7568]/5'
                  }`}
                >
                  {channel === 'email' ? 'Email' : channel === 'sms' ? 'SMS' : 'Push'}
                </button>
              ))}
            </div>
          </div>
          
          <div>
            <label className="text-xs font-bold text-[#6E7568] uppercase tracking-wider mb-2 block">Subject Line *</label>
            <input 
              type="text"
              value={formData.subject}
              onChange={e => setFormData({ ...formData, subject: e.target.value })}
              className="w-full p-4 rounded-2xl bg-white text-[#26150B] border border-[#6E7568]/10 focus:border-[#6E7568]/50 outline-none transition-all shadow-sm"
              placeholder="e.g. Get 20% Off This Summer!"
            />
          </div>
          
          <div>
            <label className="text-xs font-bold text-[#6E7568] uppercase tracking-wider mb-2 block">Recipient Type</label>
            <select 
              value={formData.recipientType}
              onChange={e => setFormData({ ...formData, recipientType: e.target.value as MarketingCampaign['recipientType'], manualRecipients: [] })}
              className="w-full p-4 rounded-2xl bg-white text-[#26150B] border border-[#6E7568]/10 outline-none shadow-sm"
            >
              <option value="all">All Clients</option>
              <option value="manual">Manual Selection</option>
              <option value="segment">Segment</option>
            </select>
          </div>
          
          {formData.recipientType === 'manual' && (
            <div>
              <label className="text-xs font-bold text-[#6E7568] uppercase tracking-wider mb-2 block">Recipients (comma-separated emails)</label>
              <textarea 
                value={formData.manualRecipients?.join(', ')}
                onChange={e => setFormData({ ...formData, manualRecipients: e.target.value.split(',').map(e => e.trim()).filter(e => e) })}
                className="w-full p-4 rounded-2xl bg-white text-[#26150B] border border-[#6E7568]/10 focus:border-[#6E7568]/50 outline-none transition-all shadow-sm resize-none"
                rows={3}
                placeholder="e.g. john@example.com, jane@example.com"
              />
            </div>
          )}
          
          {formData.channel === 'email' && (
            <div>
              <label className="text-xs font-bold text-[#6E7568] uppercase tracking-wider mb-2 block">Content Body</label>
              <textarea 
                value={formData.content}
                onChange={e => setFormData({ ...formData, content: e.target.value })}
                className="w-full p-4 rounded-2xl bg-white text-[#26150B] border border-[#6E7568]/10 focus:border-[#6E7568]/50 outline-none transition-all shadow-sm resize-none"
                rows={5}
                placeholder="Enter your email content here..."
              />
            </div>
          )}
          
          <div>
            <label className="text-xs font-bold text-[#6E7568] uppercase tracking-wider mb-2 block">Priority</label>
            <select 
              value={formData.priority}
              onChange={e => setFormData({ ...formData, priority: e.target.value as MarketingCampaign['priority'] })}
              className="w-full p-4 rounded-2xl bg-white text-[#26150B] border border-[#6E7568]/10 outline-none shadow-sm"
            >
              <option value="normal">Normal</option>
              <option value="high">High</option>
            </select>
          </div>
          
          <div>
            <label className="text-xs font-bold text-[#6E7568] uppercase tracking-wider mb-2 block">Send Options</label>
            <div className="bg-white rounded-2xl p-4 border border-[#6E7568]/10">
              <label className="flex items-center gap-3 cursor-pointer">
                <input 
                  type="checkbox"
                  checked={formData.sendNow}
                  onChange={e => setFormData({ ...formData, sendNow: e.target.checked })}
                  className="w-5 h-5 rounded border-[#6E7568]/30 text-[#6E7568] focus:ring-[#6E7568]/50"
                />
                <span className="text-sm text-[#26150B]">Send Now</span>
              </label>
            </div>
          </div>
          
          {!formData.sendNow && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-[#6E7568] uppercase tracking-wider mb-2 block">Schedule Date</label>
                <input 
                  type="date"
                  value={formData.scheduledAt}
                  onChange={e => setFormData({ ...formData, scheduledAt: e.target.value })}
                  className="w-full p-4 rounded-2xl bg-white text-[#26150B] border border-[#6E7568]/10 focus:border-[#6E7568]/50 outline-none transition-all shadow-sm"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-[#6E7568] uppercase tracking-wider mb-2 block">Schedule Time</label>
                <input 
                  type="time"
                  value={formData.scheduledTime}
                  onChange={e => setFormData({ ...formData, scheduledTime: e.target.value })}
                  className="w-full p-4 rounded-2xl bg-white text-[#26150B] border border-[#6E7568]/10 focus:border-[#6E7568]/50 outline-none transition-all shadow-sm"
                />
              </div>
            </div>
          )}
          
          <div>
            <label className="text-xs font-bold text-[#6E7568] uppercase tracking-wider mb-2 block">Status</label>
            <select 
              value={formData.status}
              onChange={e => setFormData({ ...formData, status: e.target.value as MarketingCampaign['status'] })}
              className="w-full p-4 rounded-2xl bg-white text-[#26150B] border border-[#6E7568]/10 outline-none shadow-sm"
            >
              <option value="draft">Draft</option>
              <option value="scheduled">Scheduled</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          
          {formData.status === 'scheduled' && (
            <div>
              <label className="text-xs font-bold text-[#6E7568] uppercase tracking-wider mb-2 block">Schedule Date</label>
              <input 
                type="date"
                value={formData.scheduledAt}
                onChange={e => setFormData({ ...formData, scheduledAt: e.target.value })}
                className="w-full p-4 rounded-2xl bg-white text-[#26150B] border border-[#6E7568]/10 focus:border-[#6E7568]/50 outline-none transition-all shadow-sm"
              />
            </div>
          )}
          
          <div className="bg-[#FBF7EF] rounded-xl p-4">
            <p className="text-xs text-[#6E7568]">
              <strong>Estimated Recipients:</strong> {formData.recipientType === 'all' ? clientCount : formData.recipientType === 'manual' ? (formData.manualRecipients?.length || 0) : clientCount} recipients
            </p>
          </div>
        </div>
        
        <div className="flex gap-3 mt-8">
          <button 
            onClick={onClose}
            className="flex-1 py-4 rounded-2xl bg-[#6E7568]/10 text-[#6E7568] text-xs font-bold uppercase tracking-wider hover:bg-[#6E7568]/20 transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleSubmit}
            disabled={!formData.name || !formData.subject}
            className="flex-1 py-4 rounded-2xl bg-[#6E7568] text-[#FBF7EF] text-xs font-bold uppercase tracking-wider hover:bg-[#5a6155] transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {campaign ? 'Update' : 'Create'} Campaign
          </button>
        </div>
      </div>
    </div>
  );
};

export default MarketingApp;

