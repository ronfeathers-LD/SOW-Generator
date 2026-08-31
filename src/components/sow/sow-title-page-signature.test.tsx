// @vitest-environment jsdom
import React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// next/image needs a loader/runtime we don't want in a unit test.
vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) =>
    React.createElement('img', { alt: String(props.alt ?? '') }),
}));

import SOWTitlePage from './SOWTitlePage';

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

function render(clientSignature?: { name: string; title: string; email: string; date: string }) {
  act(() => {
    root.render(
      React.createElement(SOWTitlePage, {
        title: 'Test SOW',
        clientName: 'Acme Corp',
        clientSignature,
      })
    );
  });
  return container;
}

/** The customer signature block only — the LeanData block is a separate concern. */
function customerBlock(el: HTMLElement): HTMLElement {
  const node = el.querySelector<HTMLElement>('[data-testid="customer-signature"]');
  if (!node) throw new Error('customer signature block not rendered');
  return node;
}

/**
 * A blank customer signer is a legitimate submitted state, so the document
 * must not print it as a red error (#441 follow-up).
 */
describe('SOWTitlePage — customer signature block', () => {
  it('renders a muted "To be provided" line when the signer is blank', () => {
    const el = customerBlock(render({ name: '', title: '', email: '', date: '' }));
    expect(el.textContent).toContain('To be provided');
    expect(el.textContent).not.toContain('Not Entered');
  });

  it('never paints the customer signature block red when blank', () => {
    const el = customerBlock(render({ name: '', title: '', email: '', date: '' }));
    const red = Array.from(el.querySelectorAll('[class*="text-red"]'));
    const redText = red.map((n) => n.textContent).join(' ');
    expect(redText).not.toContain('To be provided');
    expect(redText).not.toContain('Not Entered');
  });

  it('treats legacy sentinel strings as blank rather than printing them', () => {
    const el = customerBlock(render({
      name: 'Not Entered',
      title: 'Title Not Entered',
      email: 'Email Not Entered',
      date: '',
    }));
    expect(el.textContent).not.toContain('Not Entered');
    expect(el.textContent).toContain('To be provided');
  });

  it('renders a filled-in signer normally', () => {
    const el = customerBlock(render({
      name: 'Dana Reyes',
      title: 'VP RevOps',
      email: 'dana@acme.com',
      date: '',
    }));
    expect(el.textContent).toContain('Dana Reyes');
    expect(el.textContent).toContain('VP RevOps');
    expect(el.textContent).toContain('dana@acme.com');
    expect(el.textContent).not.toContain('To be provided');
  });

  it('shows the name but omits a blank title and email', () => {
    const el = customerBlock(render({ name: 'Dana Reyes', title: '', email: '', date: '' }));
    expect(el.textContent).toContain('Dana Reyes');
    expect(el.textContent).not.toContain('<TITLE>');
    expect(el.textContent).not.toContain('<EMAIL>');
  });

  it('does not emit the old mail-merge placeholders', () => {
    const el = customerBlock(render({ name: '', title: '', email: '', date: '' }));
    expect(el.textContent).not.toContain('<FIRSTNAME LASTNAME>');
    expect(el.textContent).not.toContain('<TITLE>');
    expect(el.textContent).not.toContain('<EMAIL>');
  });
});
