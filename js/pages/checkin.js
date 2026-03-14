// ============================================================
// NEXO OPS — Módulo 0: Check-in Visual v1.2
// Check-in salva rápido, foto upload em background
// ============================================================
Router.register('checkin', function(app) {
  var fotoBase64 = null;
  var geo = { lat: '', lng: '' };

  Utils.getGeo().then(function(g) {
    geo = g;
    var geoEl = document.getElementById('geoStatus');
    if (geoEl && geo.lat) {
      geoEl.innerHTML = '<span class="geo-dot active"></span><span>Geolocalização ativa</span>';
    }
  });

  app.innerHTML =
    '<div class="page">' +
      '<header class="module-header">' +
        '<button class="btn-back" onclick="Router.navigate(\'home\')"><svg viewBox="0 0 18 18" fill="none"><path d="M12 3L6 9L12 15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></button>' +
        '<div class="module-title"><p class="module-name">Check-in visual</p><p class="module-sub">Módulo 0 — abertura do dia</p></div>' +
        '<div class="progress-dots"><span class="dot active"></span><span class="dot"></span><span class="dot"></span><span class="dot"></span><span class="dot"></span></div>' +
      '</header>' +
      '<div class="module-body">' +
        '<div class="geo-badge" id="geoStatus"><span class="geo-dot"></span><span>Buscando localização...</span></div>' +
        '<div class="checkin-time"><p class="label-gold">Hora do check-in</p><p class="time-big">' + Utils.getHoraAtual() + '</p></div>' +
        '<p class="label-gold">Foto obrigatória — balcão de atendimento</p>' +
        '<div class="foto-area" id="fotoArea" onclick="document.getElementById(\'fotoInput\').click()">' +
          '<div class="foto-placeholder">' +
            '<svg viewBox="0 0 28 28" fill="none" style="width:48px;height:48px;margin:0 auto 8px"><rect x="3" y="7" width="22" height="16" rx="3" stroke="#C5A35A" stroke-width="1.3"/><circle cx="14" cy="15" r="4.5" stroke="#C5A35A" stroke-width="1.3"/><circle cx="14" cy="15" r="2" fill="#C5A35A"/><path d="M9 7V5.5C9 4.7 9.7 4 10.5 4H17.5C18.3 4 19 4.7 19 5.5V7" stroke="#C5A35A" stroke-width="1.3"/></svg>' +
            '<p>Tirar foto do balcão</p><small>Visão frontal completa</small>' +
          '</div>' +
        '</div>' +
        '<input type="file" id="fotoInput" accept="image/*" capture="environment" style="display:none">' +
        '<div class="input-group dark"><label>Observação rápida (opcional)</label><textarea id="obsCheckin" rows="2" placeholder="Ex: Balcão com pouco produto..."></textarea></div>' +
        '<div class="info-box"><svg viewBox="0 0 14 14" fill="none" style="width:14px;height:14px;flex-shrink:0;margin-top:1px"><circle cx="7" cy="7" r="5.5" stroke="#C5A35A" stroke-width="1"/><line x1="7" y1="4.5" x2="7" y2="7.5" stroke="#C5A35A" stroke-width="1" stroke-linecap="round"/><circle cx="7" cy="9.5" r=".6" fill="#C5A35A"/></svg><p>Esta foto será a baseline visual do dia. O gestor remoto verá o estado do balcão na abertura.</p></div>' +
      '</div>' +
      '<div class="module-footer"><button class="btn-primary btn-full" id="btnCheckin" disabled>Confirmar check-in (foto obrigatória)</button></div>' +
    '</div>';

  document.getElementById('fotoInput').addEventListener('change', async function(e) {
    var file = e.target.files[0];
    if (!file) return;
    var area = document.getElementById('fotoArea');
    area.innerHTML = '<div class="spinner"></div>';
    try {
      var compressed = await Utils.compressPhoto(file);
      fotoBase64 = compressed.base64;
      area.innerHTML = '<img src="data:image/jpeg;base64,' + fotoBase64 + '" class="foto-preview"><p class="foto-size">' + compressed.width + 'x' + compressed.height + ' — ' + compressed.sizeKB + 'KB</p>';
      document.getElementById('btnCheckin').disabled = false;
    } catch (err) {
      area.innerHTML = '<p class="error-text">Erro ao processar foto</p>';
      Utils.toast('Erro ao processar foto', 'error');
    }
  });

  document.getElementById('btnCheckin').addEventListener('click', async function() {
    var btn = document.getElementById('btnCheckin');
    btn.disabled = true;
    btn.textContent = 'Salvando...';

    // PASSO 1: Salvar check-in SEM foto (rápido, dados pequenos)
    var res = await API.post('SAVE_CHECKIN', {
      id_loja: Auth.lojaId,
      id_pessoa: Auth.userId,
      hora_checkin: Utils.getHoraAtual(),
      foto_url: '',
      observacao: document.getElementById('obsCheckin').value.trim(),
      geo_lat: geo.lat,
      geo_lng: geo.lng
    });

    if (res.success || res.queued) {
      var regId = res.data ? res.data.id_registro : null;
      if (regId) Utils.setRegistroHoje(regId);
      markModuleComplete('checkin');
      Utils.toast('Check-in realizado!', 'success');

      // PASSO 2: Upload foto em background (não bloqueia o usuário)
      if (fotoBase64 && regId) {
        uploadFotoBackground(regId);
      }

      // Invalidar cache do dashboard para refletir novo check-in
      API.clearCache('GET_DASHBOARD');
      Router.navigate('home');
    } else {
      Utils.toast(res.error || 'Erro ao salvar', 'error');
      btn.disabled = false;
      btn.textContent = 'Confirmar check-in';
    }
  });

  function uploadFotoBackground(regId) {
    var filename = 'checkin_' + Auth.lojaId + '_' + Utils.getDataHoje() + '_' + Date.now() + '.jpg';
    API.uploadFoto(fotoBase64, filename).then(function(uploadRes) {
      if (uploadRes.success && uploadRes.data && uploadRes.data.url) {
        // Atualizar registro com URL da foto
        API.post('SAVE_CHECKIN', {
          id_loja: Auth.lojaId,
          id_pessoa: Auth.userId,
          foto_url: uploadRes.data.url,
          observacao: ''
        });
      }
    }).catch(function(err) {
      console.log('Upload foto background falhou:', err);
    });
  }
});
