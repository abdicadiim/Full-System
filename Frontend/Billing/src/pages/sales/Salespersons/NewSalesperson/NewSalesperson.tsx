import React, { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { X } from "lucide-react";
import { salespersonsAPI } from "../../../../services/api";

export default function NewSalesperson() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const isEditMode = !!id;

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    commissionRate: "",
    isActive: true
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchSalesperson = async () => {
      if (isEditMode && id) {
        setLoading(true);
        try {
          const response = await salespersonsAPI.getById(id);
          if (response && response.success && response.data) {
            const sp = response.data;
            setFormData({
              name: sp.name || "",
              email: sp.email || "",
              phone: sp.phone || "",
              commissionRate: sp.commissionRate || "",
              isActive: sp.isActive !== undefined ? sp.isActive : true
            });
          }
        } catch (error) {
          console.error("Error fetching salesperson:", error);
        } finally {
          setLoading(false);
        }
      }
    };
    fetchSalesperson();
  }, [isEditMode, id]);

  const handleChange = (e: { target: { name: any; value: any; type: any; checked: any; }; }) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
  };

  const handleSave = async () => {
    if (!formData.name || !formData.email) {
      alert("Please fill in Name and Email");
      return;
    }

    try {
      if (isEditMode) {
        await salespersonsAPI.update(id, formData);
      } else {
        await salespersonsAPI.create(formData);
      }
      const returnTo = location.state?.returnTo || "/sales/credit-notes/new";
      navigate(returnTo);
    } catch (error) {
      console.error("Error saving salesperson:", error);
      alert("Failed to save salesperson. Please try again.");
    }
  };

  const handleCancel = () => {
    const returnTo = location.state?.returnTo || "/sales/sales-receipts/new";
    navigate(returnTo);
  };

  return (
    <div className="w-full min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">
          {isEditMode ? "Edit Salesperson" : "New Salesperson"}
        </h1>
        <button
          className="p-2 hover:bg-gray-100 rounded-md text-gray-600 hover:text-gray-900 transition-colors"
          onClick={handleCancel}
        >
          <X size={20} />
        </button>
      </div>

      <div className="p-6">
        <div className="bg-white border border-gray-200 rounded-lg p-6 max-w-2xl">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name<span className="text-red-500 ml-1">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter salesperson name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email<span className="text-red-500 ml-1">*</span>
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter email address"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                type="text"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter phone number"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Commission Rate (%)</label>
              <input
                type="number"
                name="commissionRate"
                value={formData.commissionRate}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0.00"
                step="0.01"
                min="0"
                max="100"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="isActive"
                  checked={formData.isActive}
                  onChange={handleChange}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Active</span>
              </label>
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            className="px-6 py-2 bg-white border border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors"
            onClick={handleCancel}
          >
            Cancel
          </button>
          <button
            className="px-6 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
            onClick={handleSave}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

