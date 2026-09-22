import React from 'react';
import { useAuth } from '../AuthContext';
import { sessionManager } from '../utils/sessionManager';
import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LogoutButtonProps {
  className?: string;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  showIcon?: boolean;
}

export const LogoutButton: React.FC<LogoutButtonProps> = ({
  className = '',
  variant = 'ghost',
  showIcon = true,
}) => {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      // Clear all session storage first
      sessionManager.clearSessionStorage();

      // Sign out from Supabase
      await signOut();

      // Redirect to login page
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
      sessionManager.clearSessionStorage();
      navigate('/login');
    }
  };

  return (
    <Button
      variant={variant}
      onClick={handleLogout}
      className={`gap-2 text-red-600 hover:text-red-700 dark:text-red-400 ${className}`}
    >
      {showIcon && <LogOut className="w-4 h-4" />}
      <span>Logout</span>
    </Button>
  );
};
