import React from 'react';
import { PrivateRoute } from './PrivateRoute';

interface AdminRouteProps {
  children: React.ReactNode;
}

export const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  return (
    <PrivateRoute allowedTiers={['admin']} redirectTo="/login">
      {children}
    </PrivateRoute>
  );
};
