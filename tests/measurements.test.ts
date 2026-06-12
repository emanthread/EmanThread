describe('MeasurementProfile soft-delete uniqueness', () => {
  it('allows creating a profile with same name after soft-deleting the original');
  it('restores the soft-deleted profile and overwrites fields with new submission data');
  it('does not restore records where deletedAt is null (non-deleted)');
});

describe('source field classification', () => {
  it('profile creation via /api/measurements sets source: profile, status: complete');
  it('order DELIVERED marks the most recent active profile as source: order');
});

describe('admin filter isolation', () => {
  it('profiles endpoint excludes source: tailor_request records');
  it('completed endpoint excludes source: profile records regardless of status');
});