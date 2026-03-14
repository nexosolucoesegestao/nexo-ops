// ============================================================
// NEXO OPS — Configuração Central
// ============================================================
const NEXO = {
  API_URL: 'https://script.google.com/macros/s/AKfycbyw6oNYLBHXz0DKXCw3UZunQxe9GFkleH6BP8FQ8Dpu1u30c61AJTMQbmExJXgWVkPx/exec',
  API_TOKEN: 'nexo2026_minhalojadigital',
  VERSION: '1.0.0',
  APP_NAME: 'NEXO OPS',

  TEMP_FAIXAS: {
    balcao: { min: 0, max: 4, label: 'Balcão refrigerado' },
    resfriados: { min: 0, max: 4, label: 'Câmara resfriados' },
    congelados: { min: -99, max: -18, label: 'Câmara congelados' },
  },

  SCORE_PESOS: {
    disponibilidade: 0.35,
    temperatura: 0.25,
    quebra: 0.25,
    presenca: 0.15,
  },

  SCORE_LABELS: {
    90: { label: 'Excelência', color: '#C5A35A' },
    70: { label: 'Bom desempenho', color: '#2ECC71' },
    50: { label: 'Atenção', color: '#F39C12' },
    0:  { label: 'Crítico', color: '#E74C3C' },
  },

  FOTO: {
    maxWidth: 1200,
    quality: 0.75,
    format: 'image/jpeg',
  },

  getScoreInfo(score) {
    if (score >= 90) return this.SCORE_LABELS[90];
    if (score >= 70) return this.SCORE_LABELS[70];
    if (score >= 50) return this.SCORE_LABELS[50];
    return this.SCORE_LABELS[0];
  }
};
