import test from 'node:test';
import assert from 'node:assert/strict';
import { executeSemanticQuery } from '../server/semantic.ts';

test('executeSemanticQuery returns aggregated rows for valid ssd_runs query', () => {
  const res = executeSemanticQuery({
    dataset: 'ssd_runs',
    metrics: ['avg_bandwidth', 'run_count'],
    groupBy: ['firmware'],
  });
  assert.equal(res.datasource, 'ssd_benchmark');
  assert.ok(res.rows.length > 0);
  assert.equal(typeof res.elapsedMs, 'number');
});

test('executeSemanticQuery sanitizes limit edge cases (NaN, float, negative, >200)', () => {
  for (const badLimit of ['abc', Number.NaN, -10, 0, 1.8, 99999, null]) {
    const res = executeSemanticQuery({
      dataset: 'ssd_runs',
      metrics: ['avg_bandwidth'],
      groupBy: ['firmware'],
      limit: /** @type {any} */ (badLimit),
    });
    assert.ok(res.rowCount >= 1 && res.rowCount <= 200);
  }
});

test('executeSemanticQuery blocks SQL injection, path traversal, and invalid fields', () => {
  assert.throws(
    () =>
      executeSemanticQuery({
        dataset: 'ssd_runs',
        datasource: '../auth',
        metrics: ['avg_bandwidth'],
      }),
    /not active|does not exist|not found/i
  );

  assert.throws(
    () =>
      executeSemanticQuery({
        dataset: 'ssd_runs; DROP TABLE benchmark_runs;--',
        metrics: ['avg_bandwidth'],
      }),
    /Unknown semantic dataset/i
  );

  assert.throws(
    () =>
      executeSemanticQuery({
        dataset: 'ssd_runs',
        metrics: ['COUNT(*)'],
      }),
    /Invalid metric/i
  );

  assert.throws(
    () =>
      executeSemanticQuery({
        dataset: 'ssd_runs',
        metrics: ['avg_bandwidth'],
        where: { '1=1 OR model_id': 'x900-2tb' },
      }),
    /Invalid filter dimension/i
  );

  assert.throws(
    () =>
      executeSemanticQuery({
        dataset: 'ssd_runs',
        metrics: ['avg_bandwidth'],
        groupBy: ['firmware'],
        orderBy: { field: 'avg_bandwidth; DROP TABLE benchmark_runs;--', dir: 'desc' },
      }),
    /Invalid orderBy field/i
  );
});
