// Feature: html-to-react-migration
// Unit tests for FilePreviewModal — Requirements 15.4

import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import FilePreviewModal from './FilePreviewModal';

const file = (name) => ({ name, publicUrl: 'https://example.com/file' });

describe('FilePreviewModal', () => {
  it('renders <img> for .jpg', () => {
    const { container } = render(<FilePreviewModal file={file('photo.jpg')} onClose={vi.fn()} />);
    expect(container.querySelector('img')).not.toBeNull();
  });

  it('renders <img> for .jpeg', () => {
    const { container } = render(<FilePreviewModal file={file('photo.jpeg')} onClose={vi.fn()} />);
    expect(container.querySelector('img')).not.toBeNull();
  });

  it('renders <img> for .png', () => {
    const { container } = render(<FilePreviewModal file={file('image.png')} onClose={vi.fn()} />);
    expect(container.querySelector('img')).not.toBeNull();
  });

  it('renders <img> for .gif', () => {
    const { container } = render(<FilePreviewModal file={file('anim.gif')} onClose={vi.fn()} />);
    expect(container.querySelector('img')).not.toBeNull();
  });

  it('renders <img> for .webp', () => {
    const { container } = render(<FilePreviewModal file={file('img.webp')} onClose={vi.fn()} />);
    expect(container.querySelector('img')).not.toBeNull();
  });

  it('renders <img> for .svg', () => {
    const { container } = render(<FilePreviewModal file={file('icon.svg')} onClose={vi.fn()} />);
    expect(container.querySelector('img')).not.toBeNull();
  });

  it('renders <iframe> for .pdf', () => {
    const { container } = render(<FilePreviewModal file={file('doc.pdf')} onClose={vi.fn()} />);
    expect(container.querySelector('iframe')).not.toBeNull();
  });

  it('renders <video> for .mp4', () => {
    const { container } = render(<FilePreviewModal file={file('clip.mp4')} onClose={vi.fn()} />);
    expect(container.querySelector('video')).not.toBeNull();
  });

  it('renders <video> for .webm', () => {
    const { container } = render(<FilePreviewModal file={file('clip.webm')} onClose={vi.fn()} />);
    expect(container.querySelector('video')).not.toBeNull();
  });

  it('renders <audio> for .mp3', () => {
    const { container } = render(<FilePreviewModal file={file('song.mp3')} onClose={vi.fn()} />);
    expect(container.querySelector('audio')).not.toBeNull();
  });

  it('renders <audio> for .wav', () => {
    const { container } = render(<FilePreviewModal file={file('sound.wav')} onClose={vi.fn()} />);
    expect(container.querySelector('audio')).not.toBeNull();
  });

  it('renders <audio> for .m4a', () => {
    const { container } = render(<FilePreviewModal file={file('track.m4a')} onClose={vi.fn()} />);
    expect(container.querySelector('audio')).not.toBeNull();
  });

  it('renders unsupported message for .zip', () => {
    render(<FilePreviewModal file={file('archive.zip')} onClose={vi.fn()} />);
    expect(screen.getByTestId('unsupported-message')).not.toBeNull();
  });

  it('renders unsupported message for .docx', () => {
    render(<FilePreviewModal file={file('report.docx')} onClose={vi.fn()} />);
    expect(screen.getByTestId('unsupported-message')).not.toBeNull();
  });

  it('renders unsupported message for unknown extension', () => {
    render(<FilePreviewModal file={file('data.xyz')} onClose={vi.fn()} />);
    expect(screen.getByTestId('unsupported-message')).not.toBeNull();
  });
});
