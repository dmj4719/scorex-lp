// SCORE X LP 共通スクリプト
document.addEventListener('DOMContentLoaded', function () {
  // ===== UTMパラメータの保持と引き継ぎ（Meta広告の判別用） =====
  var UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid', 'gclid'];
  var utm = {};
  try { utm = JSON.parse(sessionStorage.getItem('scx_utm') || '{}'); } catch (e) { utm = {}; }
  var params = new URLSearchParams(window.location.search);
  var found = false;
  UTM_KEYS.forEach(function (k) {
    var v = params.get(k);
    if (v) { utm[k] = v; found = true; }
  });
  // 最初に着地したURL（広告からの流入URL）を記録
  if (found || !utm.landing_url) utm.landing_url = window.location.href;
  try { sessionStorage.setItem('scx_utm', JSON.stringify(utm)); } catch (e) {}
  window.SCX_UTM = utm;

  // サイト内リンクにUTMを引き継ぐ（LP → フォーム → サンクス）
  var qs = [];
  UTM_KEYS.forEach(function (k) {
    if (utm[k]) qs.push(k + '=' + encodeURIComponent(utm[k]));
  });
  if (qs.length) {
    Array.prototype.forEach.call(document.querySelectorAll('a[href]'), function (a) {
      var h = a.getAttribute('href');
      if (!h || /^(https?:|mailto:|tel:|#|javascript:)/i.test(h)) return;
      a.setAttribute('href', h + (h.indexOf('?') >= 0 ? '&' : '?') + qs.join('&'));
    });
  }

  // ハンバーガーメニュー
  var btn = document.getElementById('menuBtn');
  var menu = document.getElementById('mobileMenu');
  if (btn && menu) {
    btn.addEventListener('click', function () {
      menu.style.display = (menu.style.display === 'none' || !menu.style.display) ? 'block' : 'none';
    });
    menu.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () { menu.style.display = 'none'; });
    });
  }
  // FAQアコーディオン
  document.querySelectorAll('.faq-btn').forEach(function (b) {
    b.addEventListener('click', function () {
      var ans = b.parentElement.querySelector('.faq-ans');
      var sym = b.querySelector('.faq-sym');
      var open = ans && ans.style.display !== 'none';
      if (ans) ans.style.display = open ? 'none' : 'flex';
      if (sym) sym.textContent = open ? '＋' : '−';
    });
  });
  // 導入事例動画（サムネイル→クリックで再生）
  document.querySelectorAll('.yt-btn').forEach(function (b) {
    b.addEventListener('click', function () {
      var wrap = b.parentElement;
      var f = document.createElement('iframe');
      f.src = b.getAttribute('data-embed');
      f.title = 'YouTube video player';
      f.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
      f.allowFullscreen = true;
      f.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;border:0';
      wrap.appendChild(f);
      b.remove();
    });
  });

  // 追従CTA：FVを通過してから表示。フォームが見えている間は隠す（送信ボタンと重なるため）
  var fv = document.getElementById('fv');
  var formSec = document.getElementById('form');
  var sticky = document.getElementById('stickyCta');
  if (fv && sticky) {
    var pastFv = false;
    var inForm = false;
    var apply = function () {
      var show = pastFv && !inForm;
      sticky.style.opacity = show ? '1' : '0';
      sticky.style.visibility = show ? 'visible' : 'hidden';
      sticky.style.transform = show ? 'translateY(0)' : 'translateY(12px)';
    };
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { pastFv = !e.isIntersecting; });
        apply();
      }, { threshold: 0 }).observe(fv);
      if (formSec) {
        new IntersectionObserver(function (entries) {
          entries.forEach(function (e) { inForm = e.isIntersecting; });
          apply();
        }, { threshold: 0 }).observe(formSec);
      }
    } else {
      window.addEventListener('scroll', function () {
        pastFv = window.scrollY > fv.offsetHeight;
        if (formSec) {
          var r = formSec.getBoundingClientRect();
          inForm = r.top < window.innerHeight && r.bottom > 0;
        }
        apply();
      }, { passive: true });
    }
  }

  // ===== 画像拡大（PC:カーソルを合わせるとプレビュー／スマホ:タップで全画面） =====
  var zoomables = document.querySelectorAll('.zoomable');
  if (zoomables.length) {
    // 全画面ライトボックス
    var ov = document.createElement('div');
    ov.id = 'zoomOverlay';
    ov.setAttribute('role', 'dialog');
    ov.setAttribute('aria-modal', 'true');
    ov.innerHTML = '<button id="zoomClose" type="button" aria-label="閉じる">×</button>' +
                   '<img alt=""><p id="zoomCaption"></p>';
    document.body.appendChild(ov);
    var ovImg = ov.querySelector('img');
    var ovCap = ov.querySelector('#zoomCaption');
    var prevOverflow = '';

    var openZoom = function (img) {
      ovImg.src = img.currentSrc || img.src;
      ovImg.alt = img.alt || '';
      ovCap.textContent = img.alt || '';
      ov.classList.add('is-open');
      prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      requestAnimationFrame(function () { ov.classList.add('is-visible'); });
    };
    var closeZoom = function () {
      ov.classList.remove('is-visible');
      document.body.style.overflow = prevOverflow;
      setTimeout(function () { ov.classList.remove('is-open'); ovImg.removeAttribute('src'); }, 200);
    };
    ov.addEventListener('click', closeZoom);
    document.addEventListener('keydown', function (e) {
      if ((e.key === 'Escape' || e.key === 'Esc') && ov.classList.contains('is-open')) closeZoom();
    });

    // PCのホバープレビュー（マウス操作の端末のみ）
    var fine = window.matchMedia && window.matchMedia('(hover:hover) and (pointer:fine)').matches;
    var peek = null, peekImg = null, hoverTimer = null;
    if (fine) {
      peek = document.createElement('div');
      peek.id = 'zoomPeek';
      peek.innerHTML = '<img alt=""><p>クリックすると全画面で表示できます</p>';
      document.body.appendChild(peek);
      peekImg = peek.querySelector('img');
    }
    var hidePeek = function () {
      if (hoverTimer) { clearTimeout(hoverTimer); hoverTimer = null; }
      if (peek) peek.classList.remove('is-visible');
    };

    Array.prototype.forEach.call(zoomables, function (img) {
      img.setAttribute('tabindex', '0');
      img.setAttribute('role', 'button');
      img.addEventListener('click', function () { hidePeek(); openZoom(img); });
      img.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openZoom(img); }
      });
      if (fine) {
        img.addEventListener('mouseenter', function () {
          if (ov.classList.contains('is-open')) return;
          if (hoverTimer) clearTimeout(hoverTimer);
          hoverTimer = setTimeout(function () {
            peekImg.src = img.currentSrc || img.src;
            peekImg.alt = img.alt || '';
            peek.classList.add('is-visible');
          }, 180);
        });
        img.addEventListener('mouseleave', hidePeek);
      }
    });
    if (fine) window.addEventListener('scroll', hidePeek, { passive: true });
  }
});
