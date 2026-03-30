import {
  sanitizeString,
  validateNumber,
  validateEmail,
  validateDate,
  validateCategory,
  validateCurrency,
  validatePeriod,
  validateId,
} from '../../lib/validation.js';

describe('Validation utilities', () => {
  describe('sanitizeString', () => {
    it('should sanitize HTML tags', () => {
      const result = sanitizeString('<script>alert("xss")</script>Hello');
      expect(result).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;Hello');
    });

    it('should trim whitespace', () => {
      const result = sanitizeString('  Hello World  ');
      expect(result).toBe('Hello World');
    });

    it('should throw error for non-string input', () => {
      expect(() => sanitizeString(123)).toThrow('Invalid input: expected string');
    });

    it('should throw error for too long input', () => {
      const longString = 'a'.repeat(1001);
      expect(() => sanitizeString(longString)).toThrow('too long');
    });
  });

  describe('validateNumber', () => {
    it('should validate positive numbers', () => {
      expect(validateNumber(100)).toBe(100);
      expect(validateNumber(0)).toBe(0);
    });

    it('should throw error for negative numbers', () => {
      expect(() => validateNumber(-10)).toThrow('out of range');
    });

    it('should throw error for non-number input', () => {
      expect(() => validateNumber('100')).toThrow('expected valid number');
    });

    it('should throw error for NaN', () => {
      expect(() => validateNumber(NaN)).toThrow('expected valid number');
    });

    it('should respect min and max bounds', () => {
      expect(validateNumber(50, 10, 100)).toBe(50);
      expect(() => validateNumber(5, 10, 100)).toThrow('out of range');
      expect(() => validateNumber(150, 10, 100)).toThrow('out of range');
    });
  });

  describe('validateEmail', () => {
    it('should validate correct email formats', () => {
      expect(validateEmail('user@example.com')).toBe('user@example.com');
      expect(validateEmail('USER@EXAMPLE.COM')).toBe('user@example.com');
      expect(validateEmail('  user@example.com  ')).toBe('user@example.com');
    });

    it('should throw error for invalid email formats', () => {
      expect(() => validateEmail('invalid-email')).toThrow('Invalid email format');
      expect(() => validateEmail('user@')).toThrow('Invalid email format');
      expect(() => validateEmail('@example.com')).toThrow('Invalid email format');
    });

    it('should throw error for non-string input', () => {
      expect(() => validateEmail(123)).toThrow('expected string');
    });
  });

  describe('validateDate', () => {
    it('should validate correct date formats', () => {
      expect(validateDate('2026-01-15')).toBe('2026-01-15');
      expect(validateDate('2026-01-15T10:00:00Z')).toBe('2026-01-15');
    });

    it('should throw error for invalid date formats', () => {
      expect(() => validateDate('invalid-date')).toThrow('Invalid date format');
      expect(() => validateDate('2026-13-01')).toThrow('Invalid date');
    });

    it('should throw error for non-string input', () => {
      expect(() => validateDate(123)).toThrow('expected string');
    });
  });

  describe('validateCategory', () => {
    it('should validate correct categories', () => {
      expect(validateCategory('Food')).toBe('Food');
      expect(validateCategory('Food & Dining')).toBe('Food & Dining');
      expect(validateCategory('Transport-Travel')).toBe('Transport-Travel');
    });

    it('should throw error for invalid characters', () => {
      expect(() => validateCategory('Food@Dining')).toThrow('only letters, numbers, spaces');
      expect(() => validateCategory('Food#Dining')).toThrow('only letters, numbers, spaces');
    });

    it('should throw error for too long categories', () => {
      const longCategory = 'a'.repeat(51);
      expect(() => validateCategory(longCategory)).toThrow('too long');
    });
  });

  describe('validateCurrency', () => {
    it('should validate correct currency codes', () => {
      expect(validateCurrency('USD')).toBe('USD');
      expect(validateCurrency('ZAR')).toBe('ZAR');
      expect(validateCurrency('eur')).toBe('EUR');
    });

    it('should throw error for invalid currency codes', () => {
      expect(() => validateCurrency('US')).toThrow('expected 3-letter currency code');
      expect(() => validateCurrency('USDD')).toThrow('expected 3-letter currency code');
      expect(() => validateCurrency('123')).toThrow('expected 3-letter currency code');
    });
  });

  describe('validatePeriod', () => {
    it('should validate correct periods', () => {
      expect(validatePeriod('weekly')).toBe('weekly');
      expect(validatePeriod('monthly')).toBe('monthly');
    });

    it('should throw error for invalid periods', () => {
      expect(() => validatePeriod('daily')).toThrow('must be "weekly" or "monthly"');
      expect(() => validatePeriod('yearly')).toThrow('must be "weekly" or "monthly"');
    });
  });

  describe('validateId', () => {
    it('should validate UUIDs', () => {
      const uuid = '123e4567-e89b-12d3-a456-426614174000';
      expect(validateId(uuid)).toBe(uuid);
    });

    it('should validate alphanumeric IDs', () => {
      expect(validateId('expense-123')).toBe('expense-123');
      expect(validateId('budget_456')).toBe('budget_456');
    });

    it('should throw error for invalid IDs', () => {
      expect(() => validateId('invalid@id')).toThrow('Invalid ID format');
      expect(() => validateId('invalid#id')).toThrow('Invalid ID format');
      expect(() => validateId('a'.repeat(51))).toThrow('Invalid ID format');
    });

    it('should throw error for non-string input', () => {
      expect(() => validateId(123)).toThrow('expected string');
    });
  });
});
