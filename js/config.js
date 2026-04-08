// ============================================================
// NEXO OPS — Configuração Central
// Credenciais carregadas do env.js (gerado no build, nunca no repo)
// ============================================================
(function () {
  var env = window.__NEXO_ENV__;
  if (!env || !env.SUPABASE_URL || !env.SUPABASE_KEY) {
    document.body.innerHTML =
      '<div style="padding:40px;font-family:sans-serif;text-align:center">' +
      '<h2 style="color:#E74C3C">Erro de configuração</h2>' +
      '<p>Variáveis de ambiente não encontradas.<br>' +
      'Contate o administrador do sistema.</p>' +
      '</div>';
    throw new Error('NEXO: env.js ausente ou inválido');
  }

  window.NEXO = {
    SUPABASE_URL: env.SUPABASE_URL,
    SUPABASE_KEY: env.SUPABASE_KEY,
    VERSION: '2.0.0',
    APP_NAME: 'NEXO OPS',
    TEMP_FAIXAS: {
      balcao:     { min: 0,   max: 4,   label: 'Balcão refrigerado' },
      resfriados: { min: 0,   max: 4,   label: 'Câmara resfriados'  },
      congelados: { min: -99, max: -18, label: 'Câmara congelados'  },
    },
    SCORE_PESOS: {
      disponibilidade: 0.35,
      temperatura:     0.25,
      quebra:          0.25,
      presenca:        0.15,
    },
    SCORE_LABELS: {
      90: { label: 'Excelência',     color: '#C5A35A' },
      70: { label: 'Bom desempenho', color: '#2ECC71' },
      50: { label: 'Atenção',        color: '#F39C12' },
       0: { label: 'Crítico',        color: '#E74C3C' },
    },
    FOTO: {
      maxWidth: 1200,
      quality:  0.75,
      format:   'image/jpeg',
    },
    getScoreInfo(score) {
      if (score >= 90) return this.SCORE_LABELS[90];
      if (score >= 70) return this.SCORE_LABELS[70];
      if (score >= 50) return this.SCORE_LABELS[50];
      return this.SCORE_LABELS[0];
    }
  };
})();
// Limpar env do window após uso
delete window.__NEXO_ENV__;
