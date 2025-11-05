// src/components/CategorySelection.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings } from 'lucide-react';

const API_URL = process.env.REACT_APP_API_URL;

const CategorySelection = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ดึงข้อมูลประเภทด่านจาก API
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_URL}/api/demo/level-categories`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        if (data.success) {
          setCategories(data.data);
        } else {
          throw new Error(data.message || 'Failed to fetch categories');
        }
        setError(null);
      } catch (err) {
        console.error('Error fetching categories:', err);
        setError(err.message);
        // Fallback: ไม่มีข้อมูล categories
        setCategories([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  const handleCategorySelect = (categoryId) => {
    // ไปหน้าแสดงด่านในประเภทที่เลือก
    navigate(`/mapselect/${categoryId}`);
  };

  const getCategoryCount = (categoryId) => {
    // หาจำนวนด่านจากข้อมูลที่ได้รับจาก API
    const category = categories.find(cat => cat.category_id === categoryId);
    return category ? parseInt(category.level_count) : 0;
  };

  const getCategoryIcon = (categoryId) => {
    
  };

  const getCategoryColor = (difficulty_order) => {
    const colors = {
    1: "bg-gray-800 hover:bg-gray-900",
    2: "bg-gray-800 hover:bg-gray-900",
    3: "bg-gray-800 hover:bg-gray-900",
    4: "bg-gray-800 hover:bg-gray-900",
    5: "bg-gray-800 hover:bg-gray-900",
    6: "bg-gray-800 hover:bg-gray-900",
    7: "bg-gray-800 hover:bg-gray-900",
    8: "bg-gray-800 hover:bg-gray-900"
    };
    return colors[difficulty_order] || "bg-gray-800 hover:bg-gray-900";
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="container mx-auto px-4 py-8">
        <div className="mb-12">
          {/* Admin Panel Button */}
          <div className="mb-6">
            <button
              onClick={() => navigate('/adminpanel')}
              className="bg-gray-800 hover:bg-gray-900 text-white px-3 py-3 rounded-lg font-semibold transition-colors shadow-lg hover:shadow-xl"
            >
              <Settings />
            </button>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-800"></div>
            <p className="mt-4 text-gray-600">กำลังโหลดข้อมูล...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center py-12">
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              <p>เกิดข้อผิดพลาด: {error}</p>
              <button 
                onClick={() => window.location.reload()} 
                className="mt-2 bg-red-500 hover:bg-red-700 text-white px-4 py-2 rounded"
              >
                ลองใหม่
              </button>
            </div>
          </div>
        )}

        {/* Categories Grid */}
        {!loading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {categories.map((category) => {
              const count = getCategoryCount(category.category_id);
              const icon = getCategoryIcon(category.category_id);
              const colorClass = getCategoryColor(category.difficulty_order);
              
              return (
                <div
                  key={category.category_id}
                  onClick={() => handleCategorySelect(category.category_id)}
                  className={`${colorClass} text-white rounded-xl p-8 cursor-pointer transform transition-all duration-200 hover:scale-105 hover:shadow-lg`}
                >
                  {/* Category Icon */}
                  <div className="text-center mb-4">
                    <div className="text-5xl mb-2">{icon}</div>
                    <h3 className="text-xl font-semibold mb-2">{category.category_name}</h3>
                  </div>

                  {/* Category Description */}
                  {/* <p className="text-white/90 text-sm mb-4 text-center leading-relaxed">
                    {category.description || 'ไม่มีคำอธิบาย'}
                  </p> */}

                  {/* Level Count */}
                  <div className="text-center">
                    <div className="bg-white/20 rounded-full px-4 py-2 inline-block">
                      <span className="text-sm font-medium">
                        {count} ด่าน
                      </span>
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        )}

        {/* No Data State */}
        {!loading && !error && categories.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-600">ไม่พบข้อมูลประเภทด่าน</p>
          </div>
        )}

      </div>
    </div>
  );
};

export default CategorySelection;
