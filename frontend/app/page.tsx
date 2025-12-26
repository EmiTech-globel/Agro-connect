'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { io } from 'socket.io-client';

interface Price {
  time: string;
  product_id: number;
  product_name: string;
  category: string;
  location_id: number;
  location_name: string;
  state: string;
  price: string;
  unit: string;
  currency: string;
  price_per_kg: string | null;
  source_name: string;
}

export default function HomePage() {
  const [prices, setPrices] = useState<Price[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedState, setSelectedState] = useState<string>('all');

  // WebSocket connection
  useEffect(() => {
    const socket = io();
  
    socket.on('connect', () => {
      console.log('Connected to WebSocket');
      socket.emit('subscribe_prices');
    });
  
    socket.on('price_approved', (data) => {
      console.log('New price approved:', data);
      // Refresh prices
      fetchPrices();
      
      // Optional: Show toast notification
      console.log(`New price: ${data.product_name} at ${data.location_name}`);
    });
  
    return () => {
      socket.disconnect();
    };
  }, []);

  const fetchPrices = async () => {
    try {
      const response = await fetch('/api/prices?limit=100');
      const data = await response.json();
      
      if (data.success) {
        setPrices(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch prices:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrices();
    // Auto-refresh every 60 seconds
    const interval = setInterval(fetchPrices, 60000);
    return () => clearInterval(interval);
  }, []);

  const categories = ['all', ...new Set(prices.map(p => p.category))];
  const states = ['all', ...new Set(prices.map(p => p.state))];

  const filteredPrices = prices.filter(price => {
    if (selectedCategory !== 'all' && price.category !== selectedCategory) return false;
    if (selectedState !== 'all' && price.state !== selectedState) return false;
    return true;
  });

  const formatPrice = (price: string, currency: string) => {
    return `${currency === 'NGN' ? '₦' : currency}${parseFloat(price).toLocaleString()}`;
  };

  const formatTime = (timeStr: string) => {
    const date = new Date(timeStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString('en-NG');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-green-600">🌾 Agro Connect</h1>
              <p className="text-gray-600 mt-1">Live Agricultural Price Tracking</p>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Live Updates</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4">Filter Prices</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>
                    {cat === 'all' ? 'All Categories' : cat}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                State
              </label>
              <select
                value={selectedState}
                onChange={(e) => setSelectedState(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                {states.map(state => (
                  <option key={state} value={state}>
                    {state === 'all' ? 'All States' : state}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Price Cards */}
        {loading ? (
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-green-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading prices...</p>
          </div>
        ) : filteredPrices.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-500 text-lg">No prices available</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPrices.map((price, idx) => (
              <div
                key={`${price.product_id}-${price.location_id}-${idx}`}
                className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow p-6"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{price.product_name}</h3>
                    <span className="inline-block mt-1 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                      {price.category}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-green-600">
                      {formatPrice(price.price, price.currency)}
                    </div>
                    <div className="text-xs text-gray-500">per {price.unit}</div>
                  </div>
                </div>

                <div className="border-t pt-3 mt-3 space-y-2 text-sm">
                  <div className="flex items-center text-gray-600">
                    <span className="font-medium mr-2">📍 Location:</span>
                    <span>{price.location_name}</span>
                  </div>
                  <div className="flex items-center text-gray-600">
                    <span className="font-medium mr-2">🏛️ State:</span>
                    <span>{price.state}</span>
                  </div>
                  {price.price_per_kg && (
                    <div className="flex items-center text-gray-600">
                      <span className="font-medium mr-2">⚖️ Per kg:</span>
                      <span>{formatPrice(price.price_per_kg, price.currency)}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-xs text-gray-500 pt-2">
                    <span>Source: {price.source_name}</span>
                    <span>{formatTime(price.time)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Stats Footer */}
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <div className="grid md:grid-cols-3 gap-6 text-center">
            <div>
              <div className="text-3xl font-bold text-green-600">{filteredPrices.length}</div>
              <div className="text-gray-600 mt-1">Live Prices</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-blue-600">
                {new Set(filteredPrices.map(p => p.product_name)).size}
              </div>
              <div className="text-gray-600 mt-1">Products Tracked</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-purple-600">
                {new Set(filteredPrices.map(p => p.location_name)).size}
              </div>
              <div className="text-gray-600 mt-1">Market Locations</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}