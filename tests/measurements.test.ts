describe('MeasurementProfile soft-delete uniqueness', () => {
  it('allows creating a profile with same name after soft-deleting the original');
  it('restores the soft-deleted profile and overwrites fields with new submission data');
  it('does not restore records where deletedAt is null (non-deleted)');
});

describe('source field classification', () => {
  it('profile creation via /api/measurements sets source: profile, status: complete');
  it('tailor request via /api/tailor-measurements sets source: tailor_request, status: pending');
  it('order DELIVERED marks the most recent active profile as source: order');
  it('backfill correctly reclassified tailor requests with empty notes');
});

describe('admin filter isolation', () => {
  it('tailor requests endpoint returns only source: tailor_request records');
  it('profiles endpoint excludes source: tailor_request records');
  it('completed endpoint excludes source: profile records regardless of status');
  it('stats counts are non-overlapping across profile/tailor_request/order');
});