'use strict';

(async () => {
  const status = document.querySelector('[data-research-status]');
  if (!status) return;
  try {
    const response = await fetch(status.dataset.researchStatus, {
      cache: 'no-cache',
      signal: AbortSignal.timeout(8000)
    });
    if (!response.ok) throw new Error('Report request failed');
    const report = await response.json();
    const counts = [report.forecast_records, report.outcome_archive_records, report.contract_matched_pairs];
    const generated = new Date(report.generated_at_utc);
    if (report.schema_version !== 1 || report.kind !== 'INDEPENDENT_RESEARCH_PERFORMANCE_V1' ||
        report.research_only !== true || report.model_validation !== 'UNVALIDATED' ||
        report.publication_gate !== 'BLOCKED' || report.verified_betting_value !== false ||
        report.verified_roi !== false || !Number.isFinite(generated.valueOf()) ||
        generated.valueOf() > Date.now() + 300000 ||
        !counts.every(count => Number.isSafeInteger(count) && count >= 0)) {
      throw new Error('Research report failed validation');
    }
    const [forecasts, outcomes, pairs] = counts;
    status.replaceChildren(
      document.createTextNode(forecasts + ' forecast records · ' + outcomes + ' outcome archive records · ' + pairs + ' matched pairs. '),
      document.createTextNode('Report generated ')
    );
    const time = document.createElement('time');
    time.dateTime = generated.toISOString();
    time.textContent = new Intl.DateTimeFormat('en-GB', {
      dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/London'
    }).format(generated) + ' UK';
    status.append(time, '.');
  } catch {
    status.textContent = 'The published validation report is unavailable. Open the Validation Centre for source diagnostics.';
  }
})();
