'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Product {
  id: number;
  name: string;
  category: string;
  unit: string;
}

interface Location {
  id: number;
  name: string;
  state: string;
}

export default function SubmitPrice() {
  const [products, setProducts] = useState<Product[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  
  const [formData, setFormData] = useState({
    product_id: '',
    location_id: '',
    price: '',
    unit: '',
    notes: ''
  });

  useEffect(() => {
    fetchProducts();
    fetchLocations();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/products');
      const data = await res.json();
      if (data.success) {
        setProducts(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch products:', error);
    }
  };

  const fetchLocations = async () => {
    try {
      const res = await fetch('/api/locations');
      const data = await res.json();
      if (data.success) {
        setLocations(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch locations:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);

    try {
      const response = await fetch('/api/submit-price', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
        setFormData({
          product_id: '',
          location_id: '',
          price: '',
          unit: '',
          notes: ''
        });
        
        setTimeout(() => setSuccess(false), 5000);
      } else {
        alert('Failed to submit: ' + data.error);
      }
    } catch (error) {
      console.error('Submission error:', error);
      alert('Failed to submit price');
    } finally {
      setLoading(false);
    }
  };

  const selectedProduct = products.find(p => p.id === parseInt(formData.product_id));

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Submit Market Price</h1>
              <p className="text-gray-600 mt-2">Help us track agricultural prices across Nigeria</p>
            </div>
            <Link href="/" className="text-blue-600 hover:text-blue-700">
              ← Back to Home
            </Link>
          </div>

          {success && (
            <div className="mb-6 p-4 bg-green-100 border border-green-400 rounded-lg">
              <p className="text-green-800 font-medium">✅ Price submitted successfully! Thank you.</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Product Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Product *
              </label>
              <select
                required
                value={formData.product_id}
                onChange={(e) => {
                  const product = products.find(p => p.id === parseInt(e.target.value));
                  setFormData({
                    ...formData,
                    product_id: e.target.value,
                    unit: product?.unit || ''
                  });
                }}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="">Select a product</option>
                {products.map(product => (
                  <option key={product.id} value={product.id}>
                    {product.name} ({product.category})
                  </option>
                ))}
              </select>
            </div>

            {/* Location Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Market Location *
              </label>
              <select
                required
                value={formData.location_id}
                onChange={(e) => setFormData({ ...formData, location_id: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="">Select a location</option>
                {locations.map(location => (
                  <option key={location.id} value={location.id}>
                    {location.name}, {location.state}
                  </option>
                ))}
              </select>
            </div>

            {/* Price Input */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Price (₦) *
              </label>
              <input
                type="number"
                required
                step="0.01"
                min="0"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                placeholder="e.g., 45000"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            {/* Unit */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Unit *
              </label>
              <input
                type="text"
                required
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                placeholder="e.g., bag (50kg)"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
              {selectedProduct && (
                <p className="text-sm text-gray-500 mt-1">
                  Typical unit: {selectedProduct.unit}
                </p>
              )}
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Additional Notes (optional)
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Quality, variety, or other relevant information..."
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Submitting...' : 'Submit Price'}
            </button>
          </form>

          <div className="mt-8 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">📝 Submission Guidelines</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Enter current market prices you have observed today</li>
              <li>• Ensure prices are accurate and from reliable sources</li>
              <li>• Submitted prices will be reviewed before publishing</li>
              <li>• Thank you for contributing to transparent pricing!</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}