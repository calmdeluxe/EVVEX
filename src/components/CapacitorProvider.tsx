import React from 'react';

interface CapacitorProviderProps {
  children: React.ReactNode;
}

export const CapacitorProvider: React.FC<CapacitorProviderProps> = ({ children }) => {
  return <>{children}</>;
};

export default CapacitorProvider;
