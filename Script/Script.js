// ======================= Format Fungsuin ======================= //
// Fungsi untuk format angka jadi $xxx,xxx.xx
function formatUSD(value) {
    return `$${value.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
}

// Format persentase gaya Indonesia / Eropa
function formatPercent(value) {
    return value.toLocaleString('id-ID', {minimumFractionDigits: 2, maximumFractionDigits: 2}) + "%";
}

// --- Format Currency (dengan tanda + / - dan dua desimal) ---
function formatCurrency(n) {
  const v = Number(n) || 0;
  const sign = v >= 0 ? '+' : '-';
  return sign + '$' + Math.abs(v).toFixed(2);
}

// --- Format Currency Compact (auto K, M, B) ---
function formatCurrencyCompact(n) {
  const v = Number(n) || 0;
  const sign = v < 0 ? '-' : '';
  const abs = Math.abs(v);

  if (abs >= 1_000_000_000) return sign + '$' + (abs / 1_000_000_000).toFixed(2) + 'B';
  if (abs >= 1_000_000) return sign + '$' + (abs / 1_000_000).toFixed(2) + 'M';
  if (abs >= 1_000) return sign + '$' + (abs / 1_000).toFixed(1) + 'K';
  return sign + '$' + abs.toFixed(2);
}

// ======================= Main Section Button Navbar ======================= //
document.addEventListener("DOMContentLoaded", () => {
  const menus = document.querySelectorAll(".box-menu-in");
  const jurnalingSection = document.querySelector(".jurnaling");
  const statsSection = document.querySelector(".statistic");
  const settingSection = document.querySelector(".setting");

  jurnalingSection.style.display = "block";
  statsSection.style.display = "none";
  if (settingSection) settingSection.style.display = "none";

  menus.forEach((menu) => {
    menu.addEventListener("click", () => {
      menus.forEach((m) => m.classList.remove("active"));
      menu.classList.add("active");

      const menuName = menu.querySelector("span").textContent.trim().toLowerCase();

      jurnalingSection.style.display = "none";
      statsSection.style.display = "none";
      if (settingSection) settingSection.style.display = "none";

      if (menuName === "jurnaling") {
        jurnalingSection.style.display = "block";
      } else if (menuName === "stats") {
        statsSection.style.display = "flex";
        setTimeout(() => {
          resizeBalanceCanvas();
          if (balanceCurrentData.length > 0) {
            drawBalanceChart();
          } else {
            loadTradeHistory().then(() => {
              filterData('all');
            });
          }
        }, 0);
      } else if (menuName === "setting") {
        if (settingSection) {
          settingSection.style.display = "block";
        } else {
          console.warn("⚠️ Section .setting belum ada di HTML.");
        }
      }
    });
  });
});

// ======================= Render Trading Jurnal ======================= //
async function loadTradingData() {
  try {
    const data = await getDB();
    renderTradingTable(data);
  } catch (error) {
    console.error("Gagal load data trading:", error);
  }
}

function updateDashboardFromTrades(data = []) {
  if (!Array.isArray(data) || data.length === 0) return;

  // --- helpers ---
  const parsePnl = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  const normalizePair = (p) => {
    if (!p) return '';
    return String(p).replace(/\.?USDT\.P$/i, '').trim();
  };

  const pad = (n) => (n < 10 ? '0' + n : n);
  const formatDateDDMMYYYY = (d) => {
    const dt = new Date(d);
    if (Number.isNaN(dt.getTime())) return '-';
    return `${pad(dt.getDate())}-${pad(dt.getMonth()+1)}-${dt.getFullYear()}`;
  };

  // --- get DOM elements ---
  const elStatsNavReversal = document.getElementById('statsNavReversal');
  const elStatsNavContinuation = document.getElementById('statsNavContinuation');

  const elPairsBestPerformer = document.getElementById('pairsBestPerformer');
  const elDateBestPerformer = document.getElementById('dateBestPerformer');
  const elValueBestPerformer = document.getElementById('valueBestPerformer');
  const elPersentaseBestPerformer = document.getElementById('persentaseBestPerformer');

  const elHighestPairs = document.getElementById('highestPairs');
  const elValuehighestPairs = document.getElementById('valuehighestPairs');

  const elMostpairs = document.getElementById('mostpairs');
  const elTotalMostTraded = document.getElementById('totalMostTraded');

  const elProfitability = document.getElementById('profitability');
  const elTotalProfitabilty = document.getElementById('totalProfitabilty');
  const elAvgPnlPerday = document.getElementById('avgPnlPerday');

  // --- Behavior: Reversal vs Continuation ---
  let reversalCount = 0, continuCount = 0;
  data.forEach(t => {
    const b = (t.Behavior || t.behavior || '').toString().toLowerCase();
    if (b.includes('reversal')) reversalCount++;
    else if (b.includes('continuation')) continuCount++;
  });
  const totalBeh = reversalCount + continuCount;
  if (totalBeh > 0) {
    const revPct = Math.round((reversalCount / totalBeh) * 100);
    const conPct = 100 - revPct;
    if (elStatsNavReversal) elStatsNavReversal.textContent = `${revPct}% Reversal`;
    if (elStatsNavContinuation) elStatsNavContinuation.textContent = `${conPct}% Continuation`;
  } else {
    if (elStatsNavReversal) elStatsNavReversal.textContent = '-';
    if (elStatsNavContinuation) elStatsNavContinuation.textContent = '-';
  }

  // --- Best performer (highest PnL) + percentage vs previous sum ---
  let bestIndex = -1, bestPnl = -Infinity;
  for (let i = 0; i < data.length; i++) {
    const pnl = parsePnl(data[i].Pnl);
    if (pnl > bestPnl) {
      bestPnl = pnl;
      bestIndex = i;
    }
  }

  if (bestIndex >= 0) {
    const best = data[bestIndex];
    const normPair = normalizePair(best.Pairs || best.pairs);
    if (elPairsBestPerformer) elPairsBestPerformer.textContent = normPair || '-';
    if (elDateBestPerformer) elDateBestPerformer.textContent = formatDateDDMMYYYY(best.date || best.Date || best.dateString);
    if (elValueBestPerformer) elValueBestPerformer.textContent = formatUSD(bestPnl);

    // sum pnl before this index
    const prevSum = data.slice(0, bestIndex).reduce((s, t) => s + parsePnl(t.Pnl), 0);
    if (prevSum > 0) {
      const pct = (bestPnl / prevSum) * 100;
      if (elPersentaseBestPerformer) elPersentaseBestPerformer.textContent = formatPercent(pct);
    } else {
      if (elPersentaseBestPerformer) elPersentaseBestPerformer.textContent = 'N/A';
    }
  } else {
    if (elPairsBestPerformer) elPairsBestPerformer.textContent = '-';
    if (elDateBestPerformer) elDateBestPerformer.textContent = '-';
    if (elValueBestPerformer) elValueBestPerformer.textContent = '-';
    if (elPersentaseBestPerformer) elPersentaseBestPerformer.textContent = '-';
  }

  // --- Pair aggregations (counts & PnL sums) ---
  const countMap = {};
  const pnlMap = {};
  data.forEach(t => {
    const pairRaw = t.Pairs || t.pairs || '';
    const p = normalizePair(pairRaw);
    if (!p) return;
    countMap[p] = (countMap[p] || 0) + 1;
    pnlMap[p] = (pnlMap[p] || 0) + parsePnl(t.Pnl);
  });

  // highestPairs = top by total PnL
  let topByPnl = null, topByPnlValue = 0;
  for (const p in pnlMap) {
    if (pnlMap[p] > topByPnlValue || topByPnl === null) {
      topByPnl = p;
      topByPnlValue = pnlMap[p];
    }
  }
  if (elHighestPairs) elHighestPairs.textContent = topByPnl || '-';
  if (elValuehighestPairs) elValuehighestPairs.textContent = topByPnl ? formatCurrencyCompact(topByPnlValue) : '-';

  // mostpairs = top by count
  let topByCount = null, topCount = 0;
  for (const p in countMap) {
    if (countMap[p] > topCount || topByCount === null) {
      topByCount = p;
      topCount = countMap[p];
    }
  }
  if (elMostpairs) elMostpairs.textContent = topByCount || '-';
  if (elTotalMostTraded) elTotalMostTraded.textContent = topCount ? `${topCount} Trades` : '0 Trades';

  // --- Profitability (winrate) ---
  let win = 0, lose = 0;
  data.forEach(t => {
    const r = (t.Result || t.result || '').toString().toLowerCase();
    if (r === 'win' || r === 'profit') win++;
    else if (r === 'lose' || r === 'loss') lose++;
  });
  const denom = win + lose;
  if (denom > 0) {
    const wr = (win / denom) * 100;
    if (elProfitability) elProfitability.textContent = `${wr.toFixed(2)}%`;
    if (elTotalProfitabilty) elTotalProfitabilty.textContent = `${win} of ${denom} Profite Trade`;
  } else {
    if (elProfitability) elProfitability.textContent = '-';
    if (elTotalProfitabilty) elTotalProfitabilty.textContent = `0 of 0 Profite Trade`;
  }

  // --- Avg daily PnL (based on positive daily totals) ---
  const dailyWins = {};
  data.forEach(t => {
    const pnl = parsePnl(t.Pnl);
    if (pnl <= 0) return;
    const d = new Date(t.date);
    if (Number.isNaN(d.getTime())) return;
    const key = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
    dailyWins[key] = (dailyWins[key] || 0) + pnl;
  });

  const days = Object.keys(dailyWins).length;
  const totalDailyWins = Object.values(dailyWins).reduce((s, v) => s + v, 0);
  const avgDaily = days > 0 ? (totalDailyWins / days) : 0;

  if (elAvgPnlPerday) elAvgPnlPerday.textContent = `Avg Daily PnL: ${formatCurrencyCompact(avgDaily)}`;
}

function renderTradingTable(data) {
  const tbody = document.querySelector(".tabel-trade tbody");
  tbody.innerHTML = "";

  data.forEach((trade, index) => {
    const date = new Date(trade.date);
    const formattedDate = date.toLocaleDateString("id-ID");

    const rr = Number(trade.RR);
    const margin = Number(trade.Margin) || 0;
    const pnl = Number(trade.Pnl) || 0;

    // ====== CLASS DYNAMIC RULES ======
    // RR
    let rrClass = "rr-null";
    if (rr > 0) rrClass = "rr-win";
    else if (rr < 0) rrClass = "rr-lose";

    // Psychology
    const psyClass = (trade.Psychology || "confident").toLowerCase();

    // Pos (SHORT / LONG)
    const posClass = (trade.Pairs?.includes("BTC") ? "short" : "long");

    // Result (WIN / LOSE / MISSED / PROFIT)
    let resultClass = "result-lose";
    const resultValue = trade.Result?.toLowerCase();

    if (resultValue === "win" || resultValue === "profit") resultClass = "result-win";
    else if (resultValue === "missed") resultClass = "result-missed";

    // PnL
    let pnlClass = "pnl-null";
    if (pnl > 0) pnlClass = "pnl-win";
    else if (pnl < 0) pnlClass = "pnl-loss";

    // ====== ROW TEMPLATE ======
    const row = document.createElement("tr");
    row.innerHTML = `
      <td><p class="no">${index + 1}</p></td>
      <td><p class="date">${formattedDate}</p></td>
      <td><p class="pairs">${trade.Pairs}</p></td>
      <td><p class="method">${trade.Method}</p></td>
      <td><p class="confluance">${trade.Confluance.Entry} - ${trade.Confluance.TimeFrame}</p></td>
      <td><p class="${rrClass}">${isNaN(rr) ? "-" : rr}</p></td>
      <td><p class="behavior">${trade.Behavior}</p></td>
      <td>
        <div class="box-causes" id="box-causes">
          <svg class="icon-causes" xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="#e3e3e3">
            <path d="M240-384h480v-72H240v72Zm0-132h480v-72H240v72Zm0-132h480v-72H240v72ZM864-96 720-240H168q-29.7 0-50.85-21.15Q96-282.3 96-312v-480q0-29.7 21.15-50.85Q138.3-864 168-864h624q29.7 0 50.85 21.15Q864-821.7 864-792v696ZM168-312h582l42 42v-522H168v480Zm0 0v-480 480Z"/>
          </svg>
        </div>
      </td>
      <td><p class="${psyClass}">${trade.Psychology}</p></td>
      <td><p class="class">${trade.Class}</p></td>
      <td>
        <div class="box-causes" id="box-files" data-bias="${trade.Files?.Bias || '#'}" data-last="${trade.Files?.Last || '#'}">
          <svg class="icon-causes" xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="#e3e3e3">
            <path d="M264-240h432L557-426q-2-1-3.69-1.6-1.69-.6-3.31-1.4L444-288l-72-96-108 144ZM216-96q-29.7 0-50.85-21.15Q144-138.3 144-168v-528q0-29.7 21.15-50.85Q186.3-768 216-768h192v72H216v528h528v-231l72 72v159q0 29.7-21.15 50.85Q773.7-96 744-96H216Zm264-336Zm381 48L738-507q-20 13-42.55 20-22.55 7-47.92 7Q578-480 529-529t-49-119q0-70 49-119t119-49q70 0 119 48.95t49 118.88q0 25.17-7 47.67T789-558l123 123-51 51ZM647.77-552Q688-552 716-579.77q28-27.78 28-68Q744-688 716.23-716q-27.78-28-68-28Q608-744 580-716.23q-28 27.78-28 68Q552-608 579.77-580q27.78 28 68 28Z"/>
          </svg>
        </div>
      </td>
      <td><p class="${posClass}">${posClass.toUpperCase()}</p></td>
      <td><p class="margin">$${margin.toFixed(2)}</p></td>
      <td><p class="${resultClass}">${trade.Result}</p></td>
      <td><p class="${pnlClass}">${pnl === 0 ? "$0.00" : (pnl > 0 ? "+" : "-") + "$" + Math.abs(pnl).toFixed(2)}</p></td>
    `;

    // Causes
    row.querySelector("#box-causes").dataset.content = trade.Causes || "No causes";

    // Files
    const boxFiles = row.querySelector("#box-files");
    boxFiles.dataset.bias = trade.Files?.Bias || "#";
    boxFiles.dataset.last = trade.Files?.Last || "#";


    tbody.appendChild(row);
  });

  // re-init tooltip
  setTimeout(() => {
    if (window.tooltipManager) window.tooltipManager.destroy();
    window.tooltipManager = new TooltipManager();
  }, 100);

  updateDashboardFromTrades(data);
}

let currentSort = { key: null, direction: null };
let globalTrades = [];
let originalTrades = [];

async function loadTradingData() {
  const data = await getDB();

  globalTrades = data;
  originalTrades = [...data];

  renderTradingTable(globalTrades);
  initSorting();
}


function initSorting() {
  const headers = document.querySelectorAll("th.sortable");
  headers.forEach(th => {
    th.addEventListener("click", () => {
      const key = th.dataset.key;

      // === toggle mode ===
      if (currentSort.key !== key) {
        currentSort = { key, direction: "asc" };
      } else if (currentSort.direction === "asc") {
        currentSort.direction = "desc";
      } else {
        currentSort = { key: null, direction: null }; // reset ke default
      }

      // === tentuin data yang dipake ===
      let sortedData = [];
      if (!currentSort.key) {
        sortedData = [...originalTrades];
      } else {
        sortedData = [...globalTrades].sort((a, b) =>
          sortTrades(a, b, currentSort.key, currentSort.direction)
        );
      }

      renderTradingTable(sortedData);
      updateSortIcons();
    });
  });
}

function sortTrades(a, b, key, direction) {
  const dir = direction === "asc" ? 1 : -1;

  switch (key) {
    case "date": {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return (dateA - dateB) * dir;
    }
    case "pairs":
    case "method":
    case "behavior":
    case "psychology":
    case "class":
    case "pos":
    case "result": {
      const valA = (a[key.charAt(0).toUpperCase() + key.slice(1)] || "").toString();
      const valB = (b[key.charAt(0).toUpperCase() + key.slice(1)] || "").toString();
      return valA.localeCompare(valB) * dir;
    }
    case "rr": {
      return (Number(a.RR) - Number(b.RR)) * dir;
    }
    case "margin": {
      const mA = Number(a.Margin) || 0;
      const mB = Number(b.Margin) || 0;
      return (mA - mB) * dir;
    }
    case "pnl": {
      const pA = Number(a.Pnl) || 0;
      const pB = Number(b.Pnl) || 0;
      // Prioritas: minus dulu → 0 → plus
      if (direction === "asc") {
        return (pA - pB);
      } else {
        return (pB - pA);
      }
    }
    default:
      return 0;
  }
}

function updateSortIcons() {
  document.querySelectorAll("th.sortable").forEach(th => {
    const iconSpan = th.querySelector(".sort-icon");
    iconSpan.innerHTML = "";

    if (th.dataset.key === currentSort.key && currentSort.direction) {
      iconSpan.innerHTML = getSortIcon(th.dataset.key, currentSort.direction);
    }
  });
}

// === custom icon handler ===
function getSortIcon(key, direction) {
  if (key === "date") {
    return direction === "desc"
      ? `<svg xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 -960 960 960" width="16px" fill="rgb(52, 211, 153)"><path d="M360-216q-110 0-187-77T96-480q0-110 77-187t187-77q110 0 187 77t77 187q0 110-77 187t-187 77Zm372 24v-437l-33 33-51-51 120-120 119 119-50 52-33-33v437h-72Zm-372.21-96Q440-288 496-343.79q56-55.8 56-136Q552-560 496.21-616q-55.8-56-136-56Q280-672 224-616.21q-56 55.8-56 136Q168-400 223.79-344q55.8 56 136 56ZM420-372l51-51-75-75v-126h-72v156l96 96Zm-60-108Z"/></svg>`
      : `<svg xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 -960 960 960" width="16px" fill="rgb(251, 113, 133)"><path d="M360-216q-110 0-187-77T96-480q0-110 77-187t187-77q110 0 187 77t77 187q0 110-77 187t-187 77Zm407 24L648-311l50-52 33 34v-438h72v437l33-33 51 51-120 120Zm-407.21-96Q440-288 496-343.79q56-55.8 56-136Q552-560 496.21-616q-55.8-56-136-56Q280-672 224-616.21q-56 55.8-56 136Q168-400 223.79-344q55.8 56 136 56ZM420-372l51-51-75-75v-126h-72v156l96 96Zm-60-108Z"/></svg>`;
  }

  if (["pairs", "method", "behavior", "psychology", "class", "pos", "result"].includes(key)) {
    return direction === "asc"
      ? `<svg xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 -960 960 960" width="16px" fill="rgb(52, 211, 153)"><path d="m96-288 144.28-384H323l144 384h-80l-32.37-92H208l-32 92H96Zm135-158h100l-48-143h-4l-48 143Zm304 158v-73l195-242H544v-69h270v73L621-357h195v69H535ZM360-744l120-120 120 120H360ZM480-96 360-216h240L480-96Z"/></svg>`
      : `<svg xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 -960 960 960" width="16px" fill="rgb(251, 113, 133)"><path d="m96-288 144.28-384H323l144 384h-80l-32.37-92H208l-32 92H96Zm135-158h100l-48-143h-4l-48 143Zm304 158v-73l195-242H544v-69h270v73L621-357h195v69H535ZM360-744l120-120 120 120H360ZM480-96 360-216h240L480-96Z"/></svg>`;
  }

  if (key === "rr" || key === "margin" || key === "pnl") {
    return direction === "asc"
      ? `<svg xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 -960 960 960" width="16px" fill="rgb(52, 211, 153)"><path d="M444-240v-294L339-429l-51-51 192-192 192 192-51 51-105-105v294h-72Z"/></svg>`
      : `<svg xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 -960 960 960" width="16px" fill="rgb(251, 113, 133)"><path d="M480-288 288-480l51-51 105 105v-294h72v294l105-105 51 51-192 192Z"/></svg>`;
  }

  return "";
}

document.addEventListener("DOMContentLoaded", loadTradingData);

// ======================= Trading Jurnal Tooltip ======================= //
class TooltipManager {
  constructor() {
    this.tooltip = document.getElementById('tooltip-box');
    this.tooltipContent = document.getElementById('tooltip-content');
    this.hideTimeout = null;
    this.showTimeout = null;
    this.isVisible = false;
    this.currentTarget = null;
    
    // Data isi tooltip
    this.tooltipData = {
      "box-causes": {
        title: "Causes",
        content: `<div class="tooltip-text">ini adalah box untuk kasus kamu saat mengambil trade</div>`
      },
      "box-files": {
        title: "Files",
        content: `
          <div class="tooltip-imgs">
            <img src="https://blackbull.com/wp-content/uploads/2023/08/2021-12-10_13-53-50-FAQ5.-B-1024x500.png" alt="Preview 1">
            <img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSW_6LEhgel1nyJ7cqL2mCcuqOB9Mctv0BAYH_CTVg_M1yj9oCZxLfdarVmkwvRGYsZ3Bw&usqp=CAU" alt="Preview 2">
          </div>
          <a href="#" class="tooltip-link">Buka file lengkap →</a>
        `
      }
    };

    this.init();
  }

  init() {
    this.bindEvents();
  }

  bindEvents() {
    // Clean up existing event listeners first
    this.cleanupEvents();
    
    // Event untuk elemen tooltip
    document.querySelectorAll('.box-causes').forEach(el => {
      el.addEventListener('mouseenter', (e) => this.handleMouseEnter(e));
      el.addEventListener('mouseleave', () => this.handleMouseLeave());
      el.addEventListener('click', (e) => e.preventDefault());
    });

    // Event untuk tooltip itu sendiri
    this.tooltip.addEventListener('mouseenter', () => this.clearHideTimeout());
    this.tooltip.addEventListener('mouseleave', () => this.scheduleHideTooltip());

    // Global events
    document.addEventListener('keydown', (e) => this.handleKeydown(e));
    window.addEventListener('scroll', () => this.handleScroll(), { passive: true });
    window.addEventListener('resize', () => this.handleResize(), { passive: true });
  }

  cleanupEvents() {
    // Remove existing event listeners to prevent duplicates
    document.querySelectorAll('.box-causes').forEach(el => {
      const newEl = el.cloneNode(true);
      el.parentNode.replaceChild(newEl, el);
    });
  }

  handleMouseEnter(event) {
    this.currentTarget = event.currentTarget;
    this.clearAllTimeouts();
    
    // Show tooltip immediately for better responsiveness
    this.showTimeout = setTimeout(() => {
      this.showTooltip(event);
    }, 30);
  }

  handleMouseLeave() {
    this.clearAllTimeouts();
    this.scheduleHideTooltip();
  }

  showTooltip(event) {
    if (!this.currentTarget) return;

    let content = "";
    let title = "";

    if (this.currentTarget.id === "box-causes") {
      title = "Causes";
      content = `<div class="tooltip-text">${this.currentTarget.dataset.content || "No causes"}</div>`;
    } else if (this.currentTarget.id === "box-files") {
      title = "Files";
      const bias = this.currentTarget.dataset.bias || "#";
      const last = this.currentTarget.dataset.last || "#";
      content = `
        <div class="tooltip-imgs">
          <a href="${bias}" target="_blank">Bias Preview →</a><br>
          <a href="${last}" target="_blank">Last Preview →</a>
        </div>
      `;
    } else {
      // fallback ke tooltipData default kalau perlu
      const data = this.tooltipData[this.currentTarget.id];
      if (data) {
        title = data.title;
        content = data.content;
      }
    }

    // Update tooltip
    this.tooltipContent.innerHTML = `<div class="tooltip-title">${title}</div>${content}`;
    this.tooltip.classList.remove('hidden');
    this.tooltip.classList.add('show');

    requestAnimationFrame(() => {
      this.positionTooltip(this.currentTarget);
    });
  }


  positionTooltip(targetElement) {
    const rect = targetElement.getBoundingClientRect();
    const tooltipRect = this.tooltip.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

    // Horizontal positioning (centered)
    const centerX = rect.left + rect.width / 2;
    let left = centerX - tooltipRect.width / 2;
    
    // Boundary collision detection
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const margin = 10;
    
    // Handle left boundary
    if (left < margin) left = margin;
    
    // Handle right boundary
    if (left + tooltipRect.width > viewportWidth - margin) {
      left = viewportWidth - tooltipRect.width - margin;
    }

    // Vertical positioning - place above element dengan gap
    const gap = 8;
    let top = rect.top - tooltipRect.height - gap;

    // Jika tidak cukup space di atas, tampilkan di bawah
    if (top < margin) {
      top = rect.bottom + gap;
    }

    // Handle bottom boundary
    if (top + tooltipRect.height > viewportHeight - margin) {
      top = viewportHeight - tooltipRect.height - margin;
    }

    this.tooltip.style.left = `${left + scrollLeft}px`;
    this.tooltip.style.top = `${top + scrollTop}px`;
  }

  scheduleHideTooltip() {
    this.clearHideTimeout();
    this.hideTimeout = setTimeout(() => {
      this.hideTooltip();
    }, 150);
  }

  hideTooltip() {
    if (!this.isVisible) return;

    this.tooltip.classList.remove('show');
    
    setTimeout(() => {
      if (!this.tooltip.classList.contains('show')) {
        this.tooltip.classList.add('hidden');
        this.isVisible = false;
        this.currentTarget = null;
        this.tooltipContent.innerHTML = '';
      }
    }, 200);
  }

  clearHideTimeout() {
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
      this.hideTimeout = null;
    }
  }

  clearShowTimeout() {
    if (this.showTimeout) {
      clearTimeout(this.showTimeout);
      this.showTimeout = null;
    }
  }

  clearAllTimeouts() {
    this.clearHideTimeout();
    this.clearShowTimeout();
  }

  handleKeydown(event) {
    if (event.key === 'Escape' && this.tooltip.classList.contains('show')) {
      this.hideTooltip();
    }
  }

  handleScroll() {
    if (this.tooltip.classList.contains('show') && this.currentTarget) {
      requestAnimationFrame(() => {
        this.positionTooltip(this.currentTarget);
      });
    }
  }

  handleResize() {
    if (this.tooltip.classList.contains('show')) {
      this.hideTooltip();
    }
  }

  get isVisible() {
    return this.tooltip.classList.contains('show');
  }

  set isVisible(value) {
  }

  destroy() {
    this.clearAllTimeouts();
    document.querySelectorAll('.box-causes').forEach(el => {
      const newEl = el.cloneNode(true);
      el.parentNode.replaceChild(newEl, el);
    });
    
    document.removeEventListener('keydown', this.handleKeydown);
    window.removeEventListener('scroll', this.handleScroll);
    window.removeEventListener('resize', this.handleResize);
  }
}

let tooltipManager;

function initTooltip() {
  if (tooltipManager) {
    tooltipManager.destroy();
  }
  tooltipManager = new TooltipManager();
  return tooltipManager;
}

// Auto initialize dengan error handling
document.addEventListener('DOMContentLoaded', () => {
  try {
    window.tooltipManager = initTooltip();
    console.log('Tooltip manager initialized successfully');
  } catch (error) {
    console.error('Failed to initialize tooltip manager:', error);
  }
});

if (document.readyState !== 'loading') {
  setTimeout(() => {
    window.tooltipManager = initTooltip();
  }, 100);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TooltipManager, initTooltip };
}

// =================== DASHBOARD EQUITY STATS ===================
async function updateEquityStats() {
  try {
    // --- Ambil data trading untuk total PnL ---
    const tradingData = await getDB();
    const totalPnl = Array.isArray(tradingData)
      ? tradingData.reduce((sum, t) => sum + (Number(t.Pnl) || 0), 0)
      : 0;

    // --- Ambil data Deposit & Withdraw ---
    const statsRes = await fetch("Html/stats.json");
    const statsData = await statsRes.json();
    const deposit = statsData?.[0]?.Deposit || 0;
    const withdraw = statsData?.[0]?.Withdraw || 0;

    // --- Hitung hasil utama ---
    const totalEquity = deposit + totalPnl;
    const persentaseWithdraw =
      deposit > 0 ? ((withdraw / deposit) * 100).toFixed(2) : 0;

    // --- Format number (biar rapi) ---
    const formatCurrency = (n) => {
      const v = Number(n) || 0;
      const sign = v < 0 ? "-" : "";
      const abs = Math.abs(v);
      return sign + "$" + abs.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    // --- Update ke DOM ---
    const elTotalEquity = document.getElementById("totalEquity");
    const elTotalPerp = document.getElementById("total-perp");
    const elPersentaseWithdraw = document.getElementById("persentaseWithdraw");
    const elValueWithdraw = document.getElementById("valueWithdraw");
    const elValueDeposit = document.getElementById("valueDeposit");

    if (elTotalEquity) elTotalEquity.textContent = formatCurrency(totalEquity);
    if (elTotalPerp) elTotalPerp.textContent = formatCurrency(totalPnl);
    if (elPersentaseWithdraw) elPersentaseWithdraw.textContent = `${persentaseWithdraw}%`;
    if (elValueWithdraw) elValueWithdraw.textContent = formatCurrency(withdraw);
    if (elValueDeposit) elValueDeposit.textContent = formatCurrency(deposit);

    console.log("[Equity Stats Updated]", {
      totalEquity,
      totalPnl,
      deposit,
      withdraw,
      persentaseWithdraw,
    });
  } catch (error) {
    console.error("Gagal update equity stats:", error);
  }
}

document.addEventListener("DOMContentLoaded", updateEquityStats);

// ======================= Stats Content 1 ======================= //
async function loadJSON(path) {
    const response = await fetch(path);
    if (!response.ok) throw new Error(`Failed to load ${path}`);
    return await response.json();
}

// Fungsi utama untuk update stats
async function updateStats() {
    const trades = await getDB();
    const stats = await loadJSON("Html/stats.json");
    const deposit = stats[0].Deposit;

    // Total PnL
    const totalPnL = trades.reduce((sum, t) => sum + t.Pnl, 0);
    document.getElementById("totalProfite").textContent = formatUSD(totalPnL);

    // Persentase Increase dari deposit
    const persentaseIncrease = (totalPnL / deposit) * 100;
    document.getElementById("persentaseIncrease").textContent = formatPercent(persentaseIncrease);

    // Total Value Win / Loss
    const totalWin = trades.filter(t => t.Result.toLowerCase() === "profit").reduce((sum, t) => sum + t.Pnl, 0);
    const totalLoss = trades.filter(t => t.Result.toLowerCase() === "loss").reduce((sum, t) => sum + t.Pnl, 0);

    document.getElementById("totalValueWin").textContent = "+" + formatUSD(totalWin);
    document.getElementById("totalValueLoss").textContent = "-" + formatUSD(Math.abs(totalLoss));

    // Persentase Win / Loss
    const totalAbs = totalWin + Math.abs(totalLoss);
    const winPercent = ((totalWin / totalAbs) * 100).toFixed(2);
    const lossPercent = ((Math.abs(totalLoss) / totalAbs) * 100).toFixed(2);

    document.getElementById("persentaseValueWin").textContent = winPercent + "%";
    document.getElementById("persentaseValueLoss").textContent = lossPercent + "%";

    // Update progress bar
    const progressEl = document.getElementById("progressHighlight");
    progressEl.style.setProperty("--win-percent", winPercent + "%");

    // Wost Trade
    let maxDropPercent = 0;
    let maxDropValue = 0;
    let runningBalance = deposit;
    let currentDrop = 0;
    let balanceBeforeStreak = deposit;

    for (let i = 0; i < trades.length; i++) {
        const t = trades[i];

        if (t.Pnl == null) continue;

        if (t.Result.toLowerCase() === "loss") {
            if (currentDrop === 0) balanceBeforeStreak = runningBalance;
            currentDrop += Math.abs(t.Pnl);
        }

        runningBalance += t.Pnl; 

        if (t.Result.toLowerCase() !== "loss" && currentDrop > 0) {
            const dropPercent = (currentDrop / balanceBeforeStreak) * 100;
            if (dropPercent > maxDropPercent) {
                maxDropPercent = dropPercent;
                maxDropValue = currentDrop;
            }
            currentDrop = 0;
        }
    }

    if (currentDrop > 0) {
        const dropPercent = (currentDrop / balanceBeforeStreak) * 100;
        if (dropPercent > maxDropPercent) {
            maxDropPercent = dropPercent;
            maxDropValue = currentDrop;
        }
    }

    const displayWidth = Math.min(Math.max(maxDropPercent, 35), 100);

    const dropBox = document.querySelector(".bx-usd");
    if (dropBox) {
        dropBox.style.width = displayWidth + "%";
    }

    document.getElementById("worstTrade").textContent = "-" + maxDropPercent.toFixed(2) + "%";
    document.getElementById("valueWorstTrade").textContent = "-" + formatUSD(maxDropValue);

    // ATH Balance
    let balance = deposit;
    let athBalance = balance;
    trades.forEach(t => {
        balance += t.Pnl;
        if (balance > athBalance) athBalance = balance;
    });
    document.getElementById("valueAthBalance").textContent = formatUSD(athBalance);
    const athPercent = ((athBalance - deposit) / deposit) * 100;
    document.getElementById("persentaseAthBalance").textContent = formatPercent(athPercent) + " ROE";
}

updateStats().catch(console.error);

// ======================= Stats Content 2 ======================= //
async function updateTradingStats() {
    try {
        const rawData = await getDB();
        if (!Array.isArray(rawData)) throw new Error('Expected JSON array');

        const trades = rawData
            .filter(item => typeof item.date === 'number' && !isNaN(item.date))
            .map(item => ({
                date: new Date(item.date),
                pnl: item.Pnl,
                rr: item.RR,
                result: item.Result
            }))
            .sort((a, b) => a.date - b.date);

        // Ambil hanya trade dengan PnL (abaikan Missed / null)
        const validTrades = trades.filter(t => t.pnl !== null && t.pnl !== undefined);

        // === 1. Profit & Loss Trades ===
        const profitTrades = validTrades.filter(t => t.pnl > 0);
        const lossTrades = validTrades.filter(t => t.pnl < 0);

        // averageProfit: rata-rata PnL profit
        const avgProfit = profitTrades.length
            ? parseFloat((profitTrades.reduce((sum, t) => sum + t.pnl, 0) / profitTrades.length).toFixed(2))
            : 0;

        // averageLoss: rata-rata PnL loss (positif)
        const avgLoss = lossTrades.length
            ? parseFloat((Math.abs(lossTrades.reduce((sum, t) => sum + t.pnl, 0)) / lossTrades.length).toFixed(2))
            : 0;

        // === 2. averageRR: rata-rata RR hanya dari trade PROFIT ===
        const rrProfitTrades = profitTrades.filter(t => typeof t.rr === 'number');
        const avgRR = rrProfitTrades.length
            ? parseFloat((rrProfitTrades.reduce((sum, t) => sum + t.rr, 0) / rrProfitTrades.length).toFixed(2))
            : 0;

        // === 3. Streak: maksimal beruntun ===
        const maxProfitStreak = calculateMaxStreak(validTrades, 'Profit');
        const maxLossStreak = calculateMaxStreak(validTrades, 'Loss');

        // === Update DOM ===
        document.getElementById('averageProfite').textContent = formatUSD(avgProfit);
        document.getElementById('averageLoss').textContent = '-' + formatUSD(avgLoss);
        document.getElementById('averageRR').textContent = avgRR;
        document.getElementById('averageProfiteStreak').textContent = '≈ ' + maxProfitStreak;
        document.getElementById('averageLossStreak').textContent = '≈ ' + maxLossStreak;

    } catch (err) {
        console.error('Gagal memuat statistik trading:', err);
        const ids = ['averageProfite', 'averageLoss', 'averageRR', 'averageProfiteStreak', 'averageLossStreak'];
        ids.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = '–';
        });
    }
}

function calculateMaxStreak(trades, targetType) {
    let maxStreak = 0;
    let currentStreak = 0;

    for (const trade of trades) {
        if (trade.result === targetType) {
            currentStreak++;
            if (currentStreak > maxStreak) maxStreak = currentStreak;
        } else if (trade.result === 'Loss' || trade.result === 'Profit') {
            currentStreak = 0;
        }
    }

    return maxStreak;
}

updateTradingStats();

// ======================= Stats Content 3 ======================= //
getDB()
.then(data => {
  if (!Array.isArray(data)) {
    console.error('Data harus berupa array');
    return;
  }

  let profit = 0;
  let loss = 0;
  let missed = 0;
  let breakEven = 0;

  data.forEach(item => {
    switch (item.Result) {
      case 'Profit':
        profit++;
        break;
      case 'Loss':
        loss++;
        break;
      case 'Missed':
        missed++;
        break;
      case 'Break Even':
        breakEven++;
        break;
      default:
        console.warn('Nilai Result tidak dikenali:', item.Result);
    }
  });

  const totalTrade = profit + loss + missed + breakEven;
  const totalTradeExecuted = profit + loss;

  // Hitung Winrate Murni (hanya Profit vs Loss)
  const winrateMurni = totalTradeExecuted > 0
    ? ((profit / totalTradeExecuted) * 100).toFixed(2)
    : 0;

  // Update DOM
  document.getElementById('winrateMurni').textContent = `Winrate ${winrateMurni}%`;
  document.getElementById('totalTrade').textContent = totalTrade;
  document.getElementById('totalTradeExecuted').textContent = totalTradeExecuted;
  document.getElementById('totalProfiteTrade').textContent = `Profit: ${profit}`;
  document.getElementById('totalLossTrade').textContent = `Loss: ${loss}`;
  document.getElementById('totalMissedTrade').textContent = `Missed: ${missed}`;
  document.getElementById('totalBETrade').textContent = `Break Even: ${breakEven}`;
})
.catch(error => {
  console.error('Gagal memuat data:', error);
});

// ======================= Stats Content 4 ======================= //
async function loadTradeStats() {
  try {
    const data = await getDB();

    // Pos (Long / Short)
    let countLong = 0, countShort = 0;
    data.forEach(item => {
      if (item.Pos === "B") countLong++;
      else if (item.Pos === "S") countShort++;
    });

    const totalPos = countLong + countShort || 1;
    const longPct = ((countLong / totalPos) * 100).toFixed(2);
    const shortPct = ((countShort / totalPos) * 100).toFixed(2);

    document.getElementById("long").textContent = `${longPct}%`;
    document.getElementById("short").textContent = `${shortPct}%`;
    document.getElementById("progressLongShort").style.width = `${longPct}%`;

    // Behavior (Reversal / Continuation)
    let countRev = 0, countCon = 0;
    data.forEach(item => {
      if (item.Behavior === "Reversal") countRev++;
      else if (item.Behavior === "Continuation") countCon++;
    });

    const totalBeh = countRev + countCon || 1;
    const revPct = ((countRev / totalBeh) * 100).toFixed(2);
    const conPct = ((countCon / totalBeh) * 100).toFixed(2);

    document.getElementById("reversal").textContent = `${revPct}%`;
    document.getElementById("continuation").textContent = `${conPct}%`;
    document.getElementById("progressRevCon").style.width = `${revPct}%`;

    // Method (Scalping / Swing / Intraday)
    let countScalp = 0, countSwing = 0, countIntra = 0;
    data.forEach(item => {
      const method = item.Method;
      if (method === "Scalping") countScalp++;
      else if (method === "Swing") countSwing++;
      else if (method === "Intraday") countIntra++;
    });

    const totalMethod = countScalp + countSwing + countIntra || 1;
    const scalpPct = ((countScalp / totalMethod) * 100).toFixed(0);
    const swingPct = ((countSwing / totalMethod) * 100).toFixed(0);
    const intraPct = ((countIntra / totalMethod) * 100).toFixed(0);

    const scalpEl = document.getElementById("scalping");
    const swingEl = document.getElementById("swing");
    const intraEl = document.getElementById("intraday");

    scalpEl.textContent = `${scalpPct}%`;
    swingEl.textContent = `${swingPct}%`;
    intraEl.textContent = `${intraPct}%`;

    // Update warna badge
    [scalpEl, swingEl, intraEl].forEach(el => {
      const val = parseFloat(el.textContent);
      el.classList.remove("badge-green", "badge-gray");
      el.classList.add(val > 0 ? "badge-green" : "badge-gray");
    });

    console.log("✅ Trade Stats Updated:", {
      longPct, shortPct, revPct, conPct, scalpPct, swingPct, intraPct
    });

  } catch (err) {
    console.error("Gagal memuat data trading:", err);
  }
}

document.addEventListener("DOMContentLoaded", loadTradeStats);

async function loadBehaviorStats() {
  try {
    const data = await getDB();

    // Reversal
    const reversalTrades = data.filter(t => t.Behavior === "Reversal");
    const totalRev = reversalTrades.length;

    const totalRevProfit = reversalTrades.filter(t => t.Result === "Profit").length;
    const totalRevLoss   = reversalTrades.filter(t => t.Result === "Loss").length;
    const totalRevMissed = reversalTrades.filter(t => t.Result === "Missed").length;

    const wrReversal = totalRev > 0 
        ? ((totalRevProfit / (totalRevProfit + totalRevLoss)) * 100).toFixed(0) 
        : 0;

    document.getElementById("totalTradeReveral").textContent = totalRev;
    document.getElementById("totalProfitReveral").textContent = totalRevProfit;
    document.getElementById("totalLossReveral").textContent = totalRevLoss;
    document.getElementById("totalMissedReveral").textContent = totalRevMissed;

    const wrRevEl = document.getElementById("wrReversal");
    wrRevEl.textContent = `Winrate ${wrReversal}%`;
    wrRevEl.classList.remove("winrate-positive", "winrate-negative");
    wrRevEl.classList.add(wrReversal >= 50 ? "winrate-positive" : "winrate-negative");

    // Continuation
    const contTrades = data.filter(t => t.Behavior === "Continuation");
    const totalCont = contTrades.length;

    const totalContProfit = contTrades.filter(t => t.Result === "Profit").length;
    const totalContLoss   = contTrades.filter(t => t.Result === "Loss").length;
    const totalContMissed = contTrades.filter(t => t.Result === "Missed").length;

    const wrContinuation = totalCont > 0 
        ? ((totalContProfit / (totalContProfit + totalContLoss)) * 100).toFixed(0)
        : 0;

    document.getElementById("totalTradeContinuation").textContent = totalCont;
    document.getElementById("totalProfitContinuation").textContent = totalContProfit;
    document.getElementById("totalLossContinuation").textContent = totalContLoss;
    document.getElementById("totalMissedContinuation").textContent = totalContMissed;

    const wrContEl = document.getElementById("wrContinuation");
    wrContEl.textContent = `Winrate ${wrContinuation}%`;
    wrContEl.classList.remove("winrate-positive", "winrate-negative");
    wrContEl.classList.add(wrContinuation >= 50 ? "winrate-positive" : "winrate-negative");

  } catch (err) {
    console.error("Gagal memuat data trading:", err);
  }
}

// ======================= Stats Content 5 ======================= //
document.addEventListener("DOMContentLoaded", loadBehaviorStats);
async function updatePairsTable() {
  const data = await getDB();

  const pairsList = ["BTCUSDT.P", "ETHUSDT.P", "SOLUSDT.P"];
  const stats = {};

  pairsList.forEach(pair => {
    const filtered = data.filter(t => t.Pairs === pair);
    stats[pair] = {
      all: filtered.length,
      profit: filtered.filter(t => t.Result === "Profit").length,
      loss: filtered.filter(t => t.Result === "Loss").length,
      long: filtered.filter(t => t.Pos === "B").length,
      short: filtered.filter(t => t.Pos === "S").length,
      reversal: filtered.filter(t => t.Behavior === "Reversal").length,
      continuation: filtered.filter(t => t.Behavior === "Continuation").length,
      scalping: filtered.filter(t => t.Method === "Scalping").length,
      intraday: filtered.filter(t => t.Method === "Intraday").length,
      swing: filtered.filter(t => t.Method === "Swing").length,
    };
  });

  // Update tabel HTML
  const rows = document.querySelectorAll(".tabel-pairs tbody tr");
  rows.forEach(row => {
    const pairName = row.children[0].textContent.trim();
    const pairKey = pairName + "USDT.P";
    const s = stats[pairKey];

    if (s) {
      row.children[1].textContent = s.all;
      row.children[2].textContent = s.profit;
      row.children[3].textContent = s.loss;
      row.children[4].textContent = s.long;
      row.children[5].textContent = s.short;
      row.children[6].textContent = s.reversal;
      row.children[7].textContent = s.continuation;
      row.children[8].textContent = s.scalping;
      row.children[9].textContent = s.intraday;
      row.children[10].textContent = s.swing;
    }
  });
}

updatePairsTable();

// Scrip Update Setting
function saveSettings() {
    const fee = parseFloat(document.getElementById('fee').value) || 0;
    const risk = parseFloat(document.getElementById('risk').value) || 0;

    const setting = {
        fee: fee,
        risk: risk
    };

    localStorage.setItem('setting', JSON.stringify(setting));

    alert('Setting berhasil disimpan!');
}

function loadSettings() {
    const savedSetting = localStorage.getItem('setting');
    if (savedSetting) {
        const setting = JSON.parse(savedSetting);
        document.getElementById('fee').value = setting.fee;
        document.getElementById('risk').value = setting.risk;
    }
}

document.addEventListener('DOMContentLoaded', loadSettings);
