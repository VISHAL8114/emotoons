import React from 'react';
import './ShootingStars.scss';

const ShootingStars = ({ children }) => {
    return (
        <div className="wrap">
          <div className="top-plane"></div>
          <div className="bottom-plane"></div>
          {children}
        </div>
    );
};

export default ShootingStars;