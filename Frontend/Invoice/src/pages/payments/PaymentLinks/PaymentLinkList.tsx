import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  Search, 
  ChevronDown, 
  Plus, 
  MoreVertical, 
  Filter, 
  ArrowUpDown,
  Edit,
  Trash2,
  Check,
  Copy,
  Link as LinkIcon,
  X,
  ExternalLink,
  Eye,
  EyeOff
} from 'lucide-react';
import Checkbox from '../../../components/Checkbox';
import Loader from '../../../components/Loader';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const PaymentLinkList = () => {
  const navigate = useNavigate();
  const { linkId } = useParams();
  const [paymentLinks, setPaymentLinks] = useState([]);
  const [selectedLinks, setSelectedLinks] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedView, setSelectedView] = useState('All Links');
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isDownloadMenuOpen, setIsDownloadMenuOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedLinkId, setCopiedLinkId] = useState(null);
  const moreMenuRef = useRef(null);
  const downloadMenuRef = useRef(null);

  const views = [
    'All Links',
    'Active',
    'Inactive',
    'Expired'
  ];

  useEffect(() => {
    fetchPaymentLinks();
  }, [selectedView]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target)) {
        setIsMoreMenuOpen(false);
      }
      if (downloadMenuRef.current && !downloadMenuRef.current.contains(event.target)) {
        setIsDownloadMenuOpen(false);
      }
    };

    if (isMoreMenuOpen || isDownloadMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMoreMenuOpen, isDownloadMenuOpen]);

  const fetchPaymentLinks = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/payment-links`);
      
      if (!response.ok) {
        // If endpoint doesn't exist yet, set empty array
        if (response.status === 404) {
          setPaymentLinks([]);
          return;
        }
        throw new Error('Failed to fetch payment links');
      }
      
      const data = await response.json();
      setPaymentLinks(Array.isArray(data.paymentLinks || data.links) ? (data.paymentLinks || data.links) : []);
    } catch (error) {
      console.error('Error fetching payment links:', error);
      setPaymentLinks([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedLinks(new Set(filteredLinks.map(l => l._id)));
    } else {
      setSelectedLinks(new Set());
    }
  };

  const handleSelectLink = (linkId) => {
    const newSelected = new Set(selectedLinks);
    if (newSelected.has(linkId)) {
      newSelected.delete(linkId);
    } else {
      newSelected.add(linkId);
    }
    setSelectedLinks(newSelected);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric' 
    });
  };

  const formatCurrency = (amount, currency = 'USD') => {
    return `$${amount?.toFixed(2) || '0.00'}`;
  };

  const getStatusColor = (status, expiryDate) => {
    if (expiryDate && new Date(expiryDate) < new Date()) {
      return 'text-red-600 bg-red-50';
    }
    const colors = {
      active: 'text-green-600 bg-green-50',
      inactive: 'text-gray-600 bg-gray-50',
      expired: 'text-red-600 bg-red-50'
    };
    return colors[status?.toLowerCase()] || colors.inactive;
  };

  const getStatusLabel = (status, expiryDate) => {
    if (expiryDate && new Date(expiryDate) < new Date()) {
      return 'Expired';
    }
    const labels = {
      active: 'Active',
      inactive: 'Inactive',
      expired: 'Expired'
    };
    return labels[status?.toLowerCase()] || 'Inactive';
  };

  const handleViewSelect = (view) => {
    setSelectedView(view);
    setIsDropdownOpen(false);
  };

  const handleCopyLink = async (link, e) => {
    e.stopPropagation();
    const linkUrl = link.shareUrl || link.url || `${window.location.origin}/pay/${link._id}`;
    try {
      await navigator.clipboard.writeText(linkUrl);
      setCopiedLinkId(link._id);
      setTimeout(() => setCopiedLinkId(null), 2000);
    } catch (error) {
      console.error('Failed to copy link:', error);
      alert('Failed to copy link to clipboard');
    }
  };

  const handleToggleStatus = async (linkId, currentStatus, e) => {
    e.stopPropagation();
    try {
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
      const response = await fetch(`${API_BASE_URL}/payment-links/${linkId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      
      if (response.ok) {
        fetchPaymentLinks();
      } else {
        alert('Failed to update link status');
      }
    } catch (error) {
      console.error('Error updating link status:', error);
      alert('Failed to update link status');
    }
  };

  const handleDeleteLink = async (linkId, e) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this payment link?')) {
      try {
        const response = await fetch(`${API_BASE_URL}/payment-links/${linkId}`, {
          method: 'DELETE'
        });
        
        if (response.ok) {
          fetchPaymentLinks();
          setSelectedLinks(prev => {
            const newSet = new Set(prev);
            newSet.delete(linkId);
            return newSet;
          });
        } else {
          alert('Failed to delete payment link');
        }
      } catch (error) {
        console.error('Error deleting payment link:', error);
        alert('Failed to delete payment link');
      }
    }
  };

  const handleBulkDelete = async () => {
    if (selectedLinks.size === 0) return;
    if (window.confirm(`Are you sure you want to delete ${selectedLinks.size} payment link(s)?`)) {
      try {
        const deletePromises = Array.from(selectedLinks).map(id =>
          fetch(`${API_BASE_URL}/payment-links/${id}`, { method: 'DELETE' })
        );
        await Promise.all(deletePromises);
        fetchPaymentLinks();
        setSelectedLinks(new Set());
      } catch (error) {
        console.error('Error deleting payment links:', error);
        alert('Failed to delete payment links');
      }
    }
  };

  const handleCreateLink = async (linkData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/payment-links`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(linkData)
      });

      if (response.ok) {
        setIsCreateModalOpen(false);
        fetchPaymentLinks();
        alert('Payment link created successfully');
      } else {
        const errorData = await response.json().catch(() => ({}));
        alert(errorData.message || 'Failed to create payment link');
      }
    } catch (error) {
      console.error('Error creating payment link:', error);
      alert('Failed to create payment link: ' + error.message);
    }
  };

  const filteredLinks = paymentLinks.filter(link => {
    // Filter by view
    if (selectedView === 'Active' && link.status?.toLowerCase() !== 'active') {
      if (!(link.expiryDate && new Date(link.expiryDate) >= new Date())) return false;
      if (link.status?.toLowerCase() === 'inactive') return false;
    }
    if (selectedView === 'Inactive' && link.status?.toLowerCase() !== 'inactive') {
      return false;
    }
    if (selectedView === 'Expired') {
      if (!link.expiryDate || new Date(link.expiryDate) >= new Date()) {
        return false;
      }
    }

    // Filter by search query
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      link.name?.toLowerCase().includes(query) ||
      link.description?.toLowerCase().includes(query) ||
      link.customer?.name?.toLowerCase().includes(query) ||
      link.linkId?.toLowerCase().includes(query) ||
      link._id?.slice(-6).toLowerCase().includes(query)
    );
  });

  if (loading) {
    return (
      <div className="w-full max-w-full mx-auto py-5 px-6 bg-white min-h-screen">
        <Loader />
      </div>
    );
  }

  return (
    <div className="w-full max-w-full mx-auto py-5 px-6 bg-white min-h-screen">
      {/* Page Header */}
      <div className="flex justify-between items-center mb-6">
        {/* Title with Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className={`flex items-center gap-2 bg-transparent border-none rounded-md px-3 py-1.5 cursor-pointer transition-colors ${
              isDropdownOpen ? 'bg-blue-50 hover:bg-blue-50' : 'hover:bg-gray-100'
            }`}
          >
            <h1 className="m-0 text-2xl font-semibold text-gray-900">
              {selectedView}
            </h1>
            {isDropdownOpen ? (
              <ChevronDown size={20} className="transition-transform text-gray-500 rotate-180" />
            ) : (
              <ChevronDown size={20} className="transition-transform text-gray-500" />
            )}
          </button>

          {/* Dropdown Menu */}
          {isDropdownOpen && (
            <div className="absolute top-full left-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-xl min-w-[200px] z-[1000]">
              {views.map((view) => (
                <div
                  key={view}
                  onClick={() => handleViewSelect(view)}
                  className={`flex items-center justify-between px-4 py-2.5 cursor-pointer transition-colors hover:bg-gray-50 ${
                    view === selectedView ? 'bg-blue-50' : ''
                  }`}
                >
                  <span className={`text-sm ${view === selectedView ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                    {view}
                  </span>
                  {view === selectedView && (
                    <Check size={16} className="text-blue-600" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button 
            className="
              flex items-center gap-2
              px-4 py-2
              text-sm font-medium
              text-white
              bg-[rgb(21,99,114)]
              rounded-[45px]
              shadow-[0_8px_15px_rgba(0,0,0,0.1)]
              transition-all duration-300
              cursor-pointer outline-none
              hover:bg-[rgb(245,178,33)]
              hover:shadow-[0_15px_20px_rgba(245,178,33,0.4)]
              hover:text-white
              hover:-translate-y-[7px]
              active:-translate-y-[1px]
            "
            onClick={() => setIsCreateModalOpen(true)}
          >
            <Plus size={16} />
            New Payment Link
          </button>
          <div className="relative" ref={moreMenuRef}>
            <button 
              className="flex items-center justify-center w-9 h-9 bg-gray-50 border border-gray-200 rounded-md cursor-pointer text-gray-500 transition-colors hover:bg-gray-100"
              onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
            >
              <MoreVertical size={18} />
            </button>

            {isMoreMenuOpen && (
              <div className="absolute top-full right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-xl min-w-[200px] z-[1000]">
                <div className="flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors hover:bg-gray-50 text-sm text-gray-700">
                  <Filter size={16} className="text-gray-500 flex-shrink-0" />
                  <span className="flex-1">Filter</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search in Payment Links (/)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
          <button className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600">
            <ChevronDown size={16} />
          </button>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedLinks.size > 0 && (
        <div className="mb-4 flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
          <div className="flex items-center gap-4">
            <button 
              onClick={handleBulkDelete}
              className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 rounded-md text-sm font-medium cursor-pointer transition-colors hover:bg-gray-50 text-red-600"
            >
              <Trash2 size={16} />
              Delete
            </button>
            <div className="flex items-center gap-2 ml-4">
              <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-semibold">
                {selectedLinks.size}
              </div>
              <span className="text-sm text-gray-700">Selected</span>
            </div>
          </div>
          <button
            onClick={() => setSelectedLinks(new Set())}
            className="flex items-center gap-2 px-3 py-1.5 bg-transparent border-none text-gray-600 cursor-pointer transition-colors hover:text-gray-900"
          >
            <X size={16} />
            Esc
          </button>
        </div>
      )}

      {/* Table Container */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
        <table className="w-full border-collapse text-[13px]">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="w-12 text-center py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wide">
                <div className="flex items-center gap-2">
                  <Filter size={14} className="text-gray-500 cursor-pointer hover:text-gray-700" />
                  <Checkbox
                    checked={selectedLinks.size === filteredLinks.length && filteredLinks.length > 0}
                    onChange={handleSelectAll}
                  />
                </div>
              </th>
              <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wide">
                <button className="flex items-center gap-1.5 bg-transparent border-none cursor-pointer p-0 text-inherit font-inherit hover:text-gray-900">
                  LINK NAME
                  <ArrowUpDown size={14} className="text-gray-400" />
                </button>
              </th>
              <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wide">
                AMOUNT
              </th>
              <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wide">
                CUSTOMER
              </th>
              <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wide">
                STATUS
              </th>
              <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wide">
                CREATED DATE
              </th>
              <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wide">
                EXPIRY DATE
              </th>
              <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wide">
                USAGE
              </th>
              <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wide">
                ACTIONS
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredLinks.length === 0 ? (
              <tr>
                <td colSpan="9" className="py-8 text-center text-gray-500">
                  No payment links found
                </td>
              </tr>
            ) : (
              filteredLinks.map((link) => (
                <tr 
                  key={link._id}
                  className="border-b border-gray-200 transition-colors hover:bg-gray-50"
                >
                  <td onClick={(e) => e.stopPropagation()} className="py-3 px-4 text-gray-900">
                    <Checkbox
                      checked={selectedLinks.has(link._id)}
                      onChange={() => handleSelectLink(link._id)}
                    />
                  </td>
                  <td className="py-3 px-4 text-gray-900">
                    <div className="flex flex-col">
                      <span className="font-medium">{link.name || 'Unnamed Link'}</span>
                      {link.description && (
                        <span className="text-xs text-gray-500">{link.description}</span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-gray-900">
                    {formatCurrency(link.amount, link.currency)}
                  </td>
                  <td className="py-3 px-4 text-gray-900">
                    {link.customer?.name || '-'}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(link.status, link.expiryDate)}`}>
                      {getStatusLabel(link.status, link.expiryDate)}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-900">
                    {formatDate(link.createdAt || link.createdDate)}
                  </td>
                  <td className="py-3 px-4 text-gray-900">
                    {link.expiryDate ? formatDate(link.expiryDate) : 'No expiry'}
                  </td>
                  <td className="py-3 px-4 text-gray-900">
                    {link.usageCount || 0} {link.usageCount === 1 ? 'time' : 'times'}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => handleCopyLink(link, e)}
                        className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="Copy link"
                      >
                        {copiedLinkId === link._id ? (
                          <Check size={16} className="text-green-600" />
                        ) : (
                          <Copy size={16} />
                        )}
                      </button>
                      <button
                        onClick={(e) => handleToggleStatus(link._id, link.status, e)}
                        className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                        title={link.status === 'active' ? 'Deactivate' : 'Activate'}
                      >
                        {link.status === 'active' ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                      <button
                        onClick={(e) => handleDeleteLink(link._id, e)}
                        className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create Payment Link Modal */}
      {isCreateModalOpen && (
        <CreatePaymentLinkModal
          onClose={() => setIsCreateModalOpen(false)}
          onCreate={handleCreateLink}
        />
      )}
    </div>
  );
};

// Create Payment Link Modal Component
const CreatePaymentLinkModal = ({ onClose, onCreate }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    amount: '',
    currency: 'USD',
    customerId: '',
    expiryDate: '',
    status: 'active'
  });
  const [customers, setCustomers] = useState([]);

  useEffect(() => {
    fetchCustomers();
    // Set default expiry to 90 days from now
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 90);
    setFormData(prev => ({
      ...prev,
      expiryDate: defaultDate.toISOString().split('T')[0]
    }));
  }, []);

  const fetchCustomers = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/customers`);
      if (response.ok) {
        const data = await response.json();
        setCustomers(Array.isArray(data.customers) ? data.customers : []);
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.amount) {
      alert('Please fill in all required fields');
      return;
    }

    onCreate({
      name: formData.name,
      description: formData.description,
      amount: parseFloat(formData.amount),
      currency: formData.currency,
      customer: formData.customerId || undefined,
      expiryDate: formData.expiryDate || undefined,
      status: formData.status
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Create Payment Link</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Link Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="3"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Amount <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="amount"
                value={formData.amount}
                onChange={handleChange}
                step="0.01"
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Currency
              </label>
              <select
                name="currency"
                value={formData.currency}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
                <option value="SOS">SOS</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Customer (Optional)
            </label>
            <select
              name="customerId"
              value={formData.customerId}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a customer</option>
              {customers.map(customer => (
                <option key={customer._id} value={customer._id}>
                  {customer.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Expiry Date
            </label>
            <input
              type="date"
              name="expiryDate"
              value={formData.expiryDate}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-[rgb(21,99,114)] rounded-md hover:bg-[rgb(245,178,33)] transition-colors"
            >
              Create Link
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PaymentLinkList;
