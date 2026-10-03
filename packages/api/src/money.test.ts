import { describe, expect, it } from 'vitest';
import { amountInWordsINR, formatINR, paiseToRupeesInput, rupeesToPaise } from './money';
import { lastFour, maskedId } from './ids';
import { addDays, daysBetween, todayIST } from './dates';
import { fillTemplate, whatsappLink } from './whatsapp';

describe('money', () => {
  it('parses rupees to integer paise', () => {
    expect(rupeesToPaise('12,500')).toBe(1250000);
    expect(rupeesToPaise('₹ 12,500.5')).toBe(1250050);
    expect(rupeesToPaise('0.01')).toBe(1);
    expect(rupeesToPaise('12.345')).toBeNull();
    expect(rupeesToPaise('-5')).toBeNull();
    expect(rupeesToPaise('abc')).toBeNull();
    expect(rupeesToPaise('')).toBeNull();
  });
  it('round-trips to form input', () => {
    expect(paiseToRupeesInput(1250050)).toBe('12500.50');
    expect(paiseToRupeesInput(1250000)).toBe('12500');
  });
  it('formats in Indian grouping', () => {
    expect(formatINR(8000000)).toBe('₹80,000');
    expect(formatINR(1234567800)).toBe('₹1,23,45,678');
  });
  it('writes amounts in Indian words', () => {
    expect(amountInWordsINR(7700000)).toBe('Rupees Seventy Seven Thousand Only');
    expect(amountInWordsINR(1234567850)).toBe(
      'Rupees One Crore Twenty Three Lakh Forty Five Thousand Six Hundred Seventy Eight and Fifty Paise Only',
    );
    expect(amountInWordsINR(0)).toBe('Rupees Zero Only');
  });
});

describe('ids', () => {
  it('keeps only the last four characters', () => {
    expect(lastFour('1234 5678 9012')).toBe('9012');
    expect(lastFour('ABCDE1234F')).toBe('234F');
    expect(lastFour('12')).toBeNull();
    expect(maskedId('9012')).toBe('XXXX-XXXX-9012');
  });
});

describe('dates', () => {
  it('uses India time', () => {
    expect(todayIST(new Date('2026-10-04T19:00:00Z'))).toBe('2026-10-05');
    expect(addDays('2026-10-31', 5)).toBe('2026-11-05');
    expect(daysBetween('2026-10-05', '2026-10-08')).toBe(3);
  });
});

describe('whatsapp', () => {
  it('builds a wa.me link with +91', () => {
    expect(whatsappLink('9876543210', 'Hi ₹')).toBe('https://wa.me/919876543210?text=Hi%20%E2%82%B9');
    expect(fillTemplate('Rent {amount} due {date}', { amount: '₹10', date: '5 Oct' })).toBe('Rent ₹10 due 5 Oct');
  });
});
