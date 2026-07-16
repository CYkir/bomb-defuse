export const WIRES = ["red", "green", "blue", "yellow", "black"];

const wireName = {
  red: "Merah",
  green: "Hijau",
  blue: "Biru",
  yellow: "Kuning",
  black: "Hitam",
};

function namaKabel(color) {
  return wireName[color];
}

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

  //================================================
  // Sebelum & Sesudah
  //================================================

  for (let i = 0; i < order.length; i++) {
    for (let j = i + 1; j < order.length; j++) {
      pool.push(`Putuskan kabel ${namaKabel(order[i])} sebelum kabel ${namaKabel(order[j])}.`);

      pool.push(`Kabel ${namaKabel(order[j])} diputus setelah kabel ${namaKabel(order[i])}.`);
    }
  }

  //================================================
  // Posisi Pertama & Terakhir
  //================================================

  pool.push(`Kabel ${namaKabel(order[0])} bukan kabel terakhir.`);

  pool.push(`Kabel ${namaKabel(order[order.length - 1])} bukan kabel pertama.`);

  pool.push(`Kabel terakhir bukan kabel ${namaKabel(order[0])}.`);

  pool.push(`Kabel pertama bukan kabel ${namaKabel(order[order.length - 1])}.`);

  //================================================
  // Posisi Ganjil & Genap
  //================================================

  for (let i = 0; i < order.length; i++) {
    const posisi = i + 1;

    if (posisi % 2 === 0) {
      pool.push(`Kabel ${namaKabel(order[i])} berada pada posisi genap.`);
    } else {
      pool.push(`Kabel ${namaKabel(order[i])} berada pada posisi ganjil.`);
    }
  }

  //================================================
  // Jumlah Kabel Sebelum & Sesudah
  //================================================

  for (let i = 0; i < order.length; i++) {
    const sebelum = i;
    const sesudah = order.length - i - 1;

    if (sebelum > 0) {
      pool.push(`Terdapat ${sebelum} kabel sebelum kabel ${namaKabel(order[i])}.`);
    }

    if (sesudah > 0) {
      pool.push(`Terdapat ${sesudah} kabel setelah kabel ${namaKabel(order[i])}.`);
    }
  }

  //================================================
  // Berdampingan
  //================================================

  for (let i = 0; i < order.length - 1; i++) {
    pool.push(`Kabel ${namaKabel(order[i])} berdampingan dengan kabel ${namaKabel(order[i + 1])}.`);
  }

  //================================================
  // Satu Kabel Diantaranya
  //================================================

  for (let i = 0; i < order.length - 2; i++) {
    pool.push(
      `Terdapat satu kabel diantara kabel ${namaKabel(
        order[i],
      )} dan kabel ${namaKabel(order[i + 2])}.`,
    );
  }

  //================================================
  // Tidak Berdampingan
  //================================================

  WIRES.forEach((a) => {
    WIRES.forEach((b) => {
      if (a === b) return;

      const indexA = order.indexOf(a);
      const indexB = order.indexOf(b);

      if (Math.abs(indexA - indexB) > 1) {
        pool.push(`Kabel ${namaKabel(a)} tidak berdampingan dengan kabel ${namaKabel(b)}.`);
      }
    });
  });

  //================================================
  // Diantara Dua Kabel
  //================================================

  for (let i = 1; i < order.length - 1; i++) {
    pool.push(
      `Kabel ${namaKabel(order[i])} berada diantara kabel ${namaKabel(
        order[i - 1],
      )} dan kabel ${namaKabel(order[i + 1])}.`,
    );
  }

  //================================================
  // Larangan
  //================================================

  WIRES.forEach((wire) => {
    if (wire !== order[0]) {
      pool.push(`Jangan memutus kabel ${namaKabel(wire)} sebagai kabel pertama.`);
    }

    if (wire !== order[order.length - 1]) {
      pool.push(`Kabel ${namaKabel(wire)} bukan kabel terakhir.`);
    }
  });

  //================================================
  // Petunjuk Tambahan
  //================================================

  pool.push(`Kabel yang diputus pertama berada pada posisi ganjil.`);

  pool.push(`Kabel yang diputus terakhir berada pada posisi ganjil.`);

  pool.push(`Terdapat tepat tiga kabel yang diputus sebelum kabel terakhir.`);

  pool.push(`Terdapat tepat satu kabel yang diputus setelah kabel keempat.`);

  //================================================
  // Acak clue
  //================================================

  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));

    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  //================================================
  // Batasi maksimal 30 clue setiap ronde
  //================================================

  return pool.slice(0, 30);
}

//================================================
// Bagikan clue ke player
//================================================

export function assignClues(playerIds, order) {
  const pool = generateClues(order);

  const map = {};

  //==================================
  // acak kembali clue
  //==================================

  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));

    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  //==================================
  // setiap player mendapatkan
  // 2 clue yang berbeda
  //==================================

  let clueIndex = 0;

  playerIds.forEach((id) => {
    map[id] = [];

    for (let i = 0; i < 2; i++) {
      if (clueIndex >= pool.length) {
        clueIndex = 0;
      }

      map[id].push(pool[clueIndex]);

      clueIndex++;
    }
  });

  return map;
}
