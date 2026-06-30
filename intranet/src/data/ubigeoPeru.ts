export type UbigeoTree = Record<string, Record<string, string[]>>;

const LIMA_METROPOLITANA = [
  'Ancón',
  'Ate',
  'Barranco',
  'Breña',
  'Carabayllo',
  'Chaclacayo',
  'Chorrillos',
  'Cieneguilla',
  'Comas',
  'El Agustino',
  'Independencia',
  'Jesús María',
  'La Molina',
  'La Victoria',
  'Lima',
  'Lince',
  'Los Olivos',
  'Lurigancho',
  'Lurín',
  'Magdalena del Mar',
  'Miraflores',
  'Pachacámac',
  'Pucusana',
  'Pueblo Libre',
  'Puente Piedra',
  'Punta Hermosa',
  'Punta Negra',
  'Rímac',
  'San Bartolo',
  'San Borja',
  'San Isidro',
  'San Juan de Lurigancho',
  'San Juan de Miraflores',
  'San Luis',
  'San Martín de Porres',
  'San Miguel',
  'Santa Anita',
  'Santa María del Mar',
  'Santa Rosa',
  'Santiago de Surco',
  'Surquillo',
  'Villa El Salvador',
  'Villa María del Triunfo',
];

export const UBIGEO_PERU: UbigeoTree = {
  Amazonas: { Otro: ['Otro'] },
  Áncash: { Otro: ['Otro'] },
  Apurímac: { Otro: ['Otro'] },
  Arequipa: { Otro: ['Otro'] },
  Ayacucho: { Otro: ['Otro'] },
  Cajamarca: { Otro: ['Otro'] },
  Callao: {
    Callao: [
      'Bellavista',
      'Callao',
      'Carmen de la Legua Reynoso',
      'La Perla',
      'La Punta',
      'Mi Perú',
      'Ventanilla',
    ],
  },
  Cusco: { Otro: ['Otro'] },
  Huancavelica: { Otro: ['Otro'] },
  Huánuco: { Otro: ['Otro'] },
  Ica: { Otro: ['Otro'] },
  Junín: { Otro: ['Otro'] },
  'La Libertad': { Otro: ['Otro'] },
  Lambayeque: { Otro: ['Otro'] },
  Lima: {
    Lima: LIMA_METROPOLITANA,
    Barranca: ['Barranca', 'Paramonga', 'Pativilca', 'Supe', 'Supe Puerto'],
    Cajatambo: ['Cajatambo', 'Copa', 'Gorgor', 'Huancapón', 'Manás'],
    Canta: ['Canta', 'Arahuay', 'Huamantanga', 'Huaros', 'Lachaqui', 'San Buenaventura', 'Santa Rosa de Quives'],
    Cañete: [
      'San Vicente de Cañete',
      'Asia',
      'Calango',
      'Cerro Azul',
      'Chilca',
      'Coayllo',
      'Imperial',
      'Lunahuaná',
      'Mala',
      'Nuevo Imperial',
      'Pacarán',
      'Quilmaná',
      'San Antonio',
      'San Luis',
      'Santa Cruz de Flores',
      'Zúñiga',
    ],
    Huaral: ['Huaral', 'Atavillos Alto', 'Atavillos Bajo', 'Aucallama', 'Chancay', 'Ihuarí', 'Lampían', 'Pacaraos', 'Santa Cruz de Andamarca', 'Sumbilca', 'Veintisiete de Noviembre'],
    Huarochirí: ['Matucana', 'Antioquía', 'Callahuanca', 'Carampoma', 'Chicla', 'Cuenca', 'Huachupampa', 'Huanza', 'Huarochirí', 'Lahuaytambo', 'Langa', 'San Antonio', 'San Bartolomé', 'San Damián', 'San Juan de Iris', 'San Juan de Tantaranche', 'San Lorenzo de Quinti', 'San Mateo', 'San Mateo de Otao', 'San Pedro de Casta', 'San Pedro de Huancayre', 'Sangallaya', 'Santa Cruz de Cocachacra', 'Santa Eulalia', 'Santiago de Anchucaya', 'Santiago de Tuna', 'Santo Domingo de los Olleros', 'Surco'],
    Huaura: ['Huacho', 'Ámbar', 'Caleta de Carquín', 'Checras', 'Hualmay', 'Huaura', 'Leoncio Prado', 'Paccho', 'Santa Leonor', 'Santa María', 'Sayán', 'Végueta'],
    Oyón: ['Oyón', 'Andajes', 'Caujul', 'Cochamarca', 'Naván', 'Pachangara'],
    Yauyos: ['Yauyos', 'Alis', 'Ayauca', 'Ayavirí', 'Azángaro', 'Cacra', 'Carania', 'Catahuasi', 'Chocos', 'Cochas', 'Colonia', 'Hongos', 'Huampará', 'Huancaya', 'Huangáscar', 'Huantán', 'Huañec', 'Laraos', 'Lincha', 'Madean', 'Miraflores', 'Omas', 'Putinza', 'Quinches', 'Quinocay', 'San Joaquín', 'San Pedro de Pilas', 'Tanta', 'Tauripampa', 'Tomas', 'Tupe', 'Viñac', 'Vitis'],
  },
  Loreto: { Otro: ['Otro'] },
  'Madre de Dios': { Otro: ['Otro'] },
  Moquegua: { Otro: ['Otro'] },
  Pasco: { Otro: ['Otro'] },
  Piura: { Otro: ['Otro'] },
  Puno: { Otro: ['Otro'] },
  'San Martín': { Otro: ['Otro'] },
  Tacna: { Otro: ['Otro'] },
  Tumbes: { Otro: ['Otro'] },
  Ucayali: { Otro: ['Otro'] },
};

export function getDepartamentosPeru() {
  return Object.keys(UBIGEO_PERU).sort((a, b) => a.localeCompare(b, 'es'));
}

export function getProvinciasPeru(departamento?: string) {
  if (!departamento || !UBIGEO_PERU[departamento]) return [];
  return Object.keys(UBIGEO_PERU[departamento]).sort((a, b) => a.localeCompare(b, 'es'));
}

export function getDistritosPeru(departamento?: string, provincia?: string) {
  if (!departamento || !provincia) return [];
  return UBIGEO_PERU[departamento]?.[provincia] || [];
}
