import { execSync } from 'child_process';
import fs from 'fs';

/**
 * Checks if a file is ignored by Git (respects .gitignore and global ignore)
 */
const isIgnored = (file) => {
  try {
    execSync(`git check-ignore -q "${file}"`);
    return true;
  } catch (e) {
    return false;
  }
};

/**
 * Gets the list of files currently staged for commit
 */
const getStagedFiles = () => {
  try {
    return execSync('git diff --cached --name-only', { encoding: 'utf8' })
      .split('\n')
      .filter(file => file && fs.existsSync(file) && !isIgnored(file));
  } catch (e) {
    return [];
  }
};

const JAPANESE_REGEX = /[ぁ-んァ-ヶ一-龠]/;
const EMOJI_REGEX = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

const EXEMPT_FILES = [
  'server/utils/prompts.ts',
  'scripts/check-japanese.js'
];

const stagedFiles = getStagedFiles();
let hasError = false;

if (stagedFiles.length > 0) {
  console.log(`Checking ${stagedFiles.length} staged files for language compliance...`);

  stagedFiles.forEach(file => {
    if (EXEMPT_FILES.includes(file)) return;

    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      if (JAPANESE_REGEX.test(line) || EMOJI_REGEX.test(line)) {
        console.error(`\x1b[31mError:\x1b[0m Non-English content found in ${file}:${index + 1}`);
        console.error(`  > ${line.trim()}`);
        hasError = true;
      }
    });
  });
}

if (hasError) {
  console.error('\n\x1b[31mCommit blocked.\x1b[0m Please remove Japanese characters and emojis from the source code.');
  process.exit(1);
} else if (stagedFiles.length > 0) {
  console.log('\x1b[32mCompliance check passed!\x1b[0m');
}

process.exit(0);
