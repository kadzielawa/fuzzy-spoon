import styles from '../styles/Form.module.css';

interface Props {
  prUrl: string;
  onReset: () => void;
}

export default function SuccessScreen({ prUrl, onReset }: Props) {
  const isMock = prUrl.includes('mock=true');

  return (
    <div className={styles.success}>
      <div className={styles.successIcon}>✅</div>
      <h2 className={styles.successTitle}>Pull Request Created!</h2>
      <p className={styles.successText}>
        Your service request has been submitted. A Pull Request has been opened
        for review — GitHub Actions will validate the config and run Terraform
        on merge.
      </p>

      {isMock && (
        <p className={styles.mockNotice}>
          ℹ️ Running in mock mode. Set{' '}
          <code>GITHUB_TOKEN</code>,{' '}
          <code>GITHUB_OWNER</code>, and{' '}
          <code>GITHUB_REPO</code> in <code>backend/.env</code> for a real PR.
        </p>
      )}

      <a
        href={isMock ? '#' : prUrl}
        target={isMock ? undefined : '_blank'}
        rel="noopener noreferrer"
        className={styles.prLink}
        onClick={isMock ? (e) => e.preventDefault() : undefined}
        aria-label="View the created Pull Request on GitHub"
      >
        {isMock ? `Mock PR – ${prUrl.split('pull/')[1]?.split('?')[0] ?? ''}` : 'View Pull Request →'}
      </a>

      <button onClick={onReset} className={styles.resetButton}>
        ← Create Another Service
      </button>
    </div>
  );
}
