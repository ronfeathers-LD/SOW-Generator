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

const COMPANY = { name: 'Acme Corp', address: '123 Market St, Suite 400, San Francisco, CA 94105' };

function render(
  clientSignature?: { name: string; title: string; email: string; date: string },
  // null means "no company on file"; a default parameter would not survive an
  // explicitly-passed undefined.
  clientCompany: { name?: string; address?: string } | null = COMPANY
) {
  act(() => {
    root.render(
      React.createElement(SOWTitlePage, {
        title: 'Test SOW',
        clientName: 'Acme Corp',
        clientCompany: clientCompany ?? undefined,
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
  it('falls back to the company name and address when the signer is blank', () => {
    const el = customerBlock(render({ name: '', title: '', email: '', date: '' }));
    expect(el.textContent).toContain('Acme Corp');
    expect(el.textContent).toContain('123 Market St');
    expect(el.textContent).toContain('Suite 400');
    expect(el.textContent).toContain('San Francisco');
    expect(el.textContent).toContain('CA 94105');
    expect(el.textContent).not.toContain('Not Entered');
    expect(el.textContent).not.toContain('To be provided');
  });

  it('splits the address onto one line per comma-separated part', () => {
    const el = customerBlock(render({ name: '', title: '', email: '', date: '' }));
    expect(el.querySelectorAll('br').length).toBe(4); // company + 4 address parts
  });

  it('never paints the customer signature block red when blank', () => {
    const el = customerBlock(render({ name: '', title: '', email: '', date: '' }));
    const red = Array.from(el.querySelectorAll('[class*="text-red"]'));
    expect(red).toHaveLength(0);
  });

  it('treats legacy sentinel strings as blank and falls back to the company', () => {
    const el = customerBlock(render({
      name: 'Not Entered',
      title: 'Title Not Entered',
      email: 'Email Not Entered',
      date: '',
    }));
    expect(el.textContent).not.toContain('Not Entered');
    expect(el.textContent).toContain('Acme Corp');
  });

  it('renders the company name alone when no address is on file', () => {
    const el = customerBlock(
      render({ name: '', title: '', email: '', date: '' }, { name: 'Acme Corp' })
    );
    expect(el.textContent).toContain('Acme Corp');
    expect(el.querySelectorAll('br')).toHaveLength(0);
  });

  it('renders nothing under the line when neither signer nor company is known', () => {
    const el = customerBlock(render({ name: '', title: '', email: '', date: '' }, null));
    expect(el.textContent).toBe('');
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
    // A named signer wins — the company fallback must not also print.
    expect(el.textContent).not.toContain('123 Market St');
  });

  it('shows the name but omits a blank title and email', () => {
    const el = customerBlock(render({ name: 'Dana Reyes', title: '', email: '', date: '' }));
    expect(el.textContent).toContain('Dana Reyes');
    expect(el.textContent).not.toContain('<TITLE>');
    expect(el.textContent).not.toContain('<EMAIL>');
    expect(el.textContent).not.toContain('123 Market St');
  });

  it('does not emit the old mail-merge placeholders', () => {
    const el = customerBlock(render({ name: '', title: '', email: '', date: '' }));
    expect(el.textContent).not.toContain('<FIRSTNAME LASTNAME>');
    expect(el.textContent).not.toContain('<TITLE>');
    expect(el.textContent).not.toContain('<EMAIL>');
  });
});
