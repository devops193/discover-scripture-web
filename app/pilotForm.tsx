'use client';

import Link from 'next/link';
import { FormEvent } from 'react';

export function PilotInquiry({ email }: { email: string }) {
  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const lines = [
      `Name: ${form.get('name') ?? ''}`,
      `Role: ${form.get('role') ?? ''}`,
      `Church: ${form.get('church') ?? ''}`,
      `Email: ${form.get('email') ?? ''}`,
      '',
      String(form.get('note') ?? ''),
    ];
    const href = `mailto:${email}?subject=${encodeURIComponent('Church Edition pilot request')}&body=${encodeURIComponent(lines.join('\n'))}`;
    window.location.href = href;
  }

  return (
    <form className="pilot-form" onSubmit={onSubmit}>
      <div className="form-grid">
        <label>Name<input name="name" autoComplete="name" required /></label>
        <label>Role<input name="role" autoComplete="organization-title" placeholder="Pastor, leader, or staff" /></label>
        <label>Church or ministry<input name="church" autoComplete="organization" required /></label>
        <label>Email<input name="email" type="email" autoComplete="email" required /></label>
      </div>
      <label>What do you want to try?<textarea name="note" rows={4} placeholder="Ministry preparation, service programs, presentation, Commander, or Commander CE." /></label>
      <div className="cta-row">
        <button className="button" type="submit">Request a Pilot</button>
        <Link className="button secondary" href="/">See Scripture Discovery</Link>
      </div>
      <p className="form-note">This opens an email to <a href={`mailto:${email}`}>{email}</a>. The site does not store the inquiry.</p>
    </form>
  );
}
