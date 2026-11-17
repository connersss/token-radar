// Token Radar dashboard: board, live-token view, method. Static page, no network.
// Reads window.RADAR from data.js. Hash routes: #detail/<slug> opens a protocol,
// #filter/<Category> filters the board by category.
(function () {
  'use strict';
  var R = window.RADAR;
  var root = document.getElementById('board');
  root.setAttribute('aria-busy', 'false');

  var state = { tab: 'board', q: '', cat: '', chain: '', wl: false, minTvl: 0, sort: 'rank', dir: 1 };

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function money(n) {
    if (n >= 1e12) return '$' + (n / 1e12).toFixed(2) + 'T';
    if (n >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
    if (n >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
    if (n >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'K';
    return '$' + Math.round(n);
  }
  function pct(n) {
    if (n === null || n === undefined) return '—';
    return (n > 0 ? '+' : '') + n.toFixed(1) + '%';
  }
  function age(d) {
    if (d === null || d === undefined) return '—';
    if (d < 30) return d + 'd';
    if (d < 365) return Math.round(d / 30) + 'mo';
    return (d / 365).toFixed(1) + 'y';
  }
  function bySlug(slug) {
    for (var i = 0; i < R.rows.length; i++) if (R.rows[i].slug === slug) return R.rows[i];
    return null;
  }

  function header() {
    return '<header><h1>Token <b>Radar</b></h1>' +
      '<p class="sub">Pre-token protocols ranked by implied value &middot; snapshot ' + esc(R.as_of) +
      ' &middot; model ' + esc(R.model_version) + ' &middot; source: DefiLlama protocols list, frozen for this board</p>' +
      '<div class="stats">' +
      '<div class="stat"><b>' + R.board_size + '</b><span>protocols ranked</span></div>' +
      '<div class="stat"><b>' + R.watchlist_size + '</b><span>on the watchlist</span></div>' +
      '<div class="stat"><b>' + R.early_size + '</b><span>below the floor</span></div>' +
      '<div class="stat"><b>' + R.live_size + '</b><span>already trading</span></div>' +
      '</div></header>';
  }
  function tabs() {
    function t(id, label) {
      return '<button role="tab" data-tab="' + id + '" aria-selected="' + (state.tab === id) + '">' + label + '</button>';
    }
    return '<div class="tabs" role="tablist">' + t('board', 'Board') + t('live', 'Live tokens') + t('method', 'Method') + '</div>';
  }

  function filtered() {
    var q = state.q.trim().toLowerCase();
    return R.rows.filter(function (r) {
      if (state.wl && !r.watchlist) return false;
      if (state.cat && r.category !== state.cat) return false;
      if (state.chain && r.chains.indexOf(state.chain) < 0) return false;
      if (r.tvl_usd < state.minTvl) return false;
      if (q && (r.name.toLowerCase().indexOf(q) < 0 && r.slug.toLowerCase().indexOf(q) < 0)) return false;
      return true;
    }).sort(function (a, b) {
      var k = state.sort, d = state.dir, va, vb;
      if (k === 'rank') { va = a.rank; vb = b.rank; }
      else if (k === 'implied') { va = a.implied_value_usd; vb = b.implied_value_usd; }
      else if (k === 'tvl') { va = a.tvl_usd; vb = b.tvl_usd; }
      else if (k === 'growth') { va = a.change_7d === null ? -1e9 : a.change_7d; vb = b.change_7d === null ? -1e9 : b.change_7d; }
      else { va = a.age_days === null ? -1 : a.age_days; vb = b.age_days === null ? -1 : b.age_days; }
      return (va < vb ? -1 : va > vb ? 1 : a.rank - b.rank) * d;
    });
  }

  function boardView() {
    var cats = [], chains = [];
    R.rows.forEach(function (r) {
      if (r.category && cats.indexOf(r.category) < 0) cats.push(r.category);
      r.chains.forEach(function (c) { if (chains.indexOf(c) < 0) chains.push(c); });
    });
    cats.sort(); chains.sort();
    function opts(list, cur, all) {
      var h = '<option value="">' + all + '</option>';
      list.forEach(function (v) { h += '<option value="' + esc(v) + '"' + (cur === v ? ' selected' : '') + '>' + esc(v) + '</option>'; });
      return h;
    }
    var rows = filtered();
    var h = header() + tabs() +
      '<div class="controls">' +
      '<input id="q" type="search" placeholder="Search name or slug" value="' + esc(state.q) + '" aria-label="Search">' +
      '<select id="cat" aria-label="Category">' + opts(cats, state.cat, 'All categories') + '</select>' +
      '<select id="chain" aria-label="Chain">' + opts(chains, state.chain, 'All chains') + '</select>' +
      '<select id="minTvl" aria-label="Minimum TVL">' +
      '<option value="0"' + (state.minTvl === 0 ? ' selected' : '') + '>Any TVL</option>' +
      '<option value="5000000"' + (state.minTvl === 5000000 ? ' selected' : '') + '>&ge; $5M TVL</option>' +
      '<option value="50000000"' + (state.minTvl === 50000000 ? ' selected' : '') + '>&ge; $50M TVL</option>' +
      '<option value="500000000"' + (state.minTvl === 500000000 ? ' selected' : '') + '>&ge; $500M TVL</option>' +
      '</select>' +
      '<label><input id="wl" type="checkbox"' + (state.wl ? ' checked' : '') + '> Watchlist only</label>' +
      '</div>' +
      '<p class="count">Showing ' + rows.length + ' of ' + R.board_size + ' ranked protocols. Implied value is the model&rsquo;s claim, not a price.</p>' +
      '<table><thead><tr>' +
      '<th data-sort="rank">Rank</th><th>Protocol</th><th>Category</th><th>Chains</th>' +
      '<th class="num" data-sort="tvl">TVL</th><th class="num" data-sort="growth">7d</th>' +
      '<th class="num" data-sort="age">Age</th><th class="num" data-sort="implied">Implied value</th>' +
      '</tr></thead><tbody>';
    rows.forEach(function (r) {
      var g = r.change_7d === null ? '' : (r.change_7d >= 0 ? 'pos' : 'neg');
      h += '<tr data-slug="' + esc(r.slug) + '"><td>' + r.rank + '</td>' +
        '<td><b>' + esc(r.name) + '</b>' + (r.watchlist ? '<span class="badge">watchlist</span>' : '') + '</td>' +
        '<td class="cat">' + esc(r.category || '—') + '</td>' +
        '<td class="cat">' + esc(r.chains.slice(0, 3).join(', ')) + (r.chains.length > 3 ? ' +' + (r.chains.length - 3) : '') + '</td>' +
        '<td class="num">' + money(r.tvl_usd) + '</td>' +
        '<td class="num ' + g + '">' + pct(r.change_7d) + '</td>' +
        '<td class="num">' + age(r.age_days) + '</td>' +
        '<td class="num"><b>' + money(r.implied_value_usd) + '</b></td></tr>';
    });
    h += '</tbody></table>' +
      '<div class="note">A protocol is listed here because its record shows no token — never as proof it has none. ' +
      'A wrapped, staked or bridged product of a token that already trades is not a launch waiting to happen. ' +
      'Click any row for its detail view and farm plan.</div>' +
      '<footer>Snapshot ' + esc(R.as_of) + ' &middot; floor $' + (R.floor_usd / 1e6).toFixed(0) + 'M TVL &middot; ' +
      'implied value = TVL &times; category multiple &times; growth &times; maturity (see Method).</footer>';
    return h;
  }

  function detailView(slug) {
    var r = bySlug(slug);
    if (!r) return boardView();
    var m = R.multiples[r.category] !== undefined ? R.multiples[r.category] : R.global_multiple;
    var steps = '';
    var h = header() + tabs() +
      '<button class="back" id="back">&larr; Back to the board</button>' +
      '<section class="detail"><h2>' + esc(r.name) + '</h2>' +
      '<p class="meta">Rank #' + r.rank + ' &middot; ' + esc(r.category || 'uncategorised') + ' &middot; ' +
      esc(r.chains.join(', ')) + ' &middot; tracked since ' + esc(r.listed_at || 'unknown') +
      ' &middot; ' + (r.watchlist ? 'on the watchlist' : 'below the watchlist floor') + '</p>' +
      '<div class="formula"><div class="eq">' + money(r.tvl_usd) + ' &times; ' + m.toFixed(2) +
      ' &times; ' + r.growth_multiplier.toFixed(2) + ' &times; ' + r.maturity_multiplier.toFixed(2) +
      ' = <b>' + money(r.implied_value_usd) + '</b></div>' +
      '<p>Implied value if the protocol issued a token at its category&rsquo;s market multiple, with its ' +
      'own TVL, seven-day growth and age. A claim of this radar, not a price.</p></div>' +
      '<table class="factors"><tbody>' +
      '<tr><td>TVL</td><td>' + money(r.tvl_usd) + '</td></tr>' +
      '<tr><td>Category multiple (' + esc(r.category || 'no category') + ' median mcap/TVL)</td><td>' + m.toFixed(2) + '</td></tr>' +
      '<tr><td>Seven-day TVL change</td><td>' + pct(r.change_7d) + ' &rarr; &times;' + r.growth_multiplier.toFixed(2) + '</td></tr>' +
      '<tr><td>Age without a token</td><td>' + age(r.age_days) + ' &rarr; &times;' + r.maturity_multiplier.toFixed(2) + '</td></tr>' +
      '<tr><td><b>Implied value</b></td><td><b>' + money(r.implied_value_usd) + '</b></td></tr>' +
      '</tbody></table>' +
      '<h3>Farm plan</h3><ol class="steps" id="steps"></ol>' +
      '<div class="note">This protocol&rsquo;s record shows no token. That is not proof it has none, and it is not ' +
      'a promise one is coming. Farm only money you can afford to leave in the position, and claim only ' +
      'from links the protocol itself publishes.</div>' +
      '</section>';
    return h;
  }

  function liveView() {
    var h = header() + tabs() +
      '<p class="count">Protocols whose token already trades, by market cap. They are not ranked here: ' +
      'the market has already priced them, so the board shows the market&rsquo;s own value, not a model&rsquo;s.</p>' +
      '<table><thead><tr><th>Protocol</th><th>Category</th><th>Chains</th>' +
      '<th class="num">TVL</th><th class="num">Market cap</th><th class="num">7d</th></tr></thead><tbody>';
    R.live.forEach(function (p) {
      var g = p.change_7d === null ? '' : (p.change_7d >= 0 ? 'pos' : 'neg');
      h += '<tr><td><b>' + esc(p.name) + '</b></td><td class="cat">' + esc(p.category || '—') + '</td>' +
        '<td class="cat">' + esc(p.chains.slice(0, 3).join(', ')) + '</td>' +
        '<td class="num">' + money(p.tvl_usd) + '</td><td class="num">' + money(p.mcap_usd || 0) + '</td>' +
        '<td class="num ' + g + '">' + pct(p.change_7d) + '</td></tr>';
    });
    return h + '</tbody></table>';
  }

  function methodView() {
    var rows = Object.keys(R.multiples).map(function (k) {
      return '<tr><td>' + esc(k) + '</td><td class="num">' + R.multiples[k].toFixed(2) + '</td></tr>';
    }).join('');
    return header() + tabs() +
      '<section class="method"><h2>How the radar scores</h2>' +
      '<p>Implied value = TVL &times; category multiple &times; growth multiplier &times; maturity multiplier.</p>' +
      '<p><b>Category multiple.</b> For each category, the median market-cap-to-TVL ratio of the token-bearing ' +
      'protocols in that category in this same snapshot (at least three of them), otherwise the median over every ' +
      'token-bearing protocol (' + R.global_multiple.toFixed(2) + '). Clamped to 0.05&ndash;1.00, so no token is ever ' +
      'worth more than the value it secures. A DEX&rsquo;s token trades at a different multiple of its TVL than a ' +
      'lender&rsquo;s or a liquid-staking protocol&rsquo;s, and the snapshot says so. No name is ever special-cased: ' +
      'the same function scores every row.</p>' +
      '<table><thead><tr><th>Category</th><th class="num">Multiple</th></tr></thead><tbody>' + rows +
      '<tr><td>Any other category (global median)</td><td class="num">' + R.global_multiple.toFixed(2) + '</td></tr>' +
      '</tbody></table>' +
      '<p><b>Growth.</b> The seven-day TVL change, clamped to &minus;60%..+120%, moves the value by half its ' +
      'size: a protocol growing 20% in a week scores &times;1.10, one shrinking 20% scores &times;0.90. ' +
      'A missing change counts as 0%.</p>' +
      '<p><b>Maturity.</b> How long the protocol has run with no token: 0.50 for a brand-new listing, rising to ' +
      '1.20 after four years. A protocol that has held billions for years without issuing a token has more ' +
      'built-up value to price than one that appeared last month. Unknown listing date counts as one year.</p>' +
      '<p><b>Coverage.</b> The board ranks every rankable pre-token protocol in the snapshot (' + R.board_size +
      '), the watchlist&rsquo;s ' + R.watchlist_size + ' plus ' + R.early_size + ' below the floor. Rankable means ' +
      'the record shows no token, and the category is a launchable one: not an exchange, a bridge, a ' +
      'liquid-staking or restaking product, or a name ending in a version marker. A wrapped, staked or ' +
      'bridged product of a token that already trades is not a launch waiting to happen. ' +
      'Live-token protocols are kept apart on the Live tab.</p>' +
      '<p><b>Farm plans.</b> Each row&rsquo;s plan is built from its own record — category, chains, TVL tier and age — ' +
      'with concrete capital, gas costs and holding times, never slogans.</p>' +
      '<div class="note">“Records no token” is a statement about the snapshot, not about the world: a protocol ' +
      'on this board may still have a token its record does not carry. Nothing here predicts whether or when a ' +
      'token is issued.</div></section>';
  }

  function render() {
    var hash = location.hash || '';
    var m = hash.match(/^#detail\/(.+)$/);
    var f = hash.match(/^#filter\/(.+)$/);
    if (m) {
      state.tab = 'board';
      root.innerHTML = detailView(decodeURIComponent(m[1]));
      fillSteps(decodeURIComponent(m[1]));
    } else {
      if (f) { state.tab = 'board'; state.cat = decodeURIComponent(f[1]); }
      if (state.tab === 'live') root.innerHTML = liveView();
      else if (state.tab === 'method') root.innerHTML = methodView();
      else root.innerHTML = boardView();
    }
    bind();
  }

  // Farm steps are shipped in data.js, so the detail view never needs a network fetch.
  function fillSteps(slug) {
    var el = document.getElementById('steps');
    if (!el) return;
    var steps = R.steps && R.steps[slug];
    el.innerHTML = steps
      ? steps.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('')
      : '<li>Farm plan not found for this protocol.</li>';
  }

  function bind() {
    root.querySelectorAll('[data-tab]').forEach(function (b) {
      b.addEventListener('click', function () {
        state.tab = b.getAttribute('data-tab');
        if (location.hash) history.replaceState(null, '', location.pathname);
        render();
      });
    });
    var q = document.getElementById('q');
    if (q) q.addEventListener('input', function () { state.q = q.value; render(); var nq = document.getElementById('q'); if (nq) { nq.focus(); nq.setSelectionRange(nq.value.length, nq.value.length); } });
    var cat = document.getElementById('cat');
    if (cat) cat.addEventListener('change', function () { state.cat = cat.value; render(); });
    var chain = document.getElementById('chain');
    if (chain) chain.addEventListener('change', function () { state.chain = chain.value; render(); });
    var minTvl = document.getElementById('minTvl');
    if (minTvl) minTvl.addEventListener('change', function () { state.minTvl = Number(minTvl.value); render(); });
    var wl = document.getElementById('wl');
    if (wl) wl.addEventListener('change', function () { state.wl = wl.checked; render(); });
    root.querySelectorAll('th[data-sort]').forEach(function (th) {
      th.addEventListener('click', function () {
        var k = th.getAttribute('data-sort');
        if (state.sort === k) state.dir = -state.dir;
        else { state.sort = k; state.dir = k === 'rank' ? 1 : -1; }
        render();
      });
    });
    root.querySelectorAll('tbody tr[data-slug]').forEach(function (tr) {
      tr.addEventListener('click', function () { location.hash = '#detail/' + tr.getAttribute('data-slug'); });
    });
    var back = document.getElementById('back');
    if (back) back.addEventListener('click', function () { location.hash = ''; render(); });
  }

  window.addEventListener('hashchange', render);
  render();
})();
