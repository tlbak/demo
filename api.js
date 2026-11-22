// API client and small UI helpers shared by both pages.
(function () {
  'use strict';

  function ApiError(message, code) {
    this.message = message;
    this.code = code || 'error';
  }
  ApiError.prototype = Object.create(Error.prototype);

  function apiUrl() {
    var url = (window.APP_CONFIG && window.APP_CONFIG.API_URL) || '';
    if (!/^https:\/\//.test(url)) throw new ApiError('رابط الخادم غير مضبوط في config.js', 'config');
    return url;
  }

  function call(method, action, body) {
    var req;
    try {
      var url = apiUrl();
      req = method === 'GET'
        ? fetch(url + '?action=' + encodeURIComponent(action), { method: 'GET', redirect: 'follow' })
        // text/plain avoids a CORS preflight, which Apps Script can't answer.
        : fetch(url, {
          method: 'POST',
          redirect: 'follow',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(Object.assign({ action: action }, body || {})),
        });
    } catch (e) {
      return Promise.reject(e instanceof ApiError ? e : new ApiError('تعذر الاتصال', 'network'));
    }
    return req
      .catch(function () { throw new ApiError('تعذر الاتصال، تأكد من الإنترنت وحاول مرة ثانية', 'network'); })
      .then(function (res) {
        return res.json().catch(function () { throw new ApiError('رد غير متوقع من الخادم، حاول بعد شوي', 'bad_response'); });
      })
      .then(function (json) {
        if (!json || !json.ok) throw new ApiError((json && json.error) || 'صار خطأ، حاول مرة ثانية', json && json.code);
        return json.data;
      });
  }

  var U = {
    esc: function (s) {
      return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
      });
    },
    money: function (n) {
      var x = Math.round(Number(n || 0) * 100) / 100;
      return x.toLocaleString('en-US', { maximumFractionDigits: 2 });
    },
    latinDigits: function (s) {
      return String(s == null ? '' : s)
        .replace(/[٠-٩]/g, function (d) { return String(d.charCodeAt(0) - 0x0660); })
        .replace(/[۰-۹]/g, function (d) { return String(d.charCodeAt(0) - 0x06F0); });
    },
    normPhone: function (v) {
      var p = U.latinDigits(v).replace(/\D/g, '');
      if (/^9665\d{8}$/.test(p)) p = '0' + p.slice(3);
      else if (/^5\d{8}$/.test(p)) p = '0' + p;
      return /^05\d{8}$/.test(p) ? p : '';
    },
    waLink: function (phone, text) {
      var p = U.normPhone(phone);
      return 'https://wa.me/' + (p ? '966' + p.slice(1) : '') + '?text=' + encodeURIComponent(text);
    },
    safeUrl: function (u) { return /^https:\/\/[^\s<>"']+$/i.test(u || '') ? u : ''; },
    store: {
      get: function (k, store) { try { return JSON.parse((store || localStorage).getItem(k)); } catch (e) { return null; } },
      set: function (k, v, store) { try { (store || localStorage).setItem(k, JSON.stringify(v)); } catch (e) { /* storage blocked */ } },
      del: function (k, store) { try { (store || localStorage).removeItem(k); } catch (e) { /* storage blocked */ } },
    },
    toast: (function () {
      var timer = null;
      return function (msg) {
        var el = document.getElementById('toast');
        if (!el) return;
        el.querySelector('span').textContent = msg;
        el.hidden = false;
        clearTimeout(timer);
        timer = setTimeout(function () { el.hidden = true; }, 3200);
      };
    })(),
    busy: function (btn, on) {
      if (!btn) return;
      btn.classList.toggle('busy', !!on);
      btn.disabled = !!on;
    },
    copy: function (text, onDone, onFail) {
      try {
        navigator.clipboard.writeText(text).then(onDone, onFail);
      } catch (e) { onFail(); }
    },
  };

  window.ApiError = ApiError;
  window.API = {
    get: function (action) { return call('GET', action); },
    post: function (action, body) { return call('POST', action, body); },
  };
  window.U = U;
})();
