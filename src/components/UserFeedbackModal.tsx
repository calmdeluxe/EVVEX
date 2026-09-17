import React from 'react';

interface UserFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserFeedbackModal: React.FC<UserFeedbackModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  return null;
};
