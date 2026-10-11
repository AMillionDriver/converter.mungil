import { describe, it, expect } from 'vitest';
import { SecurityHardener } from '../lib/security-hardener';

describe('SecurityHardener - Path Traversal, Integrity & Zip Bomb Verification', () => {
  it('should sanitize dangerous path traversal characters and filename symbols', () => {
    const malicious = '../../../etc/passwd<script>alert(1)</script>:*?|.pdf';
    const sanitized = SecurityHardener.sanitizeFilename(malicious);

    expect(sanitized).not.toContain('../');
    expect(sanitized).not.toContain('<');
    expect(sanitized).not.toContain('>');
    expect(sanitized).not.toContain(':');
    expect(sanitized).not.toContain('*');
    expect(sanitized).not.toContain('?');
    expect(sanitized).not.toContain('|');
    expect(sanitized).toBe('etc_passwd_script_alert(1)__script_____.pdf');
  });

  it('should calculate valid SHA-256 checksums using Web Crypto', async () => {
    const data = new TextEncoder().encode('Flowy Converter Test String');
    const hash = await SecurityHardener.calculateChecksum(data);

    expect(hash).toBeDefined();
    expect(hash).toHaveLength(64); // SHA-256 produces 64 hex characters
  });

  it('should validate matching engine checksum and reject mismatched hash', async () => {
    const data = new TextEncoder().encode('Binary engine payload 12345');
    const actualHash = await SecurityHardener.calculateChecksum(data);

    const isValid = await SecurityHardener.validateEngineIntegrity(data, actualHash);
    expect(isValid).toBe(true);

    const isInvalid = await SecurityHardener.validateEngineIntegrity(
      data,
      '0000000000000000000000000000000000000000000000000000000000000000'
    );
    expect(isInvalid).toBe(false);
  });

  it('should return isBomb: false for normal files and standard small archives', async () => {
    const normalBlob = new Blob(['Hello World Normal File Content'], {
      type: 'text/plain',
    });
    const result = await SecurityHardener.inspectZip(normalBlob);

    expect(result.isBomb).toBe(false);
  });

  it('should run ConversionTester regression suite and report passed cases', async () => {
    const { ConversionTester } = await import('../lib/conversion-tester');
    const mockPipeline = {
      resolveAndLoad: async (input: string, output: string) => {
        if (input === 'exe') throw new Error('Unsupported format exe');
        return {
          id: `engine:${input}:${output}`,
          convert: async (file: File) => new Blob([await file.arrayBuffer()], { type: 'application/octet-stream' }),
        };
      },
    };

    const suiteResult = await ConversionTester.runRegressionSuite(mockPipeline);
    expect(suiteResult.passed).toBe(5);
    expect(suiteResult.failed).toBe(0);
    expect(suiteResult.results).toHaveLength(5);
  });
});
