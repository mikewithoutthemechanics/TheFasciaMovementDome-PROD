
import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CRMContact, CRMTask, CRMNote, CRMActivity, PipelineStage, 
  CRMMetrics, LeadStatus, LeadSource, CRMEmailTemplate, User
} from '../types';
import { db } from '../services/db-supabase';
import * as Icons from '../components/Icons';
import { formatDate, formatTime } from '../utils';

// =============== CRM METRICS CALCULATION ===============
const calculateCRMMetrics = (contacts: CRMContact[], tasks: CRMTask[]): CRMMetrics => {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  
  const totalContacts = contacts.length;
  const newLeads = contacts.filter(c => c.status === 'new_inquiry').length;
  const qualifiedLeads = contacts.filter(c => c.status === 'active').length;
  const wonDeals = contacts.filter(c => c.status === 'vip').length;
  const lostDeals = contacts.filter(c => c.status === 'churned').length;
  
  const totalPipelineValue = contacts
    .filter(c => !['vip', 'churned'].includes(c.status))
    .reduce((sum, c) => sum + (c.estimatedValue || 0), 0);
    
  const conversionRate = totalContacts > 0 
    ? Math.round((wonDeals / totalContacts) * 100) 
    : 0;
    
  const avgDealSize = wonDeals > 0 
    ? contacts.filter(c => c.status === 'vip').reduce((sum, c) => sum + (c.actualValue || c.estimatedValue || 0), 0) / wonDeals 
    : 0;
    
  const tasksDueToday = tasks.filter(t => {
    const dueDate = t.dueDate.split('T')[0];
    return dueDate === today && t.status === 'pending';
  }).length;
  
  const tasksOverdue = tasks.filter(t => {
    const dueDate = new Date(t.dueDate);
    return dueDate < now && t.status === 'pending';
  }).length;
  
  const followUpsToday = contacts.filter(c => {
    if (!c.nextFollowUpDate) return false;
    const followUpDate = c.nextFollowUpDate.split('T')[0];
    return followUpDate === today;
  }).length;
  
  return {
    totalContacts,
    newLeads,
    qualifiedLeads,
    wonDeals,
    lostDeals,
    totalPipelineValue,
    conversionRate,
    avgDealSize,
    tasksDueToday,
    tasksOverdue,
    followUpsToday
  };
};

// =============== STATUS BADGE COMPONENT ===============
const StatusBadge: React.FC<{ status: LeadStatus }> = ({ status }) => {
  const colors: Record<LeadStatus, string> = {
    new_inquiry: 'bg-gray-100 text-gray-700 border-gray-200',
    consultation: 'bg-blue-100 text-blue-700 border-blue-200',
    trial: 'bg-purple-100 text-purple-700 border-purple-200',
    active: 'bg-green-100 text-green-700 border-green-200',
    vip: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    at_risk: 'bg-orange-100 text-orange-700 border-orange-200',
    churned: 'bg-red-100 text-red-700 border-red-200'
  };
  
  return (
    <span className={`px-2 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider border ${colors[status]}`}>
      {status.replace('_', ' ')}
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

// =============== CRM DASHBOARD ===============
interface CRMDashboardProps {
  contacts: CRMContact[];
  tasks: CRMTask[];
  onViewContacts: () => void;
  onViewPipeline: () => void;
  onViewTasks: () => void;
  onViewTemplates: () => void;
}

const CRMDashboard: React.FC<CRMDashboardProps> = ({ 
  contacts, tasks, onViewContacts, onViewPipeline, onViewTasks, onViewTemplates 
}) => {
  const metrics = useMemo(() => calculateCRMMetrics(contacts, tasks), [contacts, tasks]);
  
  const statCards = [
    { label: 'Total Contacts', value: metrics.totalContacts, icon: <Icons.UsersIcon />, color: '#6E7568', onClick: onViewContacts },
    { label: 'New Leads', value: metrics.newLeads, icon: <Icons.PersonIcon />, color: '#3B82F6' },
    { label: 'Pipeline Value', value: `R ${metrics.totalPipelineValue.toLocaleString()}`, icon: <Icons.TrendUpIcon />, color: '#22C55E', onClick: onViewPipeline },
    { label: 'Conversion Rate', value: `${metrics.conversionRate}%`, icon: <Icons.TrendUpIcon />, color: '#8B5CF6' },
    { label: 'Tasks Due Today', value: metrics.tasksDueToday, icon: <Icons.CalendarIcon />, color: '#F59E0B', onClick: onViewTasks },
    { label: 'Email Templates', value: 'Manage', icon: <Icons.TemplateIcon />, color: '#EC4899', onClick: onViewTemplates },
    { label: 'Overdue Tasks', value: metrics.tasksOverdue, icon: <Icons.AlertIcon />, color: '#EF4444' }
  ];
  
  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end border-b border-[#26150B]/5 pb-4">
        <div>
          <h1 className="text-xl md:text-3xl font-extrabold text-[#26150B] tracking-tight">CRM Dashboard</h1>
          <p className="text-sm text-[#6E7568] mt-1 font-medium">Customer Relationship Management</p>
        </div>
      </div>
      
      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
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
            <p className="text-[9px] text-[#6E7568] font-bold uppercase tracking-wider mt-1">{stat.label}</p>
          </div>
        ))}
      </div>
      
      {/* Recent Contacts & Upcoming Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Contacts */}
        <div className="bg-white rounded-[2rem] p-6 border border-[#6E7568]/10 shadow-sm">
          <div className="flex justify-between items-center mb-6 border-b border-[#FBF7EF] pb-4">
            <h3 className="text-xs font-bold text-[#26150B] uppercase tracking-wider">Recent Contacts</h3>
            <button onClick={onViewContacts} className="text-[10px] font-bold text-[#6E7568] hover:text-[#26150B] bg-[#FBF7EF] px-3 py-1 rounded-full transition-colors">View All</button>
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
                <StatusBadge status={contact.status} />
              </div>
            ))}
            {contacts.length === 0 && (
              <div className="text-center py-8 text-[#6E7568]/40 text-xs italic">No contacts yet</div>
            )}
          </div>
        </div>
        
        {/* Upcoming Tasks */}
        <div className="bg-white rounded-[2rem] p-6 border border-[#6E7568]/10 shadow-sm">
          <div className="flex justify-between items-center mb-6 border-b border-[#FBF7EF] pb-4">
            <h3 className="text-xs font-bold text-[#26150B] uppercase tracking-wider">Upcoming Tasks</h3>
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
    </div>
  );
};

// =============== CONTACTS LIST VIEW ===============
interface ContactsListProps {
  contacts: CRMContact[];
  pipelineStages: PipelineStage[];
  onSelectContact: (contact: CRMContact) => void;
  onAddContact: () => void;
  onShowToast: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

const ContactsList: React.FC<ContactsListProps> = ({ contacts, pipelineStages, onSelectContact, onAddContact, onShowToast: _onShowToast }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<LeadStatus | 'all'>('all');
  const [viewMode, setViewMode] = useState<'list' | 'pipeline'>('list');
  
  const filteredContacts = useMemo(() => {
    return contacts.filter(c => {
      const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           c.email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [contacts, searchTerm, statusFilter]);
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#26150B]/5 pb-4">
        <div>
          <h1 className="text-xl md:text-3xl font-extrabold text-[#26150B] tracking-tight">Contacts</h1>
          <p className="text-sm text-[#6E7568] mt-1 font-medium">Manage your leads and clients</p>
        </div>
        <button 
          onClick={onAddContact}
          className="btn-primary rounded-full py-3 px-6 flex items-center gap-2 text-xs font-bold uppercase tracking-wider cursor-pointer shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all"
        >
          <Icons.PlusIcon size={16}/> Add Contact
        </button>
      </div>
      
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Icons.SearchIcon size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6E7568]/50" />
          <input 
            type="text"
            placeholder="Search contacts..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl bg-white border border-[#6E7568]/10 text-[#26150B] text-sm focus:border-[#6E7568]/50 outline-none transition-all shadow-sm"
          />
        </div>
        <select 
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as LeadStatus | 'all')}
          className="px-4 py-3 rounded-xl bg-white border border-[#6E7568]/10 text-[#26150B] text-sm outline-none shadow-sm cursor-pointer"
        >
          <option value="all">All Statuses</option>
          {pipelineStages.map(stage => (
            <option key={stage.id} value={stage.name.toLowerCase().replace(' ', '_') as LeadStatus}>
              {stage.name}
            </option>
          ))}
        </select>
        <div className="bg-white rounded-xl p-1 border border-[#6E7568]/10 flex shadow-sm">
          <button 
            onClick={() => setViewMode('list')}
            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${viewMode === 'list' ? 'bg-[#6E7568] text-[#FBF7EF] shadow-md' : 'text-[#6E7568] hover:bg-[#FBF7EF]'}`}
          >
            List
          </button>
          <button 
            onClick={() => setViewMode('pipeline')}
            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${viewMode === 'pipeline' ? 'bg-[#6E7568] text-[#FBF7EF] shadow-md' : 'text-[#6E7568] hover:bg-[#FBF7EF]'}`}
          >
            Pipeline
          </button>
        </div>
      </div>
      
      {viewMode === 'list' ? (
        <div className="grid gap-4">
          {filteredContacts.map(contact => (
            <motion.div 
              key={contact.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => onSelectContact(contact)}
              className="bg-white rounded-[1.5rem] p-6 border border-[#6E7568]/10 shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer hover:-translate-y-0.5 group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-[#6E7568] text-[#FBF7EF] flex items-center justify-center text-lg font-bold group-hover:scale-110 transition-transform">
                    {contact.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-[#26150B] font-bold text-lg group-hover:text-[#6E7568] transition-colors">{contact.name}</h3>
                    <p className="text-xs text-[#6E7568]">{contact.email} {contact.phone && `• ${contact.phone}`}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right mr-4">
                    <p className="text-sm font-bold text-[#26150B]">R {contact.estimatedValue?.toLocaleString() ?? 0}</p>
                    <p className="text-[10px] text-[#6E7568]">Est. Value</p>
                  </div>
                  <StatusBadge status={contact.status} />
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
              No contacts found. Click "Add Contact" to get started.
            </div>
          )}
        </div>
      ) : (
        <PipelineView 
          contacts={filteredContacts} 
          stages={pipelineStages}
          onSelectContact={onSelectContact}
        />
      )}
    </div>
  );
};

// =============== PIPELINE VIEW ===============
interface PipelineViewProps {
  contacts: CRMContact[];
  stages: PipelineStage[];
  onSelectContact: (contact: CRMContact) => void;
}

const PipelineView: React.FC<PipelineViewProps> = ({ contacts, stages, onSelectContact }) => {
  const getContactsByStage = (stageName: string) => {
    return contacts.filter(c => c.status === stageName.toLowerCase().replace(' ', '_'));
  };
  
  const getStageValue = (stageName: string) => {
    return getContactsByStage(stageName)
      .reduce((sum, c) => sum + (c.estimatedValue || 0), 0);
  };
  
  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-4 min-w-max">
        {stages.map(stage => {
          const stageContacts = getContactsByStage(stage.name);
          const stageValue = getStageValue(stage.name);
          
          return (
            <div key={stage.id} className="w-72 flex-shrink-0">
              <div className="bg-white rounded-2xl p-4 border border-[#6E7568]/10 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: stage.color }}></div>
                    <h4 className="text-xs font-bold text-[#26150B] uppercase tracking-wider">{stage.name}</h4>
                  </div>
                  <span className="text-[10px] font-bold text-[#6E7568] bg-[#FBF7EF] px-2 py-1 rounded-full">
                    {stageContacts.length}
                  </span>
                </div>
                <p className="text-[10px] text-[#6E7568] mb-4">R {stageValue.toLocaleString()}</p>
                
                <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
                  {stageContacts.map(contact => (
                    <div 
                      key={contact.id}
                      onClick={() => onSelectContact(contact)}
                      className="bg-[#FBF7EF] rounded-xl p-4 cursor-pointer hover:shadow-md transition-all border border-transparent hover:border-[#6E7568]/20"
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded-full bg-[#6E7568] text-[#FBF7EF] flex items-center justify-center text-xs font-bold">
                          {contact.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-[#26150B] truncate">{contact.name}</p>
                          <p className="text-[10px] text-[#6E7568] truncate">{contact.email}</p>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <p className="text-xs font-bold text-[#6E7568]">R {(contact.estimatedValue || 0).toLocaleString()}</p>
                        {contact.nextFollowUpDate && (
                          <p className="text-[9px] text-[#6E7568]/60">
                            <Icons.CalendarIcon size={10} className="inline mr-1" />
                            {formatDate(contact.nextFollowUpDate)}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                  {stageContacts.length === 0 && (
                    <div className="text-center py-6 text-[#6E7568]/30 text-xs italic">
                      No contacts
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// =============== CONTACT DETAIL VIEW ===============
interface ContactDetailProps {
  contact: CRMContact;
  pipelineStages: PipelineStage[];
  tasks: CRMTask[];
  onBack: () => void;
  onUpdate: (contact: CRMContact) => void;
  onDelete: (id: string) => void;
  onShowToast: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
  currentUserId: string;
}

const ContactDetail: React.FC<ContactDetailProps> = ({ 
  contact, pipelineStages, tasks, onBack, onUpdate, onDelete, onShowToast, currentUserId 
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'activity' | 'tasks' | 'notes'>('overview');
  const [showAddNote, setShowAddNote] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', dueDate: '', priority: 'medium' as CRMTask['priority'] });
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState(contact);
  
  const contactTasks = useMemo(() => tasks.filter(t => t.contactId === contact.id), [tasks, contact.id]);
  
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
  
  const handleStatusChange = (newStatus: LeadStatus) => {
    const activity: CRMActivity = {
      id: `act-${Date.now()}`,
      contactId: contact.id,
      type: 'status_change',
      title: `Status changed from ${contact.status} to ${newStatus}`,
      timestamp: new Date().toISOString(),
      createdBy: currentUserId,
      metadata: { oldStatus: contact.status, newStatus }
    };
    
    const updated = { ...contact, status: newStatus, updatedAt: new Date().toISOString() };
    db.updateCRMContact(updated);
    db.addCRMActivity(contact.id, activity);
    onUpdate(updated);
    onShowToast('Status updated!', 'success');
  };
  
  const handleSaveEdit = () => {
    db.updateCRMContact(editData);
    onUpdate(editData);
    setIsEditing(false);
    onShowToast('Contact updated!', 'success');
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
              if (window.confirm('Delete this contact?')) {
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
            value={contact.status}
            onChange={e => handleStatusChange(e.target.value as LeadStatus)}
            className="w-full bg-transparent text-sm font-bold text-[#26150B] outline-none cursor-pointer"
          >
            {pipelineStages.map(stage => (
              <option key={stage.id} value={stage.name.toLowerCase().replace(' ', '_') as LeadStatus}>
                {stage.name}
              </option>
            ))}
          </select>
        </div>
        <div className="bg-white rounded-xl p-4 border border-[#6E7568]/10">
          <p className="text-[9px] font-bold text-[#6E7568] uppercase tracking-wider mb-1">Est. Value</p>
          <p className="text-lg font-bold text-[#26150B]">R {contact.estimatedValue?.toLocaleString() ?? 0}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-[#6E7568]/10">
          <p className="text-[9px] font-bold text-[#6E7568] uppercase tracking-wider mb-1">Interactions</p>
          <p className="text-lg font-bold text-[#26150B]">{contact.totalInteractions}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-[#6E7568]/10">
          <p className="text-[9px] font-bold text-[#6E7568] uppercase tracking-wider mb-1">Next Follow-up</p>
          <p className="text-sm font-bold text-[#26150B]">
            {contact.nextFollowUpDate ? formatDate(contact.nextFollowUpDate) : 'Not scheduled'}
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
              <h3 className="text-xs font-bold text-[#26150B] uppercase tracking-wider mb-4">Contact Information</h3>
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
                  <p className="text-[9px] font-bold text-[#6E7568] uppercase tracking-wider mb-1">Source</p>
                  <p className="text-sm text-[#26150B] capitalize">{contact.source}</p>
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
              <h3 className="text-xs font-bold text-[#26150B] uppercase tracking-wider">Tasks ({contactTasks.length})</h3>
              <button 
                onClick={() => setShowAddTask(true)}
                className="btn-primary rounded-xl py-2 px-4 text-xs font-bold uppercase tracking-wider flex items-center gap-2"
              >
                <Icons.PlusIcon size={14} /> Add Task
              </button>
            </div>
            
            <div className="grid gap-3">
              {contactTasks.map(task => (
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
              {contactTasks.length === 0 && (
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
                  placeholder="e.g. Follow up call"
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
      
      {/* Edit Contact Modal */}
      {isEditing && (
        <div className="fixed inset-0 bg-[#26150B]/60 backdrop-blur-md z-[200] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#FBF7EF] rounded-[2rem] p-8 w-full max-w-lg shadow-2xl my-8">
            <h2 className="text-xl font-bold text-[#26150B] mb-6">Edit Contact</h2>
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-[#6E7568] uppercase tracking-wider mb-2 block">Est. Value (R)</label>
                  <input 
                    type="number"
                    value={editData.estimatedValue}
                    onChange={e => setEditData({ ...editData, estimatedValue: Number(e.target.value) })}
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
              </div>
              <div>
                <label className="text-xs font-bold text-[#6E7568] uppercase tracking-wider mb-2 block">Tags (comma separated)</label>
                <input 
                  type="text"
                  value={editData.tags.join(', ')}
                  onChange={e => setEditData({ ...editData, tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) })}
                  className="w-full p-4 rounded-xl bg-white border border-[#6E7568]/10 text-[#26150B] text-sm outline-none focus:border-[#6E7568]/50"
                  placeholder="VIP, Corporate, Runner"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-[#6E7568] uppercase tracking-wider mb-2 block">Next Follow-up Date</label>
                <input 
                  type="date"
                  value={editData.nextFollowUpDate?.split('T')[0] || ''}
                  onChange={e => setEditData({ ...editData, nextFollowUpDate: e.target.value ? `${e.target.value}T09:00:00` : undefined })}
                  className="w-full p-4 rounded-xl bg-white border border-[#6E7568]/10 text-[#26150B] text-sm outline-none focus:border-[#6E7568]/50"
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

// =============== TASKS VIEW ===============
interface TasksViewProps {
  tasks: CRMTask[];
  contacts: CRMContact[];
  onAddTask: () => void;
  onCompleteTask: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
  currentUserId: string;
}

const TasksView: React.FC<TasksViewProps> = ({ 
  tasks, contacts, onAddTask, onCompleteTask, onDeleteTask, currentUserId: _currentUserId 
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
          <p className="text-sm text-[#6E7568] mt-1 font-medium">Manage follow-ups and to-dos</p>
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

// =============== ADD CONTACT MODAL ===============
interface AddContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (contact: CRMContact) => void;
  onShowToast: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

const AddContactModal: React.FC<AddContactModalProps> = ({ isOpen, onClose, onSave, onShowToast }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    position: '',
    source: 'website' as LeadSource,
    estimatedValue: 0,
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
      status: 'new_inquiry',
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
      estimatedValue: formData.estimatedValue,
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
      estimatedValue: 0,
      tags: '',
      notes: ''
    });
    onClose();
    onShowToast('Contact created successfully!', 'success');
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-[#26150B]/60 backdrop-blur-md z-[200] flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#FBF7EF] rounded-[2.5rem] p-8 sm:p-10 w-full max-w-lg shadow-2xl relative my-8">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-extrabold text-[#26150B] tracking-tight">Add New Contact</h2>
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
              <label className="text-xs font-bold text-[#6E7568] uppercase tracking-wider mb-2 block">Position</label>
              <input 
                type="text"
                value={formData.position}
                onChange={e => setFormData({ ...formData, position: e.target.value })}
                className="w-full p-4 rounded-2xl bg-white text-[#26150B] border border-[#6E7568]/10 focus:border-[#6E7568]/50 outline-none transition-all shadow-sm"
                placeholder="Job title"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
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
            <div>
              <label className="text-xs font-bold text-[#6E7568] uppercase tracking-wider mb-2 block">Est. Value (R)</label>
              <input 
                type="number"
                value={formData.estimatedValue}
                onChange={e => setFormData({ ...formData, estimatedValue: Number(e.target.value) })}
                className="w-full p-4 rounded-2xl bg-white text-[#26150B] border border-[#6E7568]/10 focus:border-[#6E7568]/50 outline-none transition-all shadow-sm"
                placeholder="0"
              />
            </div>
          </div>
          
          <div>
            <label className="text-xs font-bold text-[#6E7568] uppercase tracking-wider mb-2 block">Tags (comma separated)</label>
            <input 
              type="text"
              value={formData.tags}
              onChange={e => setFormData({ ...formData, tags: e.target.value })}
              className="w-full p-4 rounded-2xl bg-white text-[#26150B] border border-[#6E7568]/10 focus:border-[#6E7568]/50 outline-none transition-all shadow-sm"
              placeholder="VIP, Corporate, Runner"
            />
          </div>
          
          <div>
            <label className="text-xs font-bold text-[#6E7568] uppercase tracking-wider mb-2 block">Initial Notes</label>
            <textarea 
              value={formData.notes}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
              className="w-full p-4 rounded-2xl bg-white text-[#26150B] border border-[#6E7568]/10 focus:border-[#6E7568]/50 outline-none transition-all shadow-sm resize-none h-24"
              placeholder="Any initial notes about this contact..."
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
            Create Contact
          </button>
        </div>
      </div>
    </div>
  );
};

export type CRMView = 'dashboard' | 'contacts' | 'tasks' | 'detail' | 'templates';

// =============== CRM EMAIL TEMPLATES VIEW ===============
interface CRMTemplatesProps {
  onShowToast: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

const CRMTemplates: React.FC<CRMTemplatesProps> = ({ onShowToast }) => {
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
  
  const categories = ['follow_up', 'consultation', 'welcome', 'renewal', 'check_in', 'promotion', 'other'];
  
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
      follow_up: 'bg-blue-100 text-blue-700',
      consultation: 'bg-purple-100 text-purple-700',
      welcome: 'bg-green-100 text-green-700',
      renewal: 'bg-yellow-100 text-yellow-700',
      check_in: 'bg-pink-100 text-pink-700',
      promotion: 'bg-orange-100 text-orange-700',
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
          <p className="text-sm text-[#6E7568] mt-1 font-medium">Manage CRM email templates</p>
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
              placeholder="name, className, date"
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

// =============== MAIN CRM COMPONENT ===============
interface CRMAppProps {
  currentUser: User;
  onShowToast: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

export const CRMApp: React.FC<CRMAppProps> = ({ currentUser, onShowToast }) => {
  const [view, setView] = useState<CRMView>('dashboard');
  const [selectedContact, setSelectedContact] = useState<CRMContact | null>(null);
  const [showAddContact, setShowAddContact] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [_loading, setLoading] = useState(true);
  
  // Data state
  const [contacts, setContacts] = useState<CRMContact[]>([]);
  const [tasks, setTasks] = useState<CRMTask[]>([]);
  const [pipelineStages, setPipelineStages] = useState<PipelineStage[]>([]);
  
  // Load data on mount and refresh
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [contactsData, tasksData, stagesData] = await Promise.all([
          db.getCRMContacts(),
          db.getCRMTasks(),
          db.getPipelineStages()
        ]);
        setContacts(contactsData);
        setTasks(tasksData);
        setPipelineStages(stagesData);
      } catch (err) {
        console.error('Failed to load CRM data:', err);
        onShowToast('Failed to load data', 'error');
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [refreshKey]);
  
  const refresh = () => setRefreshKey(k => k + 1);
  
  const handleAddContact = (contact: CRMContact) => {
    db.addCRMContact(contact);
    refresh();
  };
  
  const handleUpdateContact = (contact: CRMContact) => {
    db.updateCRMContact(contact);
    refresh();
  };
  
  const handleDeleteContact = (id: string) => {
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
  
  const handleSelectContact = (contact: CRMContact) => {
    setSelectedContact(contact);
    setView('detail');
  };
  
  return (
    <div className="animate-fade-in">
      {view === 'dashboard' && (
        <CRMDashboard 
          contacts={contacts}
          tasks={tasks}
          onViewContacts={() => setView('contacts')}
          onViewPipeline={() => setView('contacts')}
          onViewTasks={() => setView('tasks')}
          onViewTemplates={() => setView('templates')}
        />
      )}
      
      {view === 'contacts' && (
        <ContactsList 
          contacts={contacts}
          pipelineStages={pipelineStages}
          onSelectContact={handleSelectContact}
          onAddContact={() => setShowAddContact(true)}
          onShowToast={onShowToast}
        />
      )}
      
      {view === 'tasks' && (
        <TasksView 
          tasks={tasks}
          contacts={contacts}
          onAddTask={() => setShowAddTask(true)}
          onCompleteTask={handleCompleteTask}
          onDeleteTask={handleDeleteTask}
          currentUserId={currentUser.id}
        />
      )}
      
      {view === 'detail' && selectedContact && (
        <ContactDetail 
          contact={selectedContact}
          pipelineStages={pipelineStages}
          tasks={tasks}
          onBack={() => {
            setView('contacts');
            setSelectedContact(null);
          }}
          onUpdate={handleUpdateContact}
          onDelete={handleDeleteContact}
          onShowToast={onShowToast}
          currentUserId={currentUser.id}
        />
      )}
      
      {view === 'templates' && (
        <CRMTemplates onShowToast={onShowToast} />
      )}
      
      {/* Add Contact Modal */}
      <AddContactModal 
        isOpen={showAddContact}
        onClose={() => setShowAddContact(false)}
        onSave={handleAddContact}
        onShowToast={onShowToast}
      />
      
      {/* Add Task Modal */}
      {showAddTask && (
        <div className="fixed inset-0 bg-[#26150B]/60 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="bg-[#FBF7EF] rounded-[2rem] p-8 w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-bold text-[#26150B] mb-6">Create Task</h2>
            <TaskForm 
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
    </div>
  );
};

// =============== TASK FORM COMPONENT ===============
interface TaskFormProps {
  contacts: CRMContact[];
  onSave: (task: CRMTask) => void;
  onCancel: () => void;
  currentUserId: string;
  initialContactId?: string;
}

const TaskForm: React.FC<TaskFormProps> = ({ contacts, onSave, onCancel, currentUserId, initialContactId }) => {
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
          placeholder="e.g. Follow up call"
        />
      </div>
      
      <div>
        <label className="text-xs font-bold text-[#6E7568] uppercase tracking-wider mb-2 block">Link to Contact (optional)</label>
        <select 
          value={formData.contactId}
          onChange={e => setFormData({ ...formData, contactId: e.target.value })}
          className="w-full p-4 rounded-xl bg-white border border-[#6E7568]/10 text-[#26150B] text-sm outline-none"
        >
          <option value="">No contact</option>
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

export default CRMApp;
