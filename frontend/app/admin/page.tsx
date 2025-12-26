'use client';

import { useEffect, useState } from 'react';

interface ReviewItem {
  id: number;
  product_name: string;
  product_category: string;
  location_name: string;
  state: string;
  price: string;
  unit: string;
  currency: string;
  scraped_at: string;
  status: string;
  flagged_reason: string | null;
  source_name: string;
  reliability_score: number;
}

export default function AdminDashboard() {
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'flagged'>('pending');

  const fetchReviewQueue = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/review?status=${filter}`);
      const contentType = response.headers.get('content-type') || '';

      if (!response.ok) {
        const text = await response.text();
        console.error('Non-OK response fetching review queue:', response.status, text);
        return;
      }

      if (!contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Expected JSON but received:', text);
        return;
      }

      const data = await response.json();

      if (data.success) {
        setItems(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch review queue:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviewQueue();
    const interval = setInterval(fetchReviewQueue, 30000);
    return () => clearInterval(interval);
  }, [filter]);

  const handleAction = async (id: number, action: 'approve' | 'reject') => {
    try {
      const response = await fetch('/api/admin/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action })
      });

      const contentType = response.headers.get('content-type') || '';

      if (!response.ok) {
        const text = await response.text();
        console.error('Non-OK response for action:', response.status, text);
        alert('Action failed: server error');
        return;
      }

      if (!contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Expected JSON but received for action:', text);
        alert('Action failed: invalid server response');
        return;
      }

      const data = await response.json();

      if (data.success) {
        setItems(items.filter(item => item.id !== id));
      } else {
        alert('Action failed: ' + data.error);
      }
    } catch (error) {
      console.error('Action failed:', error);
      alert('Failed to process action');
    }
  };

  const formatPrice = (price: string, currency: string) => {
    return `${currency === 'NGN' ? '₦' : currency}${parseFloat(price).toLocaleString()}`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-NG', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Review Dashboard</h1>
          <p className="text-gray-600 mt-2">Review and approve scraped agricultural prices</p>
        </div>

        <div className="bg-white rounded-lg shadow mb-6 p-4">
          <div className="flex gap-4">
            <button
              onClick={() => setFilter('pending')}
              className={`px-4 py-2 rounded-lg font-medium ${
                filter === 'pending'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Pending
            </button>
            <button
              onClick={() => setFilter('flagged')}
              className={`px-4 py-2 rounded-lg font-medium ${
                filter === 'flagged'
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Flagged
            </button>
            <button
              onClick={fetchReviewQueue}
              className="ml-auto px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700"
            >
              Refresh
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading review queue...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-500 text-lg">No items to review</p>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((item) => (
              <div
                key={item.id}
                className={`bg-white rounded-lg shadow p-6 ${
                  item.status === 'flagged' ? 'border-l-4 border-red-500' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold text-gray-900">{item.product_name}</h3>
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                        {item.product_category}
                      </span>
                      {item.status === 'flagged' && (
                        <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
                          Flagged
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Location:</span>
                        <span className="ml-2 font-medium">{item.location_name}, {item.state}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Price:</span>
                        <span className="ml-2 font-bold text-green-600 text-lg">
                          {formatPrice(item.price, item.currency)}
                        </span>
                        <span className="text-gray-500 ml-1">per {item.unit}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Source:</span>
                        <span className="ml-2 font-medium">{item.source_name}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Scraped:</span>
                        <span className="ml-2">{formatDate(item.scraped_at)}</span>
                      </div>
                    </div>

                    {item.flagged_reason && (
                      <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded">
                        <p className="text-sm text-red-800">
                          <strong>⚠️ Flag Reason:</strong> {item.flagged_reason}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 ml-6">
                    <button
                      onClick={() => handleAction(item.id, 'approve')}
                      className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                    >
                      ✓ Approve
                    </button>
                    <button
                      onClick={() => handleAction(item.id, 'reject')}
                      className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
                    >
                      ✗ Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}