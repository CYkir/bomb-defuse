// Clue generation for Bomb Defuse.
// Given a correct wire-cut order (a permutation of 5 wires), generate a pool
// of TRUE statements about that order and hand one distinct clue to each
// player. Not every clue is delivered, so the team must talk to combine info.

export const WIRES = ["red", "green", "blue", "yellow", "black"];

// Acak urutan kabel
export function randomOrder() {
  const arr = [...WIRES];

  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }

  return arr;
}

// Membuat kumpulan petunjuk
export function generateClues(order) {
  const pool = [];

  // -----------------------------
  // Urutan sebelum kabel lain
  // -----------------------------
  for (let i = 0; i < order.length; i++) {
    for (let j = i + 1; j < order.length; j++) {
      pool.push(
        `Putuskan kabel ${order[i]} sebelum kabel ${order[j]}.`
      );
    }
  }

  // -----------------------------
  // Tepat setelah
  // -----------------------------
  for (let i = 0; i < order.length - 1; i++) {
    pool.push(
      `Kabel ${order[i + 1]} harus diputus tepat setelah kabel ${order[i]}.`
    );
  }

  // -----------------------------
  // Awal & Akhir
  // -----------------------------
  pool.push(
    `Jangan memutus kabel ${order[order.length - 1]} sebagai kabel pertama.`
  );

  pool.push(
    `Kabel terakhir yang harus diputus adalah kabel ${order[order.length - 1]}.`
  );

  pool.push(
    `Mulailah dengan memutus kabel ${order[0]}.`
  );

  // -----------------------------
  // Petunjuk waktu
  // -----------------------------
  pool.push(
    `Jika waktu tersisa kurang dari 20 detik, kabel berikutnya adalah kabel ${order[2]}.`
  );

  // -----------------------------
  // Larangan
  // -----------------------------
  const wrong = WIRES.find((w) => w !== order[0]);

  if (wrong) {
    pool.push(
      `Jangan pernah memutus kabel ${wrong} sebagai kabel pertama.`
    );
  }

  // Acak clue
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  return pool;
}

// Bagikan clue ke setiap pemain
export function assignClues(playerIds, order) {
  const pool = generateClues(order);

  const map = {};

  playerIds.forEach((id, index) => {
    map[id] = pool[index % pool.length];
  });

  return map;
}