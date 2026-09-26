// EVVEX Landing Page: Blended corkboard gathering framework
import React from 'react';
import { EventLandingPage } from './EventLandingPage';

export const clearLandingPageCache = () => {
  // No-op for landing page cache
};

export const LandingPage: React.FC = () => {
  return <EventLandingPage />;
};

export default LandingPage;
