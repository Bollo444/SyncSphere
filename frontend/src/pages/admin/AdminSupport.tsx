import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  TicketIcon,
  ChatBubbleLeftRightIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  UserIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  EllipsisVerticalIcon,
  PaperClipIcon,
  PaperAirplaneIcon,
  TagIcon,
  CalendarIcon,
} from '@heroicons/react/24/outline';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store';

interface SupportTicket {
  id: string;
  subject: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: 'technical' | 'billing' | 'feature_request' | 'bug_report' | 'general';
  user: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  assignedTo?: {
    id: string;
    name: string;
    avatar?: string;
  };
  createdAt: string;
  updatedAt: string;
  messages: TicketMessage[];
  tags: string[];
}

interface TicketMessage {
  id: string;
  content: string;
  author: {
    id: string;
    name: string;
    type: 'user' | 'admin';
    avatar?: string;
  };
  createdAt: string;
  attachments?: {
    id: string;
    name: string;
    url: string;
    size: number;
  }[];
}

const AdminSupport: React.FC = () => {
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  // Mock data - replace with actual API calls
  const [tickets, setTickets] = useState<SupportTicket[]>([
    {
      id: 'TKT-001',
      subject: 'Unable to recover deleted photos',
      description: 'I accidentally deleted important photos from my iPhone and the recovery process is not working properly.',
      status: 'open',
      priority: 'high',
      category: 'technical',
      user: {
        id: 'user-1',
        name: 'John Smith',
        email: 'john.smith@email.com',
        avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=32&h=32&fit=crop&crop=face',
      },
      createdAt: '2024-01-07T10:30:00Z',
      updatedAt: '2024-01-07T14:15:00Z',
      messages: [
        {
          id: 'msg-1',
          content: 'I accidentally deleted important photos from my iPhone and the recovery process is not working properly. Can you help me?',
          author: {
            id: 'user-1',
            name: 'John Smith',
            type: 'user',
            avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=32&h=32&fit=crop&crop=face',
          },
          createdAt: '2024-01-07T10:30:00Z',
        },
        {
          id: 'msg-2',
          content: 'Hi John, I\'d be happy to help you recover your photos. Can you please tell me what iOS version you\'re running and when the photos were deleted?',
          author: {
            id: 'admin-1',
            name: 'Sarah Wilson',
            type: 'admin',
            avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=32&h=32&fit=crop&crop=face',
          },
          createdAt: '2024-01-07T11:45:00Z',
        },
      ],
      tags: ['ios', 'photo-recovery', 'urgent'],
    },
    {
      id: 'TKT-002',
      subject: 'Billing issue with Pro subscription',
      description: 'I was charged twice for my Pro subscription this month.',
      status: 'in_progress',
      priority: 'medium',
      category: 'billing',
      user: {
        id: 'user-2',
        name: 'Emily Davis',
        email: 'emily.davis@email.com',
        avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=32&h=32&fit=crop&crop=face',
      },
      assignedTo: {
        id: 'admin-2',
        name: 'Mike Johnson',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=32&h=32&fit=crop&crop=face',
      },
      createdAt: '2024-01-06T15:20:00Z',
      updatedAt: '2024-01-07T09:30:00Z',
      messages: [
        {
          id: 'msg-3',
          content: 'I was charged twice for my Pro subscription this month. Can you please check my billing history?',
          author: {
            id: 'user-2',
            name: 'Emily Davis',
            type: 'user',
            avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=32&h=32&fit=crop&crop=face',
          },
          createdAt: '2024-01-06T15:20:00Z',
        },
        {
          id: 'msg-4',
          content: 'Hi Emily, I\'ve reviewed your billing history and I can see the duplicate charge. I\'m processing a refund for you right now.',
          author: {
            id: 'admin-2',
            name: 'Mike Johnson',
            type: 'admin',
            avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=32&h=32&fit=crop&crop=face',
          },
          createdAt: '2024-01-07T09:30:00Z',
        },
      ],
      tags: ['billing', 'refund', 'pro-subscription'],
    },
    {
      id: 'TKT-003',
      subject: 'Feature request: Bulk file selection',
      description: 'It would be great to have a bulk selection feature for transferring multiple files at once.',
      status: 'resolved',
      priority: 'low',
      category: 'feature_request',
      user: {
        id: 'user-3',
        name: 'Alex Chen',
        email: 'alex.chen@email.com',
        avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=32&h=32&fit=crop&crop=face',
      },
      assignedTo: {
        id: 'admin-1',
        name: 'Sarah Wilson',
        avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=32&h=32&fit=crop&crop=face',
      },
      createdAt: '2024-01-05T12:00:00Z',
      updatedAt: '2024-01-06T16:45:00Z',
      messages: [
        {
          id: 'msg-5',
          content: 'It would be great to have a bulk selection feature for transferring multiple files at once. This would save a lot of time.',
          author: {
            id: 'user-3',
            name: 'Alex Chen',
            type: 'user',
            avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=32&h=32&fit=crop&crop=face',
          },
          createdAt: '2024-01-05T12:00:00Z',
        },
        {
          id: 'msg-6',
          content: 'Great suggestion, Alex! I\'ve forwarded this to our development team. This feature is now on our roadmap for the next release.',
          author: {
            id: 'admin-1',
            name: 'Sarah Wilson',
            type: 'admin',
            avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=32&h=32&fit=crop&crop=face',
          },
          createdAt: '2024-01-06T16:45:00Z',
        },
      ],
      tags: ['feature-request', 'bulk-selection', 'roadmap'],
    },
  ]);

  const [stats, setStats] = useState({
    total: 156,
    open: 23,
    inProgress: 18,
    resolved: 98,
    closed: 17,
    avgResponseTime: '2.4 hours',
    satisfactionRate: 94.2,
  });

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-red-100 text-red-800';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'resolved':
        return 'bg-green-100 text-green-800';
      case 'closed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-500';
      case 'high':
        return 'bg-orange-500';
      case 'medium':
        return 'bg-yellow-500';
      case 'low':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open':
        return <ExclamationTriangleIcon className="h-4 w-4" />;
      case 'in_progress':
        return <ClockIcon className="h-4 w-4" />;
      case 'resolved':
        return <CheckCircleIcon className="h-4 w-4" />;
      case 'closed':
        return <CheckCircleIcon className="h-4 w-4" />;
      default:
        return <TicketIcon className="h-4 w-4" />;
    }
  };

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = ticket.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         ticket.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         ticket.user.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || ticket.priority === priorityFilter;
    const matchesCategory = categoryFilter === 'all' || ticket.category === categoryFilter;
    
    return matchesSearch && matchesStatus && matchesPriority && matchesCategory;
  });

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedTicket) return;
    
    setSendingMessage(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const message: TicketMessage = {
      id: `msg-${Date.now()}`,
      content: newMessage,
      author: {
        id: 'admin-current',
        name: 'Current Admin',
        type: 'admin',
        avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=32&h=32&fit=crop&crop=face',
      },
      createdAt: new Date().toISOString(),
    };
    
    setSelectedTicket(prev => prev ? {
      ...prev,
      messages: [...prev.messages, message],
      updatedAt: new Date().toISOString(),
    } : null);
    
    setNewMessage('');
    setSendingMessage(false);
  };

  const handleStatusChange = (ticketId: string, newStatus: string) => {
    setTickets(prev => prev.map(ticket => 
      ticket.id === ticketId 
        ? { ...ticket, status: newStatus as any, updatedAt: new Date().toISOString() }
        : ticket
    ));
    
    if (selectedTicket && selectedTicket.id === ticketId) {
      setSelectedTicket(prev => prev ? { ...prev, status: newStatus as any } : null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Support Center</h1>
              <p className="text-gray-600 mt-1">Manage customer support tickets and requests</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Tickets</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <TicketIcon className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Open Tickets</p>
                <p className="text-2xl font-bold text-gray-900">{stats.open}</p>
              </div>
              <div className="p-3 bg-red-50 rounded-lg">
                <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Response Time</p>
                <p className="text-2xl font-bold text-gray-900">{stats.avgResponseTime}</p>
              </div>
              <div className="p-3 bg-yellow-50 rounded-lg">
                <ClockIcon className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Satisfaction Rate</p>
                <p className="text-2xl font-bold text-gray-900">{stats.satisfactionRate}%</p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <CheckCircleIcon className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </motion.div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Tickets List */}
          <div className="lg:w-1/2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              {/* Filters */}
              <div className="p-6 border-b border-gray-200">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search tickets..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="all">All Status</option>
                      <option value="open">Open</option>
                      <option value="in_progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                    </select>
                    <select
                      value={priorityFilter}
                      onChange={(e) => setPriorityFilter(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="all">All Priority</option>
                      <option value="urgent">Urgent</option>
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Tickets */}
              <div className="max-h-96 overflow-y-auto">
                {filteredTickets.map((ticket) => (
                  <motion.div
                    key={ticket.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className={`p-4 border-b border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors ${
                      selectedTicket?.id === ticket.id ? 'bg-blue-50 border-blue-200' : ''
                    }`}
                    onClick={() => setSelectedTicket(ticket)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <div className={`w-3 h-3 rounded-full ${getPriorityColor(ticket.priority)}`}></div>
                          <span className="text-sm font-medium text-gray-900">{ticket.id}</span>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(ticket.status)}`}>
                            {getStatusIcon(ticket.status)}
                            <span className="ml-1 capitalize">{ticket.status.replace('_', ' ')}</span>
                          </span>
                        </div>
                        <h3 className="font-medium text-gray-900 mb-1">{ticket.subject}</h3>
                        <p className="text-sm text-gray-600 mb-2 line-clamp-2">{ticket.description}</p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <img
                              src={ticket.user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(ticket.user.name)}&background=random`}
                              alt={ticket.user.name}
                              className="w-6 h-6 rounded-full"
                            />
                            <span className="text-sm text-gray-600">{ticket.user.name}</span>
                          </div>
                          <span className="text-xs text-gray-500">{formatDate(ticket.updatedAt)}</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>

          {/* Ticket Detail */}
          <div className="lg:w-1/2">
            {selectedTicket ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                {/* Header */}
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`w-3 h-3 rounded-full ${getPriorityColor(selectedTicket.priority)}`}></div>
                        <span className="text-sm font-medium text-gray-900">{selectedTicket.id}</span>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedTicket.status)}`}>
                          {getStatusIcon(selectedTicket.status)}
                          <span className="ml-1 capitalize">{selectedTicket.status.replace('_', ' ')}</span>
                        </span>
                      </div>
                      <h2 className="text-xl font-semibold text-gray-900 mb-2">{selectedTicket.subject}</h2>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <img
                            src={selectedTicket.user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedTicket.user.name)}&background=random`}
                            alt={selectedTicket.user.name}
                            className="w-6 h-6 rounded-full"
                          />
                          <span>{selectedTicket.user.name}</span>
                        </div>
                        <span>•</span>
                        <span>{formatDate(selectedTicket.createdAt)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={selectedTicket.status}
                        onChange={(e) => handleStatusChange(selectedTicket.id, e.target.value)}
                        className="px-3 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="open">Open</option>
                        <option value="in_progress">In Progress</option>
                        <option value="resolved">Resolved</option>
                        <option value="closed">Closed</option>
                      </select>
                    </div>
                  </div>
                  
                  {/* Tags */}
                  {selectedTicket.tags.length > 0 && (
                    <div className="flex items-center gap-2 mt-4">
                      <TagIcon className="h-4 w-4 text-gray-400" />
                      <div className="flex gap-1">
                        {selectedTicket.tags.map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Messages */}
                <div className="p-6 max-h-96 overflow-y-auto">
                  <div className="space-y-4">
                    {selectedTicket.messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex gap-3 ${
                          message.author.type === 'admin' ? 'flex-row-reverse' : ''
                        }`}
                      >
                        <img
                          src={message.author.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(message.author.name)}&background=random`}
                          alt={message.author.name}
                          className="w-8 h-8 rounded-full flex-shrink-0"
                        />
                        <div className={`flex-1 max-w-xs ${
                          message.author.type === 'admin' ? 'text-right' : ''
                        }`}>
                          <div className={`inline-block p-3 rounded-lg ${
                            message.author.type === 'admin'
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 text-gray-900'
                          }`}>
                            <p className="text-sm">{message.content}</p>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            {message.author.name} • {formatDate(message.createdAt)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Reply */}
                <div className="p-6 border-t border-gray-200">
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <textarea
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type your reply..."
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <button className="flex items-center text-sm text-gray-600 hover:text-gray-900">
                      <PaperClipIcon className="h-4 w-4 mr-1" />
                      Attach file
                    </button>
                    <button
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim() || sendingMessage}
                      className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      {sendingMessage ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      ) : (
                        <PaperAirplaneIcon className="h-4 w-4 mr-2" />
                      )}
                      Send Reply
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                <ChatBubbleLeftRightIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Select a ticket</h3>
                <p className="text-gray-600">Choose a ticket from the list to view details and respond to customer inquiries.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSupport;