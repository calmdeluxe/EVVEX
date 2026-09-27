import assert from 'node:assert/strict';
import test from 'node:test';
import {
  APPLICATION_CATEGORIES,
  APPLICATION_PROCESSING_FEE_KOBO,
  APPLICATION_TYPES,
  getApplicationFeeKobo,
  validateApplicationPayment,
} from './eventApplications';

test('application taxonomy contains exactly the required five categories and 18 unique types', () => {
  assert.equal(APPLICATION_CATEGORIES.length, 5);
  assert.equal(APPLICATION_TYPES.length, 18);
  assert.equal(new Set(APPLICATION_TYPES.map((type) => type.value)).size, 18);
  assert.deepEqual(
    APPLICATION_TYPES.map((type) => type.value),
    [
      'catering', 'decor', 'photography_videography', 'sound_lighting', 'security', 'dj', 'mc',
      'gate_scanner', 'usher', 'stage_manager', 'artist_performer', 'speaker', 'contestant',
      'volunteer', 'participant', 'sponsor', 'event_partner', 'ambassador',
    ],
  );
});

test('application processing fees are independent from proposed compensation', () => {
  assert.equal(getApplicationFeeKobo('catering'), APPLICATION_PROCESSING_FEE_KOBO);
  assert.equal(getApplicationFeeKobo('artist_performer'), APPLICATION_PROCESSING_FEE_KOBO);
  assert.equal(getApplicationFeeKobo('security'), 0);
  assert.equal(getApplicationFeeKobo('contestant'), 0);
  assert.equal(getApplicationFeeKobo('sponsor'), 0);
  assert.equal(getApplicationFeeKobo('other'), null);
});

test('Paystack verification rejects mismatched status, reference, amount, currency, or identity metadata', () => {
  const application = {
    id: 'app-1',
    applicant_id: 'user-1',
    application_fee_kobo: APPLICATION_PROCESSING_FEE_KOBO,
    application_fee_paid: false,
    status: 'pending',
    paystack_reference: 'EVAPP_reference',
  };
  const transaction = {
    status: 'success',
    reference: 'EVAPP_reference',
    amount: APPLICATION_PROCESSING_FEE_KOBO,
    currency: 'NGN',
    metadata: { type: 'event_application', application_id: 'app-1', user_id: 'user-1' },
  };

  assert.equal(validateApplicationPayment(transaction, application, 'user-1', 'EVAPP_reference'), null);
  assert.match(validateApplicationPayment({ ...transaction, status: 'failed' }, application, 'user-1', 'EVAPP_reference') || '', /not successful/);
  assert.match(validateApplicationPayment(transaction, application, 'user-2', 'EVAPP_reference') || '', /metadata/);
  assert.match(validateApplicationPayment({ ...transaction, amount: 1 }, application, 'user-1', 'EVAPP_reference') || '', /amount/);
  assert.match(validateApplicationPayment({ ...transaction, currency: 'USD' }, application, 'user-1', 'EVAPP_reference') || '', /currency/);
  assert.match(validateApplicationPayment(transaction, application, 'user-1', 'wrong-ref') || '', /reference/);
});