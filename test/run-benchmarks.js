// Automated Benchmark Suite for HydroStat Platform
// Executes controlled trials to compute median and p95 latency for NYC STEM 2026 paper revisions

const fs = require('fs');
const path = require('path');

// Populate environment variables from local .env
const envPath = path.join(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const k = trimmed.substring(0, eqIdx).trim();
      const v = trimmed.substring(eqIdx + 1).trim();
      if (!process.env[k]) process.env[k] = v;
    }
  }
}

const geminiFunc = require('../netlify/functions/gemini');
const newsFunc = require('../netlify/functions/news');

function calculateStats(latencies) {
  if (latencies.length === 0) return { median: 0, p95: 0, min: 0, max: 0 };
  const sorted = [...latencies].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  const p95Idx = Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95));
  const p95 = sorted[p95Idx];
  return {
    median: Math.round(median),
    p95: Math.round(p95),
    min: Math.round(sorted[0]),
    max: Math.round(sorted[sorted.length - 1])
  };
}

async function benchmarkOpenAlex(trials = 5) {
  process.stdout.write(`Benchmarking OpenAlex API (${trials} trials)... `);
  const latencies = [];
  let successes = 0;

  for (let i = 0; i < trials; i++) {
    const start = performance.now();
    try {
      const res = await fetch('https://api.openalex.org/works?search=hydrogen%20fuel%20cell&per-page=3&mailto=contact@hydrostat.com');
      if (res.ok) {
        await res.json();
        latencies.push(performance.now() - start);
        successes++;
      }
    } catch (e) {
      // Record failure
    }
    await new Promise(r => setTimeout(r, 200));
  }
  console.log('Done.');
  return { name: 'OpenAlex Academic Search', trials, successes, stats: calculateStats(latencies) };
}

async function benchmarkNewsProxy(trials = 10) {
  process.stdout.write(`Benchmarking News Proxy (${trials} trials)... `);
  const latencies = [];
  let successes = 0;

  for (let i = 0; i < trials; i++) {
    const start = performance.now();
    try {
      const res = await newsFunc.handler({ httpMethod: 'GET', headers: {} }, {});
      if (res.statusCode === 200) {
        latencies.push(performance.now() - start);
        successes++;
      }
    } catch (e) {}
  }
  console.log('Done.');
  return { name: 'News Aggregator Proxy (Cached)', trials, successes, stats: calculateStats(latencies) };
}

async function benchmarkHydrobot(trials = 5) {
  process.stdout.write(`Benchmarking Hydrobot Serverless Gateway (${trials} trials)... `);
  const latencies = [];
  let successes = 0;

  // Use a unique client-ip for each benchmark trial so it doesn't trip per-IP rate limits
  for (let i = 0; i < trials; i++) {
    const start = performance.now();
    try {
      const res = await geminiFunc.handler({
        httpMethod: 'POST',
        headers: {
          'content-type': 'application/json',
          'client-ip': `198.51.100.${10 + i}`
        },
        body: JSON.stringify({ message: 'What is the efficiency of a typical PEM electrolyser?' })
      }, {});
      if (res.statusCode === 200) {
        latencies.push(performance.now() - start);
        successes++;
      }
    } catch (e) {}
    await new Promise(r => setTimeout(r, 1500));
  }
  console.log('Done.');
  return { name: 'Hydrobot Serverless Round-Trip', trials, successes, stats: calculateStats(latencies) };
}

async function run() {
  console.log('\n======================================================');
  console.log('  HYDROSTAT EMPIRICAL SYSTEM BENCHMARK EXECUTION');
  console.log('======================================================\n');

  const results = [];
  results.push(await benchmarkNewsProxy(10));
  results.push(await benchmarkOpenAlex(5));
  results.push(await benchmarkHydrobot(5));

  console.log('\n========================================================================================');
  console.log('                               EMPIRICAL BENCHMARK SUMMARY TABLE                         ');
  console.log('========================================================================================');
  console.log('| Metric Name                      | Trials | Success | Median Latency | 95th Percentile | Min - Max    |');
  console.log('|----------------------------------|--------|---------|----------------|-----------------|--------------|');

  for (const r of results) {
    const successRate = `${Math.round((r.successes / r.trials) * 100)}%`;
    const name = r.name.padEnd(32);
    const trials = String(r.trials).padStart(6);
    const succ = successRate.padStart(7);
    const med = `${r.stats.median} ms`.padStart(14);
    const p95 = `${r.stats.p95} ms`.padStart(15);
    const range = `${r.stats.min} - ${r.stats.max} ms`.padStart(12);
    console.log(`| ${name} | ${trials} | ${succ} | ${med} | ${p95} | ${range} |`);
  }
  console.log('========================================================================================\n');
  console.log('Benchmark execution complete. Copy the verified metrics above directly into your paper.\n');
}

run().catch(console.error);
