// ============================================================
// NEXO OPS — Utilidades v1.1
// ============================================================
const Utils = {
  toast(msg, type, duration) {
    type = type || 'info'; duration = duration || 3000;
    var existing = document.querySelector('.nexo-toast');
    if (existing) existing.remove();
    var colors = { success: '#2ECC71', error: '#E74C3C', warning: '#F39C12', info: '#3498DB' };
    var toast = document.createElement('div');
    toast.className = 'nexo-toast';
    toast.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);background:'+
      (colors[type]||colors.info)+';color:#fff;padding:12px 24px;border-radius:10px;font-size:14px;z-index:9999;max-width:90%;text-align:center;font-weight:500;';
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(function(){ toast.remove(); }, duration);
  },

  formatDate(dateStr) {
    if (!dateStr) return '';
    var parts = dateStr.split('-');
    return parts.length === 3 ? parts[2] + '/' + parts[1] : dateStr;
  },

  getHoraAtual() {
    return new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  },

  getDataHoje() { return new Date().toISOString().split('T')[0]; },

  getSaudacao() {
    var h = new Date().getHours();
    if (h < 12) return 'Bom dia';
    if (h < 18) return 'Boa tarde';
    return 'Boa noite';
  },

  async getGeo() {
    return new Promise(function(resolve) {
      if (!navigator.geolocation) { resolve({ lat: '', lng: '' }); return; }
      navigator.geolocation.getCurrentPosition(
        function(pos) { resolve({ lat: pos.coords.latitude.toFixed(6), lng: pos.coords.longitude.toFixed(6) }); },
        function() { resolve({ lat: '', lng: '' }); },
        { timeout: 5000, enableHighAccuracy: false }
      );
    });
  },

  async compressPhoto(file) {
    return new Promise(function(resolve, reject) {
      var reader = new FileReader();
      reader.onload = function(e) {
        var img = new Image();
        img.onload = function() {
          var canvas = document.createElement('canvas');
          var w = img.width, h = img.height;
          var maxW = NEXO.FOTO.maxWidth;
          if (w > maxW) { h = Math.round(h * maxW / w); w = maxW; }
          canvas.width = w; canvas.height = h;
          canvas.getContext('2d').drawImage(img, 0, 0, w, h);
          var base64 = canvas.toDataURL(NEXO.FOTO.format, NEXO.FOTO.quality).split(',')[1];
          resolve({ base64: base64, width: w, height: h, sizeKB: Math.round(base64.length * 0.75 / 1024) });
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  },

  async uploadFoto(base64, prefix) {
    var filename = prefix + '_' + Auth.lojaId + '_' + Utils.getDataHoje() + '_' + Date.now() + '.jpg';
    var res = await API.post('UPLOAD_FOTO', { base64: base64, filename: filename });
    return res.success ? res.data.url : '';
  },

  setRegistroHoje(id) {
    localStorage.setItem('nexo_registro_hoje', JSON.stringify({ id: id, data: this.getDataHoje() }));
  },

  getRegistroHoje() {
    try {
      var saved = JSON.parse(localStorage.getItem('nexo_registro_hoje') || '{}');
      return saved.data === this.getDataHoje() ? saved.id : null;
    } catch(e) { return null; }
  },

  isModuleDone(moduleId) {
    var key = 'nexo_modulos_' + this.getDataHoje();
    var completed = JSON.parse(localStorage.getItem(key) || '[]');
    return completed.indexOf(moduleId) >= 0;
  },

  scoreColor(score) { return NEXO.getScoreInfo(score).color; },

  tempFlag(value, type) {
    var faixa = NEXO.TEMP_FAIXAS[type];
    if (!faixa) return 'unknown';
    var v = parseFloat(value);
    return (v >= faixa.min && v <= faixa.max) ? 'conforme' : 'nao-conforme';
  },

  daysSince(dateStr) {
    return Math.floor((new Date() - new Date(dateStr)) / (1000 * 60 * 60 * 24));
  }
};
