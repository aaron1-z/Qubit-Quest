// QuantumEngine.js - frontend fallback simulation
export class QuantumEngine {
  constructor(n_positions = 8, difficulty = 0) {
    this.n_positions = n_positions;
    this.difficulty = difficulty;
    this.resetRow(0);
  }

  resetRow(startPos = 0) {
    const arr = new Array(this.n_positions).fill(0).map((_, i) => {
      const d = Math.abs(i - startPos);
      return Math.exp(-0.6 * d) * (1 - this.difficulty * 0.05) + Math.random() * 0.05;
    });
    const sum = arr.reduce((s, v) => s + v, 0) || 1;
    this.state = arr.map(v => v / sum);
  }

  applyHadamard() {
    const mix = new Array(this.n_positions).fill(0).map(() => Math.random() * 0.9 + 0.05);
    const mixed = this.state.map((v, i) => v * 0.5 + mix[i] * 0.5);
    const sum = mixed.reduce((s, x) => s + x, 0) || 1;
    this.state = mixed.map(x => x / sum);
  }

  measure() {
    const sampleFromProbs = probs => {
      const r = Math.random();
      let acc = 0;
      for (let i = 0; i < probs.length; i++) {
        acc += probs[i];
        if (r < acc) return i;
      }
      return probs.length - 1;
    };
    const collapse = sampleFromProbs(this.state);
    return { collapseA: collapse, collapseB: collapse, coherent: true, probabilities: [...this.state] };
  }

  brightestIndex() {
    let max = -1, idx = 0;
    this.state.forEach((v, i) => { if (v > max) { max = v; idx = i; } });
    return idx;
  }
}
