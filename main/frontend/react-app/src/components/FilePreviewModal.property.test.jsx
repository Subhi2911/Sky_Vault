// Feature: html-to-react-migration, Property 13: File preview modal renders correct element type
// Validates: Requirements 7.12, 15.4

import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import * as fc from 'fast-check';
import FilePreviewModal from './FilePreviewModal';

const IMAGE_EXTS  = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
const PDF_EXTS    = ['pdf'];
const VIDEO_EXTS  = ['mp4', 'webm', 'ogg'];
const AUDIO_EXTS  = ['mp3', 'wav', 'm4a'];
const OTHER_EXTS  = ['zip', 'docx', 'xlsx', 'txt', 'csv', 'rar', 'exe', 'bin'];

const ALL_KNOWN = [
  ...IMAGE_EXTS.map((e) => ({ ext: e, type: 'image' })),
  ...PDF_EXTS.map((e)   => ({ ext: e, type: 'pdf' })),
  ...VIDEO_EXTS.map((e) => ({ ext: e, type: 'video' })),
  ...AUDIO_EXTS.map((e) => ({ ext: e, type: 'audio' })),
  ...OTHER_EXTS.map((e) => ({ ext: e, type: 'other' })),
];

describe('Property 13: File preview modal renders correct element type', () => {
  it('renders the correct HTML element for any known extension', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...ALL_KNOWN),
        fc.string({ minLength: 1, maxLength: 20 }).filter((s) => /^[a-zA-Z0-9_-]+$/.test(s)),
        ({ ext, type }, basename) => {
          const file = { name: `${basename}.${ext}`, publicUrl: 'https://example.com/file' };
          const { container } = render(<FilePreviewModal file={file} onClose={vi.fn()} />);

          if (type === 'image') {
            expect(container.querySelector('img')).not.toBeNull();
          } else if (type === 'pdf') {
            expect(container.querySelector('iframe')).not.toBeNull();
          } else if (type === 'video') {
            expect(container.querySelector('video')).not.toBeNull();
          } else if (type === 'audio') {
            expect(container.querySelector('audio')).not.toBeNull();
          } else {
            expect(container.querySelector('[data-testid="unsupported-message"]')).not.toBeNull();
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
