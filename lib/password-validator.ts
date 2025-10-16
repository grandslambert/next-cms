export interface PasswordRequirements {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecial: boolean;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export function validatePassword(
  password: string,
  requirements: PasswordRequirements
): ValidationResult {
  const errors: string[] = [];

  // Check minimum length
  if (password.length < requirements.minLength) {
    errors.push(`Password must be at least ${requirements.minLength} characters`);
  }

  // Check uppercase
  if (requirements.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  // Check lowercase
  if (requirements.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  // Check numbers
  if (requirements.requireNumbers && !/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  // Check special characters
  if (requirements.requireSpecial && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character (!@#$%^&*, etc.)');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function getPasswordRequirementsText(requirements: PasswordRequirements): string[] {
  const texts: string[] = [];
  
  texts.push(`At least ${requirements.minLength} characters`);
  
  if (requirements.requireUppercase) {
    texts.push('One uppercase letter');
  }
  if (requirements.requireLowercase) {
    texts.push('One lowercase letter');
  }
  if (requirements.requireNumbers) {
    texts.push('One number');
  }
  if (requirements.requireSpecial) {
    texts.push('One special character');
  }
  
  return texts;
}

