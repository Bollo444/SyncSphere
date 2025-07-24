#!/usr/bin/env node

/**
 * SyncSphere Secure Password Generator
 * Generates cryptographically secure passwords for database users
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Password configuration
const config = {
  length: 16,
  includeUppercase: true,
  includeLowercase: true,
  includeNumbers: true,
  includeSpecial: true,
  excludeSimilar: true,
  excludeAmbiguous: true,
  updateEnv: false,
  envPath: path.join(__dirname, '../.env')
};

// Character sets
const charSets = {
  uppercase: 'ABCDEFGHJKLMNPQRSTUVWXY',
  lowercase: 'abcdefghijkmnopqrstuvwxyz',
  numbers: '23456789',
  special: '!@#$%^&*()_+-=[]{}|;:,.<>?',
  similar: 'il1Lo0O',
  ambiguous: '{}[]()/\\\'"`~,;.<>'
};

/**
 * Generate a cryptographically secure password
 * @param {Object} options - Password generation options
 * @returns {string} Generated password
 */
function generateSecurePassword(options = {}) {
  const opts = { ...config, ...options };

  let charset = '';

  // Build character set based on options
  if (opts.includeUppercase) charset += charSets.uppercase;
  if (opts.includeLowercase) charset += charSets.lowercase;
  if (opts.includeNumbers) charset += charSets.numbers;
  if (opts.includeSpecial) charset += charSets.special;

  // Remove similar/ambiguous characters if requested
  if (opts.excludeSimilar) {
    charset = charset
      .split('')
      .filter(char => !charSets.similar.includes(char))
      .join('');
  }
  if (opts.excludeAmbiguous) {
    charset = charset
      .split('')
      .filter(char => !charSets.ambiguous.includes(char))
      .join('');
  }

  if (charset.length === 0) {
    throw new Error('No valid characters available for password generation');
  }

  // Generate password using crypto.randomBytes for security
  let password = '';
  const bytes = crypto.randomBytes(opts.length * 2); // Generate extra bytes for filtering

  for (let i = 0; i < opts.length; i++) {
    const randomIndex = bytes[i % bytes.length] % charset.length;
    password += charset[randomIndex];
  }

  return password;
}

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {Object} Validation result
 */
function validatePasswordStrength(password) {
  const checks = {
    length: password.length >= 12,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    numbers: /[0-9]/.test(password),
    special: /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password),
    noRepeating: !/(.)\1{2,}/.test(password),
    noSequential:
      !/(?:abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz|123|234|345|456|567|678|789)/i.test(
        password
      )
  };

  const score = Object.values(checks).filter(Boolean).length;
  const maxScore = Object.keys(checks).length;

  let strength = 'Weak';
  if (score >= maxScore - 1) strength = 'Very Strong';
  else if (score >= maxScore - 2) strength = 'Strong';
  else if (score >= maxScore - 3) strength = 'Medium';

  return {
    score,
    maxScore,
    strength,
    checks,
    isValid: score >= maxScore - 2
  };
}

/**
 * Update .env file with new password
 * @param {string} password - New password
 * @param {string} envPath - Path to .env file
 */
function updateEnvFile(password, envPath) {
  try {
    let envContent = '';

    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    }

    // Update or add DB_PASSWORD
    const passwordLine = `DB_PASSWORD=${password}`;

    if (envContent.includes('DB_PASSWORD=')) {
      envContent = envContent.replace(/DB_PASSWORD=.*$/m, passwordLine);
    } else {
      envContent += envContent.endsWith('\n') ? passwordLine + '\n' : '\n' + passwordLine + '\n';
    }

    fs.writeFileSync(envPath, envContent);
    console.log(`${colors.green}✓ Updated .env file with new password${colors.reset}`);
  } catch (error) {
    console.error(`${colors.red}✗ Failed to update .env file: ${error.message}${colors.reset}`);
  }
}

/**
 * Interactive password generation
 */
async function interactiveGeneration() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const question = prompt => new Promise(resolve => rl.question(prompt, resolve));

  console.log(`${colors.cyan}SyncSphere Secure Password Generator${colors.reset}\n`);

  try {
    const length = (await question('Password length (12-64, default 16): ')) || '16';
    const includeSpecial =
      (await question('Include special characters? (y/N): ')).toLowerCase() === 'y';
    const excludeSimilar =
      (await question('Exclude similar characters (il1Lo0O)? (Y/n): ')).toLowerCase() !== 'n';
    const updateEnv = (await question('Update .env file? (y/N): ')).toLowerCase() === 'y';

    const options = {
      length: Math.max(12, Math.min(64, parseInt(length) || 16)),
      includeSpecial,
      excludeSimilar
    };

    console.log('\nGenerating secure password...\n');

    const password = generateSecurePassword(options);
    const validation = validatePasswordStrength(password);

    console.log(`${colors.green}Generated Password: ${colors.yellow}${password}${colors.reset}`);
    console.log(
      `${colors.blue}Strength: ${validation.strength} (${validation.score}/${validation.maxScore})${colors.reset}\n`
    );

    // Show validation details
    console.log('Password Requirements:');
    Object.entries(validation.checks).forEach(([check, passed]) => {
      const icon = passed ? '✓' : '✗';
      const color = passed ? colors.green : colors.red;
      const description = {
        length: 'At least 12 characters',
        uppercase: 'Contains uppercase letters',
        lowercase: 'Contains lowercase letters',
        numbers: 'Contains numbers',
        special: 'Contains special characters',
        noRepeating: 'No repeating characters',
        noSequential: 'No sequential patterns'
      }[check];
      console.log(`${color}${icon} ${description}${colors.reset}`);
    });

    if (updateEnv) {
      updateEnvFile(password, config.envPath);
    }

    console.log(
      `\n${colors.yellow}⚠️  Store this password securely and never commit it to version control!${colors.reset}`
    );
  } catch (error) {
    console.error(`${colors.red}Error: ${error.message}${colors.reset}`);
  } finally {
    rl.close();
  }
}

/**
 * Command line interface
 */
function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
${colors.cyan}SyncSphere Secure Password Generator${colors.reset}

Usage:
  node generate-secure-password.js [options]

Options:
  --length <n>        Password length (12-64, default: 16)
  --no-special        Exclude special characters
  --include-similar   Include similar characters (il1Lo0O)
  --update-env        Update .env file with generated password
  --interactive       Interactive mode (default)
  --help, -h          Show this help message

Examples:
  node generate-secure-password.js
  node generate-secure-password.js --length 20 --update-env
  node generate-secure-password.js --no-special --include-similar
    `);
    return;
  }

  if (args.includes('--interactive') || args.length === 0) {
    interactiveGeneration();
    return;
  }

  // Parse command line arguments
  const options = { ...config };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--length':
        options.length = Math.max(12, Math.min(64, parseInt(args[++i]) || 16));
        break;
      case '--no-special':
        options.includeSpecial = false;
        break;
      case '--include-similar':
        options.excludeSimilar = false;
        break;
      case '--update-env':
        options.updateEnv = true;
        break;
    }
  }

  try {
    const password = generateSecurePassword(options);
    const validation = validatePasswordStrength(password);

    console.log(`${colors.green}Generated Password: ${colors.yellow}${password}${colors.reset}`);
    console.log(`${colors.blue}Strength: ${validation.strength}${colors.reset}`);

    if (options.updateEnv) {
      updateEnvFile(password, options.envPath);
    }
  } catch (error) {
    console.error(`${colors.red}Error: ${error.message}${colors.reset}`);
    process.exit(1);
  }
}

// Export functions for use in other modules
module.exports = {
  generateSecurePassword,
  validatePasswordStrength,
  updateEnvFile
};

// Run if called directly
if (require.main === module) {
  main();
}
