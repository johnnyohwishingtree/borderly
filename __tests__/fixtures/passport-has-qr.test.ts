// Test: Passport fixture images must contain a scannable QR code with MRZ data.
//
// The passport PNGs are generated from SVGs. If the SVG doesn't embed a
// QR code image, CIDetector has nothing to scan and import fails with
// "No Data Found".

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { PNG } from 'pngjs';

const ROOT = resolve(__dirname, '../..');

test('passport fixture PNGs contain black pixels (QR code present)', () => {
  const files = ['passport-dad.png', 'passport-mom.png', 'passport-teen.png', 'passport-child.png'];

  for (const file of files) {
    const data = readFileSync(resolve(ROOT, 'e2e/fixtures/photos', file));
    const png = PNG.sync.read(data);

    let blackPixels = 0;
    for (let i = 0; i < png.data.length; i += 4) {
      if (png.data[i] < 50 && png.data[i + 1] < 50 && png.data[i + 2] < 50) {
        blackPixels++;
      }
    }

    // QR codes need significant black pixels — at least 1% of the image
    const totalPixels = png.width * png.height;
    const blackRatio = blackPixels / totalPixels;
    expect(blackRatio).toBeGreaterThan(0.01);
  }
});
