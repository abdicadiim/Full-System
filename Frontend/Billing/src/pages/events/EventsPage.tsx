import React, { useState, useEffect, useMemo } from 'react';
import { eventsAPI } from '../../services/api';
import { 
  Search, 
  ChevronDown, 
  X, 
  Copy, 
  Trash2,
  ChevronRight,
  ChevronLeft,
  Star,
  RefreshCw
} from 'lucide-react';
import { toast } from 'react-toastify';

interface Event {
  id: string;
  event_id: string;
  event_type: string;
  occurred_at: string;
  source: string;
  event_source?: string;
  event_time_formatted?: string;
  created_time?: string;
  data: any;
}

const EVENT_TYPE_COLORS: Record<string, string> = {
  customer_updated:    'text-teal-600',
  customer_created:    'text-blue-600',
  customer_deleted:    'text-red-500',
  invoice_created:     'text-orange-500',
  invoice_updated:     'text-orange-500',
  invoice_voided:      'text-red-400',
  quote_created:       'text-purple-500',
  quote_updated:       'text-purple-500',
  payment_received:    'text-green-600',
  payment_failure:     'text-red-500',
  subscription_created:'text-blue-500',
  cancel_subscription: 'text-red-500',
  addon_added:         'text-indigo-500',
};

const getEventColor = (type: string) => {
  return EVENT_TYPE_COLORS[type?.toLowerCase()] || 'text-gray-600';
};

const formatEventLabel = (type: string) =>
  (type || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [filterType, setFilterType] = useState('All Events');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filterSearch, setFilterSearch] = useState('');
  const [expandedSections, setExpandedSections] = useState<string[]>([]);

  const FILTER_CATEGORIES = [
    { name: 'Default Filters', count: 1, items: ['All Events'] },
    {
      name: 'Subscription', count: 18,
      items: [
        'New Subscription','Subscription Activation','Upgrade Subscription',
        'Downgrade Subscription','Subscription Renewal','Cancel Subscription',
        'Reactivate Subscription','Subscription Expired','Subscription Renewal Ahead',
        'Subscription Cancellation Scheduled','Subscription Scheduled Cancellation Removed',
        'Subscription Marked as Unpaid','Subscription Deleted','Billing Date Changed',
        'Subscription Paused','Subscription Resumed','Subscription Move To Free Scheduled',
        'Subscription Reactivation Scheduled'
      ]
    },
    { name: 'Payment', count: 4, items: ['Payment Thank-You','Payment Failure','Payment Refund','Payment Voided'] },
    { name: 'Invoice', count: 3, items: ['Invoice Notification','Invoice Updated','Invoice Voided'] },
    { name: 'Expiry & Cancellation', count: 4, items: ['Trial About to Expire','Subscription about to be Cancelled','Subscription About to Expire','Card about to Expire'] },
    { name: 'Expired', count: 1, items: ['Card Expired'] },
    { name: 'Card', count: 1, items: ['Card Deleted'] },
    { name: 'Credit Note', count: 3, items: ['Credit Note Added','Credit Note Refunded','Credit Note Deleted'] },
    { name: 'Payment Method', count: 3, items: ['Payment Method Added','Payment Method Deleted','Payment Method Updated'] },
    { name: 'Unbilled Charges', count: 4, items: ['Unbilled charges added','Unbilled charges updated','Unbilled charges invoiced','Unbilled charges deleted'] }
  ];

  const toggleSection = (name: string) => {
    setExpandedSections(prev =>
      prev.includes(name) ? prev.filter(s => s !== name) : [...prev, name]
    );
  };

  useEffect(() => { loadEvents(); }, []);

  const loadEvents = async () => {
    setIsLoading(true);
    try {
      const response = await eventsAPI.getAll();
      if (response.success) {
        setEvents(response.data);
        if (response.data.length > 0 && !selectedEvent) {
          setSelectedEvent(response.data[0]);
        }
      }
    } catch (error) {
      toast.error('Failed to load events');
    } finally {
      setIsLoading(false);
    }
  };

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { 'All Events': events.length };
    FILTER_CATEGORIES.forEach(cat => {
      if (cat.name === 'Default Filters') return;
      let total = 0;
      cat.items.forEach(item => {
        const n = item.toLowerCase().replace(/\s+/g, '_');
        total += events.filter(e => e.event_type.toLowerCase() === n || e.event_type === item).length;
      });
      counts[cat.name] = total;
    });
    return counts;
  }, [events]);

  const filteredEvents = useMemo(() => {
    return events.filter(event => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = !q ||
        event.event_id.toLowerCase().includes(q) ||
        event.event_type.toLowerCase().includes(q) ||
        (event.source || '').toLowerCase().includes(q);
      const n = filterType.toLowerCase().replace(/\s+/g, '_');
      const matchesFilter = filterType === 'All Events' ||
        event.event_type.toLowerCase() === n ||
        event.event_type === filterType;
      return matchesSearch && matchesFilter;
    });
  }, [events, searchQuery, filterType]);

  const formatDateTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true
      }).format(date);
    } catch { return dateString; }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this event log?')) return;
    try {
      const res = await eventsAPI.delete(id);
      if (res.success) {
        const remaining = events.filter(e => e.id !== id);
        setEvents(remaining);
        setSelectedEvent(remaining[0] || null);
        toast.success('Event deleted');
      }
    } catch { toast.error('Failed to delete event'); }
  };

  return (
    <div className="flex flex-col h-full bg-white relative font-sans">
      {/* Top Header */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-100 bg-white z-[100] relative overflow-visible">
        {/* Filter Dropdown */}
        <div className="relative overflow-visible">
          <button
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className={`flex items-center gap-2 px-3 py-1.5 text-[13px] font-semibold transition-all rounded-lg border ${isFilterOpen ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
          >
            <span className="truncate max-w-[200px]">{filterType}</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isFilterOpen ? 'rotate-180' : ''}`} />
          </button>

          {isFilterOpen && (
            <>
              <div className="fixed inset-0 z-[1000]" onClick={() => setIsFilterOpen(false)} />
              <div className="absolute left-0 top-full mt-1 w-80 bg-white border border-gray-200 rounded-xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.2)] z-[1001] overflow-hidden flex flex-col max-h-[500px]">
                <div className="p-3 border-b border-gray-50">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search filters..."
                      value={filterSearch}
                      onChange={(e) => setFilterSearch(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400"
                    />
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto">
                  {FILTER_CATEGORIES.map(category => {
                    const isExpanded = expandedSections.includes(category.name);
                    const filteredItems = category.items.filter(item =>
                      item.toLowerCase().includes(filterSearch.toLowerCase())
                    );
                    if (filterSearch && filteredItems.length === 0) return null;
                    return (
                      <div key={category.name} className="border-b border-gray-50 last:border-0">
                        <button
                          onClick={() => toggleSection(category.name)}
                          className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50/50 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${isExpanded ? '' : '-rotate-90'}`} />
                            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">{category.name}</span>
                          </div>
                          <span className="bg-blue-50 text-blue-600 text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                            {categoryCounts[category.name] ?? category.count}
                          </span>
                        </button>
                        {isExpanded && (
                          <div className="pb-1">
                            {filteredItems.map(item => (
                              <button
                                key={item}
                                onClick={() => { setFilterType(item); setIsFilterOpen(false); }}
                                className={`w-full text-left px-9 py-2 text-[13px] transition-colors flex items-center justify-between group ${filterType === item ? 'bg-blue-50/50 text-blue-600 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}
                              >
                                <span>{item}</span>
                                {item === 'All Events' ? (
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] text-gray-400">{categoryCounts['All Events']}</span>
                                    <Star className={`w-3.5 h-3.5 ${filterType === item ? 'text-amber-400 fill-amber-400' : 'text-gray-300 group-hover:text-gray-400'}`} />
                                  </div>
                                ) : (
                                  <span className="text-[10px] text-gray-400">
                                    {events.filter(e => { const n = item.toLowerCase().replace(/\s+/g, '_'); return e.event_type.toLowerCase() === n || e.event_type === item; }).length || ''}
                                  </span>
                                )}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            type="text"
            placeholder="Search events..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-1.5 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400 bg-gray-50"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <button
          onClick={loadEvents}
          className={`p-1.5 text-gray-400 hover:bg-gray-100 rounded-md transition-colors ${isLoading ? 'animate-spin' : ''}`}
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>

        <div className="ml-auto text-[12px] text-gray-400">
          {filteredEvents.length} event{filteredEvents.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Always-split layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <div className="w-[260px] flex-shrink-0 flex flex-col border-r border-gray-100 bg-white overflow-hidden">
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 text-center text-[13px] text-gray-400">Loading...</div>
            ) : filteredEvents.length === 0 ? (
              <div className="p-4 text-center text-[13px] text-gray-400">No events found.</div>
            ) : (
              filteredEvents.map(event => {
                const isActive = selectedEvent?.id === event.id;
                return (
                  <div
                    key={event.id}
                    onClick={() => setSelectedEvent(event)}
                    className={`px-5 py-4 cursor-pointer border-b border-gray-50 transition-all relative ${
                      isActive
                        ? 'bg-white border-l-[3px] border-l-teal-600 shadow-sm'
                        : 'hover:bg-gray-50/70 border-l-[3px] border-l-transparent'
                    }`}
                  >
                    <div className="text-[12px] font-mono text-gray-500 mb-0.5 truncate">{event.event_id}</div>
                    <div className="text-[11px] text-gray-400 mb-1">{formatDateTime(event.occurred_at)}</div>
                    <div className={`text-[12px] font-semibold truncate ${getEventColor(event.event_type)}`}>
                      {formatEventLabel(event.event_type)}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Detail Panel */}
        {selectedEvent ? (
          <div className="flex-1 flex flex-col bg-white overflow-hidden">
            {/* Panel Header */}
            <div className="flex items-center justify-between px-8 py-4 border-b border-gray-100 bg-white sticky top-0 z-10">
              <h1 className="text-[15px] font-bold text-gray-800">
                {formatEventLabel(selectedEvent.event_type)}
              </h1>
              <button
                onClick={() => setSelectedEvent(filteredEvents[0] || null)}
                className="p-1.5 hover:bg-gray-100 rounded-md transition-colors text-gray-400 hover:text-red-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Panel Body */}
            <div className="flex-1 overflow-auto p-8">
              <div className="max-w-3xl">
                {/* Event Meta */}
                <div className="mb-8">
                  <div className="text-[18px] font-bold text-gray-800 mb-1 font-mono">{selectedEvent.event_id}</div>
                  <div className="text-[13px] text-gray-500 mb-0.5">
                    {formatDateTime(selectedEvent.created_time || selectedEvent.occurred_at)}
                  </div>
                  <div className="text-[12px] text-gray-400 capitalize">
                    {selectedEvent.event_source || selectedEvent.source || 'user'}
                  </div>
                </div>

                {/* Event Data */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-[13px] font-bold text-gray-700 uppercase tracking-wider">Event Data</h3>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => copyToClipboard(JSON.stringify(selectedEvent.data, null, 2))}
                        className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-blue-600 transition-all"
                        title="Copy JSON"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(selectedEvent.id)}
                        className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500 transition-all"
                        title="Delete Event"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="rounded-xl border border-gray-200 bg-gray-50 overflow-hidden">
                    <pre className="p-6 text-[12.5px] leading-relaxed text-gray-700 font-mono overflow-auto max-h-[calc(100vh-340px)]">
                      {JSON.stringify(selectedEvent.data, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50/30">
            <div className="text-center text-gray-400">
              <div className="text-[14px]">Select an event to view details</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
