import React from 'react';

export default function Home() {
  return (
    <main style={{padding: 24, fontFamily: 'system-ui'}}>
      <h1>Foodie Finder — Owner Portal</h1>
      <p>Welcome! This is a minimal placeholder. Implement auth and offers CRUD next.</p>
      <ul>
        <li>✅ Next.js scaffold</li>
        <li>⬜ Sign in with Apple / Magic Link</li>
        <li>⬜ Offers: create, schedule, pause/resume</li>
        <li>⬜ Billing with Stripe</li>
      </ul>
    </main>
  );
}
