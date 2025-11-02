export function mulberry32(seed: number) {
  return function() {
    let t = seed += 0x6D2B79F5
    t = Math.imul(t ^ t >>> 15, t | 1)
    t ^= t + Math.imul(t ^ t >>> 7, t | 61)
    return ((t ^ t >>> 14) >>> 0) / 4294967296
  }
}

export function normal01(rand: () => number) {
  // Box-Muller
  let u = 0, v = 0
  while (u === 0) u = rand()
  while (v === 0) v = rand()
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

export function sampleLognormal(mu: number, sigma: number, rand: () => number) {
  // returns seconds
  const z = normal01(rand)
  return Math.exp(mu + sigma * z)
}

export function sampleGamma(k: number, theta: number, rand: () => number) {
  // Marsaglia and Tsang for k >= 1; for k < 1 use boost trick
  if (k < 1) {
    const u = rand()
    return sampleGamma(1 + k, theta, rand) * Math.pow(u, 1 / k)
  }
  const d = k - 1/3, c = 1 / Math.sqrt(9*d)
  while (true) {
    const z = normal01(rand)
    let x = 1 + c * z
    if (x <= 0) continue
    x = x*x*x
    const u = rand()
    if (u < 1 - 0.0331 * (z*z) * (z*z)) return theta * d * x
    if (Math.log(u) < 0.5 * z*z + d * (1 - x + Math.log(x))) return theta * d * x
  }
}

export function sampleExponential(rand: () => number, lambda: number) {
  return -Math.log(1 - rand()) / lambda
}