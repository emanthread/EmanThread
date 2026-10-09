import { expect, test } from '@playwright/test';
import { refreshPolicyContent, requiresDryCleaning } from '../lib/store-policies';
import type { Product } from '../lib/data';
import { buildWhatsAppUrl, normalizeWhatsAppNumber } from '../lib/whatsapp-utils';

test('uses one valid WhatsApp destination when store settings contain multiple phone numbers', () => {
  expect(normalizeWhatsAppNumber('+92 336 9966774-+92 3022996677')).toBe('923369966774');
  expect(normalizeWhatsAppNumber('03022996677-03369966774')).toBe('923022996677');
  expect(normalizeWhatsAppNumber('0302-2996677')).toBe('923022996677');
  expect(normalizeWhatsAppNumber('0092 302 2996677')).toBe('923022996677');
  expect(normalizeWhatsAppNumber('3369966774')).toBe('923369966774');
  expect(normalizeWhatsAppNumber('')).toBe('');
  expect(normalizeWhatsAppNumber('not configured')).toBe('');
  expect(normalizeWhatsAppNumber('92')).toBe('');
  expect(normalizeWhatsAppNumber('923369966774923022996677')).toBe('');
  const link = new URL(buildWhatsAppUrl('923369966774', 'Hi! Return/exchange & size question.'));
  expect(link.pathname).toBe('/923369966774');
  expect(link.searchParams.get('text')).toBe('Hi! Return/exchange & size question.');
});


test('updates old admin policy timelines while preserving other published content', () => {
  const shipping = '<h3>Delivery Across Pakistan</h3><ul><li>Orders are normally delivered within 3\u20135 working days.</li><li>Delivery to remote areas may take 5\u20137 working days.</li></ul><p>Shipping charges are displayed at checkout.</p>';
  const updatedShipping = refreshPolicyContent(shipping, 'shipping');
  expect(updatedShipping).toContain('delivered within 7-10 days');
  expect(updatedShipping).toContain('remote areas may take 7-10 days');
  expect(updatedShipping).toContain('<p>Shipping charges are displayed at checkout.</p>');
  const returns = '<li>The exchange request must be submitted within 7 days of receiving the order.</li><p>Send clear pictures or an unboxing video within 48 hours.</p><p>Refunds are processed within 3-5 business days.</p><li>Items must be unused.</li>';
  const updatedReturns = refreshPolicyContent(returns, 'returns');
  expect(updatedReturns).toContain('exchange request must be submitted within 48 hours');
  expect(updatedReturns).toContain('Send an unboxing video within 48 hours');
  expect(updatedReturns).toContain('Refunds are processed within 15-20 days');
  expect(updatedReturns).toContain('<li>Items must be unused.</li>');
  expect(refreshPolicyContent(updatedShipping, 'shipping')).toBe(updatedShipping);
  expect(refreshPolicyContent(updatedReturns, 'returns')).toBe(updatedReturns);
});

test('dry-clean policy is limited to the explicitly listed garment types', () => {
  for (const type of ['coat', '1-piece', '2-piece', '3-piece', '1p', '2p', '3p', 'pent-coat', 'waistcoat', 'sherwani', 'shafari', 'safari', 'heavy-partywear', 'bridal-wear']) {
    expect(requiresDryCleaning({catalogPaths: ['/women/ready-to-wear/' + type]}), type).toBe(true);
    expect(requiresDryCleaning({catalogPaths: ['/men/ready-to-wear/' + type]}), type).toBe(true);
  }
  expect(requiresDryCleaning({catalogPaths: ['/women/formals/rtw-2-piece']})).toBe(true);
  expect(requiresDryCleaning({catalogPaths: ['/men/ready-to-wear/kameez-shalwar-waistcoat']})).toBe(true);
});

test('ready-to-wear alone and unlisted categories do not trigger dry-clean-only care', () => {
  const garment = { commerce: { productKind: 'READY_TO_WEAR' } } as Pick<Product, 'commerce' | 'catalogPaths'>;
  expect(requiresDryCleaning(garment)).toBe(false);
  for (const type of ['kurta', 'dress-shirt', 'shirt-dupatta', 'bottomwear', 'trousers', 'modest-wear', 'casual', 'partywear']) {
    expect(requiresDryCleaning({...garment, catalogPaths: ['/women/ready-to-wear/' + type]}), type).toBe(false);
  }
});

test('listed names support older garments without applying the policy to fabric or other merchandise', () => {
  const garment = { commerce: { productKind: 'READY_TO_WEAR' } } as Pick<Product, 'commerce' | 'catalogPaths'>;
  for (const name of ['Embroidery COAT', '1P outfit', '2Piece suit', '3 PIECE outfit', 'Pent coat', 'Waistcoat', 'Sherwani', 'Shafari suit', 'Heavy partywear', 'Bridal']) {
    expect(requiresDryCleaning({...garment, name}), name).toBe(true);
  }
  expect(requiresDryCleaning({...garment, name: 'Light partywear'})).toBe(false);
  expect(requiresDryCleaning({...garment, name: 'Coated cotton shirt'})).toBe(false);
  expect(requiresDryCleaning({catalogPaths: ['/women/unstitched/3-piece'], ...garment})).toBe(false);
  expect(requiresDryCleaning({ commerce: {productKind:'UNSTITCHED_FABRIC'}, name: '3 PIECE fabric', catalogPaths: ['/women/ready-to-wear/pent-coat']} as Pick<Product, 'commerce' | 'catalogPaths'> & Pick<Product, 'name'>)).toBe(false);
  expect(requiresDryCleaning({catalogPaths: ['/fragrance-beauty/fragrances/men/perfume'], name: 'Bridal perfume'})).toBe(false);
});
