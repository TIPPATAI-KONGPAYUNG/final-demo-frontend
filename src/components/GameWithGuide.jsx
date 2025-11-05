import React from 'react';
import GuidePopup from './GuidePopup';
import { useGuideSystem } from '../hooks/useGuideSystem';

const GameWithGuide = ({ levelData, children, levelName }) => {
  const { showGuide, guides, closeGuide } = useGuideSystem(levelData);

  return (
    <div className="relative">
      {/* Main Game Content */}
      <div className={`transition-all duration-300 ${showGuide ? 'opacity-80' : 'opacity-100'}`}>
        {children}
      </div>

      {/* Guide Popup */}
      {showGuide && (
        <GuidePopup
          guides={guides}
          onClose={closeGuide}
          levelName={levelName || levelData?.name || 'ด่าน'}
        />
      )}
    </div>
  );
};

export default GameWithGuide;
