/* StreamNest 列表页：直接消费转码器生成的 /media/manifest.json
   纯静态、零数据库。所有外部文本一律用 textContent 写入，避免文件名触发 XSS。 */
(function () {
  'use strict';

  var MANIFEST = '/media/manifest.json';
  var grid = document.getElementById('grid');
  var empty = document.getElementById('empty');
  var errorBox = document.getElementById('error');
  var search = document.getElementById('search');
  var count = document.getElementById('count');
  var items = [];

  function fmtDuration(sec) {
    sec = Math.max(0, Math.round(Number(sec) || 0));
    var h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    var pad = function (n) { return n < 10 ? '0' + n : '' + n; };
    return h > 0 ? h + ':' + pad(m) + ':' + pad(s) : m + ':' + pad(s);
  }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function makeCard(it) {
    var base = it.base || '';
    var card = el('a', 'card');
    card.href = '/player.html?v=' + encodeURIComponent(base);

    var thumb = el('div', 'thumb');
    if (it.poster || it.thumbnail) {
      var img = document.createElement('img');
      img.src = it.poster || it.thumbnail;
      img.alt = it.title || base;
      img.loading = 'lazy';
      img.onerror = function () {
        img.remove();
        thumb.appendChild(el('div', 'ph', '▶'));
      };
      thumb.appendChild(img);
    } else {
      thumb.appendChild(el('div', 'ph', '▶'));
    }
    var badge = el('span', 'badge', fmtDuration(it.duration));
    thumb.appendChild(badge);

    var body = el('div', 'body');
    body.appendChild(el('div', 'title', it.title || base));
    body.appendChild(el('div', 'desc', it.description || ''));
    var when = (it.converted_at || '').slice(0, 16).replace('T', ' ');
    body.appendChild(el('div', 'date', when || (it.source_file || '')));
    body.appendChild(el('div', 'play', '▶ 播放'));

    card.appendChild(thumb);
    card.appendChild(body);
    return card;
  }

  function render(list) {
    grid.textContent = '';
    list.forEach(function (it) { grid.appendChild(makeCard(it)); });
    empty.hidden = list.length > 0;
    count.textContent = list.length ? list.length + ' 个视频' : '';
  }

  function filter(kw) {
    kw = (kw || '').trim().toLowerCase();
    if (!kw) return render(items);
    render(items.filter(function (it) {
      return [it.title, it.base, it.source_file, it.description]
        .join(' ').toLowerCase().indexOf(kw) >= 0;
    }));
  }

  // no-store：避免浏览器缓存清单导致新转好的视频不出现
  fetch(MANIFEST, { cache: 'no-store' })
    .then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    })
    .then(function (data) {
      items = Array.isArray(data) ? data : [];
      // 新转的排前面
      items.sort(function (a, b) {
        return String(b.converted_at || '').localeCompare(String(a.converted_at || ''));
      });
      filter('');
    })
    .catch(function (e) {
      errorBox.hidden = false;
      document.getElementById('error-detail').textContent =
        '无法读取 ' + MANIFEST + '（' + e.message + '）。若尚未转码过视频属正常；' +
        '否则检查 Nginx 配置与转码服务状态。';
      empty.hidden = true;
    });

  search.addEventListener('input', function () { filter(search.value); });
})();