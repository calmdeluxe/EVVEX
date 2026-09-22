
import axios from 'axios';

/**
 * Helper to send verification emails or OTPs via our backend.
 */
export async function sendVerificationEmail(email: string, otp?: string, type: 'welcome' | 'otp' = 'welcome') {
  try {
    const response = await axios.post('/api/auth/send-otp', { email, otp, type });
    return response.data;
  } catch (error: any) {
    console.error('Email send error:', error);
    throw new Error(error.response?.data?.error || error.message || 'Failed to send email');
  }
}

/**
 * Generic transactional email notification helper via Brevo.
 */
export async function sendEmailNotification(payload: {
  recipient_email: string;
  subject: string;
  template_name: string;
  metadata?: any;
  textContent?: string;
  htmlContent?: string;
}) {
  try {
    const response = await axios.post('/api/notifications/send-email', payload);
    return response.data;
  } catch (error: any) {
    console.warn('sendEmailNotification error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Author Event: Book Published / Approved Congratulations Email
 */
export async function sendAuthorBookPublishedEmail(authorEmail: string, bookTitle: string, bookUrl: string) {
  return sendEmailNotification({
    recipient_email: authorEmail,
    subject: `📚 Your book "${bookTitle}" is now live on CalmReader!`,
    template_name: 'author_book_published',
    metadata: { bookTitle, bookUrl },
    textContent: `Congratulations!\n\nYour eBook "${bookTitle}" has been successfully published and is now live for readers worldwide.\n\nView and share your book: ${bookUrl}\n\nHappy publishing,\nCalmReader Team`
  });
}

export async function sendAuthorCongratulations(authorEmail: string, bookTitle: string, bookUrl: string) {
  return sendAuthorBookPublishedEmail(authorEmail, bookTitle, bookUrl);
}

/**
 * Author Event: Sale Alert
 */
export async function sendAuthorSaleAlertEmail(authorEmail: string, bookTitle: string, amount: number, buyerEmail: string) {
  return sendEmailNotification({
    recipient_email: authorEmail,
    subject: `🎉 New Sale! Someone just purchased "${bookTitle}"`,
    template_name: 'author_sale_alert',
    metadata: { bookTitle, amount, buyerEmail },
    textContent: `Great news!\n\n${buyerEmail || 'A reader'} just purchased your eBook "${bookTitle}" for ₦${amount.toLocaleString()}.\n\nCheck your dashboard earnings for real-time sales reports.\n\nBest regards,\nCalmReader Team`
  });
}

/**
 * User Event: Payment Confirmation
 */
export async function sendUserPaymentConfirmationEmail(userEmail: string, bookTitle: string, amount: number, readUrl: string) {
  return sendEmailNotification({
    recipient_email: userEmail,
    subject: `✅ Purchase Complete: "${bookTitle}" is ready to read!`,
    template_name: 'user_payment_confirmation',
    metadata: { bookTitle, amount, readUrl },
    textContent: `Thank you for your purchase!\n\nYou have successfully unlocked "${bookTitle}" for ₦${amount.toLocaleString()}.\n\nStart reading now on your Bookshelf: ${readUrl}\n\nHappy reading,\nCalmReader Team`
  });
}

/**
 * User Event: Account Upgrade
 */
export async function sendUserUpgradeEmail(userEmail: string, tierName: string) {
  return sendEmailNotification({
    recipient_email: userEmail,
    subject: `✨ Account Upgraded: Welcome to CalmReader ${tierName}!`,
    template_name: 'user_account_upgraded',
    metadata: { tierName },
    textContent: `Welcome to your new membership level!\n\nYour CalmReader account is now upgraded to ${tierName}.\n\nYou now have access to premium features and publishing tools.\n\nExplore your dashboard: https://calmreader.app/dashboard\n\nBest regards,\nCalmReader Team`
  });
}

