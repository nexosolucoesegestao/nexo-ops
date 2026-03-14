// ============================================================
// NEXO OPS — Utilidades
// ============================================================
const Utils = {
  toast(msg, type = 'info', duration = 3000) {
    const existing = document.querySelector('.nexo-toast');
    if (existing) existing.remove();

    const colors = {
      success: '#2ECC71', error: '#E74C3C', warning: '#F39C12', info: '#3498DB'
    };
    const toast = document.createElement('div');
    toast.className = 'nexo-toast';
    toast.style.cssText = `position:fixed;top:20px;left:50%;transform:translateX(-50%);
      background:${colors[type]||colors.info};color:#fff;padding:10px 20px;border-radius:8px;
      font-size:13px;z-index:9999;animation:fadeIn .3s;max-width:90%;text-align:center;`;
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), duration);
  },

  formatDate(dateStr) {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) return parts[2] + '/' + parts[1];
    return dateStr;
  },

  formatDateTime(dateStr, timeStr) {
    return this.formatDate(dateStr) + (timeStr ? ' ' + timeStr : '');
  },

  getHoraAtual() {
    const now = new Date();
    return now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  },

  getDataHoje() {
    return new Date().toISOString().split('T')[0];
  },

  getSaudacao() {
    const h = new Date().getHours();
    if (h < 12) return 'Bom dia';
    if (h < 18) return 'Boa tarde';
    return 'Boa noite';
  },

  async getGeo() {
    return new Promise(resolve => {
      if (!navigator.geolocation) {
        resolve({ lat: '', lng: '' });
        return;
      }
      navigator.geolocation.getCurrentPosition(
        pos => resolve({ lat: pos.coords.latitude.toFixed(6), lng: pos.coords.longitude.toFixed(6) }),
        () => resolve({ lat: '', lng: '' }),
        { timeout: 5000, enableHighAccuracy: false }
      );
    });
  },

  async compressPhoto(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let w = img.width, h = img.height;
          const maxW = NEXO.FOTO.maxWidth;
          if (w > maxW) {
            h = Math.round(h * maxW / w);
            w = maxW;
          }
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, w, h);
          const base64 = canvas.toDataURL(NEXO.FOTO.format, NEXO.FOTO.quality).split(',')[1];
          resolve({
            base64,
            width: w,
            height: h,
            sizeKB: Math.round(base64.length * 0.75 / 1024),
          });
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  },

  async uploadFoto(base64, prefix) {
    const filename = prefix + '_' + Auth.lojaId + '_' + Utils.getDataHoje() + '_' + Date.now() + '.jpg';
    const res = await API.post('UPLOAD_FOTO', { base64, filename }, { loja_id: Auth.lojaId });
    return res.success ? res.data.url : '';
  },

  setRegistroHoje(id) {
    localStorage.setItem('nexo_registro_hoje', JSON.stringify({
      id, data: this.getDataHoje()
    }));
  },

  getRegistroHoje() {
    try {
      const saved = JSON.parse(localStorage.getItem('nexo_registro_hoje') || '{}');
      if (saved.data === this.getDataHoje()) return saved.id;
      return null;
    } catch (e) { return null; }
  },

  el(tag, attrs = {}, children = []) {
    const e = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => {
      if (k === 'class') e.className = v;
      else if (k === 'text') e.textContent = v;
      else if (k === 'html') e.innerHTML = v;
      else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
      else if (k === 'style' && typeof v === 'object') Object.assign(e.style, v);
      else e.setAttribute(k, v);
    });
    children.forEach(c => {
      if (typeof c === 'string') e.appendChild(document.createTextNode(c));
      else if (c) e.appendChild(c);
    });
    return e;
  },

  showLoading(container, msg = 'Carregando...') {
    container.innerHTML = `<div class="loading-state">
      <div class="spinner"></div><p>${msg}</p></div>`;
  },

  scoreColor(score) {
    return NEXO.getScoreInfo(score).color;
  },

  tempFlag(value, type) {
    const faixa = NEXO.TEMP_FAIXAS[type];
    if (!faixa) return 'unknown';
    const v = parseFloat(value);
    return (v >= faixa.min && v <= faixa.max) ? 'conforme' : 'nao-conforme';
  },

  daysSince(dateStr) {
    const d = new Date(dateStr);
    const now = new Date();
    return Math.floor((now - d) / (1000 * 60 * 60 * 24));
  }
};
