import React, { useState } from 'react';

const GuidePopup = ({ guides, onClose, levelName }) => {
  const [currentGuideIndex, setCurrentGuideIndex] = useState(0);

  if (!guides || guides.length === 0) {
    return null;
  }

  const currentGuide = guides[currentGuideIndex];
  const isFirstGuide = currentGuideIndex === 0;
  const isLastGuide = currentGuideIndex === guides.length - 1;

  const handleNext = () => {
    if (currentGuideIndex < guides.length - 1) {
      setCurrentGuideIndex(currentGuideIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentGuideIndex > 0) {
      setCurrentGuideIndex(currentGuideIndex - 1);
    }
  };

  const handleClose = () => {
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black-900/5"></div>
      
      {/* Popup Content */}
      <div className="relative bg-gray-900 rounded-2xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gray-950 text-gray-100 p-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold mb-2">คำแนะนำ - {levelName}</h2>
              <div className="flex items-center space-x-2">
                <span className="bg-white-200 bg-opacity-2 px-3 py-1 rounded-full text-sm">
                  {currentGuideIndex + 1} / {guides.length}
                </span>
                <span className="text-gray-100">
                  {currentGuide.title}
                </span>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-full transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Guide Image */}
            <div className="space-y-4">
              <div className="aspect-video bg-gray-700 rounded-xl overflow-hidden flex items-center justify-center">
                <img
                  src={currentGuide.guide_image || '/placeholder-guide.svg'}
                  alt={currentGuide.title}
                  className="max-w-full max-h-full object-contain"
                  onError={(e) => {
                    e.target.src = '/placeholder-guide.svg';
                  }}
                />
              </div>
              
              {/* Progress Dots */}
              {guides.length > 1 && (
                <div className="flex justify-center space-x-2">
                  {guides.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentGuideIndex(index)}
                      className={`w-3 h-3 rounded-full transition-colors ${
                        index === currentGuideIndex
                          ? 'bg-gray-600'
                          : 'bg-gray-300 hover:bg-gray-400'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Guide Text */}
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-semibold text-gray-600 mb-3">
                  {currentGuide.title}
                </h3>
                <p className="text-gray-500 leading-relaxed">
                  {currentGuide.description}
                </p>
              </div>

              {/* Additional Info */}
              <div className="bg-gray-700 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <div className="text-white mt-1">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-medium text-white mb-1">เคล็ดลับ</h4>
                    <p className="text-white text-sm">
                      ทำตามขั้นตอนอย่างระมัดระวังและอ่านคำแนะนำให้ครบถ้วน
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-950 px-6 py-4 flex justify-between items-center">
          {/* Navigation Buttons */}
          <div className="flex space-x-3">
            <button
              onClick={handlePrevious}
              disabled={isFirstGuide}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                isFirstGuide
                  ? 'bg-gray-400 text-gray-500 cursor-not-allowed'
                  : 'bg-gray-300 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              ก่อนหน้า
            </button>
            
            <button
              onClick={handleNext}
              disabled={isLastGuide}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                isLastGuide
                  ? 'bg-gray-400 text-gray-500 cursor-not-allowed'
                  : 'bg-gray-300 text-gray-700 hover:bg-gray-300'
              }`}
            >
              ถัดไป
              <svg className="w-4 h-4 inline ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Close Button */}
          <button
            onClick={handleClose}
            className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all transform hover:scale-105"
          >
            {isLastGuide ? 'เริ่มเล่นเกม' : 'ข้ามคำแนะนำ'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GuidePopup;
