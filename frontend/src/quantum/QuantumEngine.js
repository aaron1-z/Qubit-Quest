export class QuantumEngine {
  constructor(n_positions=8, steps=8) {
    this.n_positions = n_positions;
    this.steps = steps;
    this.stateA = Array(n_positions).fill(0).map((_,i)=> i===0 ? 1:0);
    this.stateB = [...this.stateA]; // mirrored world
  }

  applyHadamard() {
    this.stateA = this.stateA.map(v=>Math.random());
    this.stateB = this.stateB.map((v,i)=>1-this.stateA[i]); // entangled mirror
  }

  measure() {
    const collapseA = this.stateA.indexOf(Math.max(...this.stateA));
    const collapseB = this.stateB.indexOf(Math.max(...this.stateB));
    const coherent = collapseA === collapseB;
    return { collapseA, collapseB, coherent };
  }

  resetRow(startPos=0) {
    this.stateA = Array(this.n_positions).fill(0).map((_,i)=> i===startPos?1:0);
    this.stateB = [...this.stateA];
  }
}
