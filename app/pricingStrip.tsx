import styles from './pricingStrip.module.css';

/** R2 ownership presentation; numeric prices require reconciled release authority. */
export function PricingStrip() {
  return <section id="pricing-ownership" className={styles.strip} aria-label="Pricing and ownership">
    <article>
      <p className={styles.label}>Free online</p>
      <h2>Scripture Discovered online is free. No account required.</h2>
      <p>Explore the complete public World.</p>
      <p className={styles.note}>Accounts are free. Create an account only when you want us to remember your work.</p>
    </article>
    <article>
      <p className={styles.label}>Own offline · Personal</p>
      <h2>Own Scripture Discovered offline.</h2>
      <p>Carry Scripture Discovered with you.</p>
      <p className={styles.note}>One-time purchase.</p>
    </article>
    <article>
      <p className={styles.label}>Commander CE</p>
      <h2>Run ministry on the same Scripture Discovered World.</h2>
      <p>Pilot · Coming through selected deployments.</p>
      <a href="/church-edition">Explore Church Edition</a>
    </article>
  </section>;
}
