import * as fs from 'fs';
import * as crypto from 'crypto';
import * as path from 'path';
import * as os from 'os';

export function debugSignature(xml: string, label: string): void {
    const hash = crypto.createHash('sha256').update(xml).digest('hex').substring(0, 8);
    const filePath = path.join(os.tmpdir(), `debug-signature-${label}-${hash}.txt`);

    const hasBOM = xml.charCodeAt(0) === 0xFEFF;
    const hasExtraSpaces = /^\s+|\s+$/g.test(xml);
    const hasControlChars = /[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(xml);

    const report = [
        `--- Debug Signature: ${label} ---`,
        `Timestamp: ${new Date().toISOString()}`,
        `Length: ${xml.length} characters`,
        `Encoding: ${Buffer.byteLength(xml, 'utf8')} bytes`,
        `Has BOM: ${hasBOM}`,
        `Has Extra Spaces: ${hasExtraSpaces}`,
        `Has Control Characters: ${hasControlChars}`,
        `--- Preview (First 500 chars) ---`,
        xml.substring(0, 500),
        `--------------------------------`
    ].join('\n');

    fs.writeFileSync(filePath, report, 'utf8');
    console.log(`[DebugSignature] Report saved to: ${filePath}`);
}

export function compareSignatures(before: string, after: string): void {
    const diff = before.length !== after.length ? 'Length changed' : 'Length identical';
    console.log(`[CompareSignatures] Status: ${diff}`);
    console.log(`Before: ${before.length} chars | After: ${after.length} chars`);
}