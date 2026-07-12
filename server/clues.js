// Clue generation for Bomb Defuse.
// Given a correct wire-cut order (a permutation of 5 wires), generate a pool
// of TRUE statements about that order and hand one distinct clue to each
// player. Not every clue is delivered, so the team must talk to combine info.

export const WIRES = ["red", "green", "blue", "yellow", "black"];

export function randomOrder() {
  const arr = [...WIRES];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

export function generateClues(order) {
  const pool = [];

  // Pairwise "X before Y"
  for (let i = 0; i < order.length; i++) {
    for (let j = i + 1; j < order.length; j++) {
      pool.push(`Cut ${cap(order[i])} before ${cap(order[j])}.`);
    }
  }
  // Immediate neighbors
  for (let i = 0; i < order.length - 1; i++) {
    pool.push(
      `${cap(order[i + 1])} must be cut right after ${cap(order[i])}.`,
    );
  }
  // Firsts and lasts
  pool.push(`Do NOT cut ${cap(order[order.length - 1])} first.`);
  pool.push(`The last wire to cut is ${cap(order[order.length - 1])}.`);
  pool.push(`Start with ${cap(order[0])}.`);
  // Conditional timer hint (always safe because it's about the current step)
  pool.push(
    `If the timer drops below 20 seconds, the next wire is always ${cap(order[2])}.`,
  );
  // Negative constraints
  for (let i = 0; i < order.length; i++) {
    const wrong = WIRES.find((w) => w !== order[0]);
    if (wrong) pool.push(`Never cut ${cap(wrong)} first.`);
    break;
  }

  // Shuffle
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool;
}

// Assign one distinct clue per player.
export function assignClues(playerIds, order) {
  const pool = generateClues(order);
  const map = {};
  playerIds.forEach((pid, i) => {
    map[pid] = pool[i % pool.length];
  });
  return map;
}
