/**
 * Generate a unique driver username
 * Format: driver_firstname or driver001 if name is too long
 */
export function generateDriverUsername(name: string, existingUsernames: string[]): string {
  // Clean the name (remove special chars, convert to lowercase)
  const cleanName = name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .substring(0, 10);

  // Try using name-based username
  let username = `driver_${cleanName}`;
  
  // If already exists, append number
  if (existingUsernames.includes(username)) {
    let counter = 1;
    while (existingUsernames.includes(`${username}${counter}`)) {
      counter++;
    }
    username = `${username}${counter}`;
  }

  return username;
}

/**
 * Generate a secure random password
 * Format: 8 characters with letters and numbers
 * Example: aB3xK9mP
 */
export function generateSecurePassword(): string {
  const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // Removed confusing chars
  const lowercase = 'abcdefghjkmnpqrstuvwxyz'; // Removed confusing chars
  const numbers = '23456789'; // Removed confusing chars (0, 1)
  
  const allChars = uppercase + lowercase + numbers;
  
  let password = '';
  
  // Ensure at least 1 uppercase, 1 lowercase, 1 number
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  
  // Fill remaining 5 characters randomly
  for (let i = 0; i < 5; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

/**
 * Generate a unique session ID
 */
export function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * Hash password (simple implementation for demo - in production use bcrypt or similar)
 */
export function hashPassword(password: string): string {
  // Simple hash for demo - in production use proper hashing
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `hash_${Math.abs(hash).toString(36)}`;
}

/**
 * Verify password against hash
 */
export function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}
