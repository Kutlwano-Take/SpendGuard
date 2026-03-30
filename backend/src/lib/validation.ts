import validator from 'validator';

export const sanitizeString = (input: unknown, maxLength = 1000): string => {
  if (typeof input !== 'string') {
    throw new Error('Invalid input: expected string');
  }
  
  // Remove HTML tags and scripts
  const sanitized = validator.escape(input.trim()).replace(/&#x2F;/g, '/');
  
  // Validate length
  if (!validator.isLength(sanitized, { min: 0, max: maxLength })) {
    throw new Error(`Input too long: maximum ${maxLength} characters allowed`);
  }
  
  return sanitized;
};

export const validateNumber = (input: unknown, min = 0, max = Number.MAX_SAFE_INTEGER): number => {
  if (typeof input !== 'number' || !Number.isFinite(input)) {
    throw new Error('Invalid input: expected valid number');
  }
  
  if (input < min || input > max) {
    throw new Error(`Number out of range: must be between ${min} and ${max}`);
  }
  
  return input;
};

export const validateEmail = (input: unknown): string => {
  if (typeof input !== 'string') {
    throw new Error('Invalid input: expected string');
  }
  
  const email = input.trim().toLowerCase();
  if (!validator.isEmail(email)) {
    throw new Error('Invalid email format');
  }
  
  return email;
};

export const validateDate = (input: unknown): string => {
  if (typeof input !== 'string') {
    throw new Error('Invalid input: expected string');
  }
  
  const dateStr = input.trim();

  // Accept YYYY-MM-DD and ISO datetime strings.
  if (!/^\d{4}-\d{2}-\d{2}($|T)/.test(dateStr)) {
    throw new Error('Invalid date format: expected YYYY-MM-DD');
  }

  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    throw new Error('Invalid date');
  }
  
  // Return in YYYY-MM-DD format
  return date.toISOString().slice(0, 10);
};

export const validateCategory = (input: unknown): string => {
  if (typeof input !== 'string') {
    throw new Error('Invalid input: expected string');
  }

  const category = input.trim();

  if (!validator.isLength(category, { min: 1, max: 50 })) {
    throw new Error('Category too long: maximum 50 characters allowed');
  }
  
  // Allow only letters, numbers, spaces, and basic punctuation
  if (!/^[a-zA-Z0-9\s\-_&]+$/.test(category)) {
    throw new Error('Invalid category: only letters, numbers, spaces, hyphens, underscores, and ampersands allowed');
  }
  
  return category;
};

export const validateCurrency = (input: unknown): string => {
  if (typeof input !== 'string') {
    throw new Error('Invalid input: expected string');
  }

  const currency = input.trim().toUpperCase();
  
  // Validate 3-letter currency codes
  if (!/^[A-Z]{3}$/.test(currency)) {
    throw new Error('Invalid currency: expected 3-letter currency code (e.g., USD, ZAR)');
  }
  
  return currency;
};

export const validatePeriod = (input: unknown): 'weekly' | 'monthly' => {
  if (input !== 'weekly' && input !== 'monthly') {
    throw new Error('Invalid period: must be "weekly" or "monthly"');
  }
  
  return input as 'weekly' | 'monthly';
};

export const validateId = (input: unknown): string => {
  if (typeof input !== 'string') {
    throw new Error('Invalid input: expected string');
  }
  
  const id = input.trim();
  
  // Validate UUID format or simple alphanumeric ID
  if (!validator.isUUID(id) && !/^[a-zA-Z0-9\-_]{1,50}$/.test(id)) {
    throw new Error('Invalid ID format');
  }
  
  return id;
};
