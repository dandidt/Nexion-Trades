// --- FORMAT FUNCTIONS ---
function FormatUSD(value) {
    let formatted = '';
    let suffix = '';

    if (Math.abs(value) >= 1_000_000_000) {
        formatted = (value / 1_000_000_000).toFixed(2);
        suffix = 'B';
    } else if (Math.abs(value) >= 1_000_000) {
        formatted = (value / 1_000_000).toFixed(2);
        suffix = 'M';
    } else if (Math.abs(value) >= 100_000) {
        formatted = (value / 1_000).toFixed(2);
        suffix = 'K';
    } else {
        return value.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    if (formatted.endsWith('.00')) formatted = formatted.slice(0, -3);
    return `${formatted}${suffix}`;
}

function FormatRR(value) {
    let formatted = value.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });

    formatted = formatted.replace(/(\.\d*?[1-9])0+$/, '$1');
    formatted = formatted.replace(/\.0+$/, '');

    return formatted;
}

// ======================= Chart PnL & RR ======================= //
const canvas = document.getElementById('chartCanvas');
const ctx = canvas.getContext('2d');
const tooltip = document.getElementById('tooltip');
const tooltipDate = document.getElementById('tooltipDate');
const tooltipPnL = document.getElementById('tooltipPnL');
const tooltipRR = document.getElementById('tooltipRR');

let mousePos = { x: 0, y: 0, active: false };

// Set canvas size
function resizeCanvas() {
    const container = canvas.parentElement;
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    drawChart();
}

async function loadData() {
    try {
        const rawData = await getDB();
        if (!Array.isArray(rawData)) throw new Error('Expected JSON array');

        const trades = rawData
            .filter(item => typeof item.date === 'number' && !isNaN(item.date))
            .map(item => ({
                date: new Date(item.date),
                pnl: (typeof item.Pnl === 'number') ? item.Pnl : 0,
                rr: (typeof item.RR === 'number') ? item.RR : 0
            }))
            .sort((a, b) => a.date - b.date);

        const data = [];
        let cumulativePnL = 0;
        let cumulativeRR = 0;

        for (const trade of trades) {
            cumulativePnL += trade.pnl;
            cumulativeRR += trade.rr;

            data.push({
                date: trade.date,
                pnl: parseFloat(cumulativePnL.toFixed(2)),
                rr: parseFloat(cumulativeRR.toFixed(2))
            });
        }

        return data;
    } catch (err) {
        console.error('Gagal memuat data trading:', err);
        return generateDummyData();
    }
}

let data = [];

loadData().then(loadedData => {
    data = loadedData;
    drawChart();
});

// --- Helper: Draw smooth curved line ---
function drawSmoothPath(ctx, points) {
    if (points.length < 2) return;

    ctx.moveTo(points[0].x, points[0].y);

    for (let i = 0; i < points.length - 1; i++) {
        const p0 = points[i === 0 ? i : i - 1];
        const p1 = points[i];
        const p2 = points[i + 1];
        const p3 = points[i + 2] || p2;

        const cp1x = p1.x + (p2.x - p0.x) / 6;
        const cp1y = p1.y + (p2.y - p0.y) / 6;
        const cp2x = p2.x - (p3.x - p1.x) / 6;
        const cp2y = p2.y - (p3.y - p1.y) / 6;

        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
    }
}

function drawChart() {
    const width = canvas.width;
    const height = canvas.height;
    const padding = { top: 20, right: 60, bottom: 30, left: 80 };

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // --- CEK DATA KOSONG ---
    if (!data || data.length === 0) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.font = '700 55px TASA Explorer';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Nexion Trades', width / 2, height / 2);
        return;
    }

    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    if (data.length === 0) return;

    // Draw grid
    ctx.strokeStyle = 'rgba(38, 38, 38, 0.65)';
    ctx.lineWidth = 1;

    // Horizontal grid lines
    for (let i = 0; i <= 10; i++) {
        const y = padding.top + (chartHeight / 10) * i;
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(width - padding.right, y);
        ctx.stroke();
    }

    // Find min/max values
    const pnlValues = data.map(d => d.pnl);
    const rrValues = data.map(d => d.rr);
    const minPnl = Math.min(...pnlValues);
    const maxPnl = Math.max(...pnlValues);
    const minRR = Math.min(...rrValues);
    const maxRR = Math.max(...rrValues);

    // Handle case where all values are the same
    const rangePnl = maxPnl - minPnl || 1;
    const rangeRR = maxRR - minRR || 1;

    // --- PnL line (smooth) ---
    ctx.strokeStyle = '#00ffcc';
    ctx.lineWidth = 2;
    ctx.beginPath();
    const pnlPoints = data.map((point, i) => ({
        x: padding.left + (i / (data.length - 1)) * chartWidth,
        y: padding.top + chartHeight - ((point.pnl - minPnl) / rangePnl) * chartHeight
    }));
    drawSmoothPath(ctx, pnlPoints);
    ctx.stroke();

    // --- Fill di bawah PnL line (smooth juga) ---
    ctx.beginPath();
    drawSmoothPath(ctx, pnlPoints);
    ctx.lineTo(pnlPoints[pnlPoints.length - 1].x, padding.top + chartHeight);
    ctx.lineTo(pnlPoints[0].x, padding.top + chartHeight);
    ctx.closePath();

    const pnlGradient = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartHeight);
    pnlGradient.addColorStop(0, 'rgba(0, 255, 204, 0.25)');
    pnlGradient.addColorStop(1, 'rgba(0, 255, 204, 0)');
    ctx.fillStyle = pnlGradient;
    ctx.fill();

    // --- RR line (smooth) ---
    ctx.strokeStyle = '#ff9500';
    ctx.lineWidth = 2;
    ctx.beginPath();
    const rrPoints = data.map((point, i) => ({
        x: padding.left + (i / (data.length - 1)) * chartWidth,
        y: padding.top + chartHeight - ((point.rr - minRR) / rangeRR) * chartHeight
    }));
    drawSmoothPath(ctx, rrPoints);
    ctx.stroke();

    // --- Fill di bawah RR line (smooth juga) ---
    ctx.beginPath();
    drawSmoothPath(ctx, rrPoints);
    ctx.lineTo(rrPoints[rrPoints.length - 1].x, padding.top + chartHeight);
    ctx.lineTo(rrPoints[0].x, padding.top + chartHeight);
    ctx.closePath();

    const rrGradient = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartHeight);
    rrGradient.addColorStop(0, 'rgba(255, 149, 0, 0.25)');
    rrGradient.addColorStop(1, 'rgba(255, 149, 0, 0)');
    ctx.fillStyle = rrGradient;
    ctx.fill();

    // --- Tentukan jumlah label (misal 10) ---
    const numLabels = 10;

    // --- PnL Y-axis (kiri) ---
    ctx.fillStyle = '#00ffcc';
    ctx.font = '10px Inter';
    ctx.textAlign = 'right';
    for (let i = 0; i <= numLabels; i++) {
        const value = minPnl + (rangePnl * (i / numLabels));
        const y = padding.top + ((numLabels - i) / numLabels) * chartHeight;
        const label = `$${FormatUSD(value)}`;
        ctx.fillText(label, padding.left - 10, y + 3);
    }

    // --- RR Y-axis (kanan) ---
    ctx.fillStyle = '#ff9500';
    ctx.textAlign = 'left';
    for (let i = 0; i <= numLabels; i++) {
        const value = minRR + (rangeRR * (i / numLabels));
        const y = padding.top + ((numLabels - i) / numLabels) * chartHeight;
        const label = FormatRR(value);
        ctx.fillText(label, width - padding.right + 10, y + 3);
    }

    // Draw bottom axis line (make it bright)
    ctx.strokeStyle = 'rgba(255, 255, 255, 1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding.left, height - padding.bottom);
    ctx.lineTo(width - padding.right, height - padding.bottom);
    ctx.stroke();

    // Draw X-axis labels (dates) + small vertical tick
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255, 255, 255, 1)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 1)';
    ctx.lineWidth = 1;

    const labelInterval = Math.ceil(data.length / 10);

    for (let i = 0; i < data.length; i += labelInterval) {
        const point = data[i];
        const x = padding.left + (i / (data.length - 1)) * chartWidth;
        const yLabel = height - padding.bottom + 20;

        // Format tanggal → contoh "Jan 5"
        const date = new Date(point.date);
        const label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

        // Draw label text
        ctx.fillText(label, x, yLabel);

        // Draw small vertical tick above label
        const tickTop = height - padding.bottom;
        ctx.beginPath();
        ctx.moveTo(x, tickTop);
        ctx.lineTo(x, tickTop + 6);
        ctx.stroke();
    }

    // Draw left & right value labels on hover line
    if (mousePos.active && data.length > 0 && mousePos.x >= padding.left && mousePos.x <= width - padding.right) {
        const dataIndex = Math.max(0, Math.min(Math.round(((mousePos.x - padding.left) / chartWidth) * (data.length - 1)), data.length - 1));
        const point = data[dataIndex];

        if (point) {
            const x = padding.left + (dataIndex / (data.length - 1)) * chartWidth;
            const y = mousePos.y;

            // LEFT LABEL (PnL)
            const pnlValue = `$${FormatUSD(point.pnl)}`;
            const pnlWidth = ctx.measureText(pnlValue).width + 18;
            const pnlHeight = 20;
            const pnlX = padding.left - pnlWidth - 6;
            const pnlY = y - pnlHeight / 2;

            ctx.fillStyle = 'rgba(15, 20, 25, 0.9)';
            ctx.strokeStyle = 'rgba(0, 255, 204, 0.6)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.roundRect(pnlX, pnlY, pnlWidth, pnlHeight, 4);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#00ffcc';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(pnlValue, pnlX + pnlWidth / 2, pnlY + pnlHeight / 2);

            // RIGHT LABEL (RR)
            const rrValue = FormatRR(point.rr);
            const rrWidth = ctx.measureText(rrValue).width + 18;
            const rrHeight = 20;
            const rrX = width - padding.right + 6;
            const rrY = y - rrHeight / 2;

            ctx.fillStyle = 'rgba(15, 20, 25, 0.9)';
            ctx.strokeStyle = 'rgba(255, 149, 0, 0.6)';
            ctx.beginPath();
            ctx.roundRect(rrX, rrY, rrWidth, rrHeight, 4);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#ff9500';
            ctx.fillText(rrValue, rrX + rrWidth / 2, rrY + rrHeight / 2);

            // Draw vertical & horizontal crosshair
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 4]);

            // vertical
            ctx.beginPath();
            ctx.moveTo(x, padding.top);
            ctx.lineTo(x, height - padding.bottom);
            ctx.stroke();

            // horizontal
            ctx.beginPath();
            ctx.moveTo(padding.left, y);
            ctx.lineTo(width - padding.right, y);
            ctx.stroke();
            ctx.setLineDash([]);

            // Draw point circles — hanya tampilkan jika hover aktif DAN di dalam area chart
            const radarPnl = document.getElementById('radarPnl');
            const radarRR = document.getElementById('radarRR');

            if (mousePos.active && mousePos.x >= padding.left && mousePos.x <= canvas.width - padding.right) {
                const dataIndex = Math.max(0, Math.min(Math.round(((mousePos.x - padding.left) / chartWidth) * (data.length - 1)), data.length - 1));
                const point = data[dataIndex];

                if (point) {
                    const xCanvas = padding.left + (dataIndex / (data.length - 1)) * chartWidth;
                    const pnlYPosCanvas = padding.top + chartHeight - ((point.pnl - minPnl) / rangePnl) * chartHeight;
                    const rrYPosCanvas = padding.top + chartHeight - ((point.rr - minRR) / rangeRR) * chartHeight;

                    const rect = canvas.getBoundingClientRect();
                    const containerRect = canvas.parentElement.getBoundingClientRect();
                    
                    // Hitung posisi relatif terhadap container
                    const scaleX = rect.width / canvas.width;
                    const scaleY = rect.height / canvas.height;

                    const xDOM = (xCanvas * scaleX);
                    const pnlYDOM = (pnlYPosCanvas * scaleY);
                    const rrYDOM = (rrYPosCanvas * scaleY);

                    radarPnl.style.left = `${xDOM}px`;
                    radarPnl.style.top = `${pnlYDOM}px`;
                    radarPnl.style.display = 'block';

                    radarRR.style.left = `${xDOM}px`;
                    radarRR.style.top = `${rrYDOM}px`;
                    radarRR.style.display = 'block';
                }
            }

            // Draw bottom time label
            const date = new Date(point.date);
            const month = date.toLocaleString('en-US', { month: 'short' });
            const day = date.getDate();
            const hours = date.getHours().toString().padStart(2, '0');
            const minutes = date.getMinutes().toString().padStart(2, '0');

            const dateLabel = `${month} ${day} ${hours}:${minutes}`;

            const labelWidth = ctx.measureText(dateLabel).width + 16;
            const labelHeight = 20;
            const labelX = Math.min(Math.max(x - labelWidth / 2, padding.left), width - padding.right - labelWidth);
            const labelY = height - padding.bottom + 8;

            ctx.fillStyle = 'rgba(15, 20, 25, 0.9)';
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.roundRect(labelX, labelY, labelWidth, labelHeight, 4);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.font = '11px Inter';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(dateLabel, labelX + labelWidth / 2, labelY + labelHeight / 2);

            // Draw outer circle (main hover)
            ctx.beginPath();
            ctx.arc(mousePos.x, mousePos.y, 6, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.lineWidth = 1;
            ctx.fill();
            ctx.stroke();

            // Draw inner circle (small dot)
            ctx.beginPath();
            ctx.arc(mousePos.x, mousePos.y, 4, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(10, 15, 20, 1)';
            ctx.fill();
        }
    }

}

// Mouse interaction
canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Convert to canvas coordinates
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    mousePos.x = x * scaleX;
    mousePos.y = y * scaleY;
    mousePos.active = true;

    const padding = { left: 80, right: 60, top: 20, bottom: 40 };
    const chartWidth = canvas.width - padding.left - padding.right;

    if ( mousePos.x >= padding.left && mousePos.x <= canvas.width - padding.right && mousePos.y >= padding.top && mousePos.y <= canvas.height - padding.bottom) {
        canvas.style.cursor = 'none';
        
        const dataIndex = Math.max(0, Math.min(Math.round(((mousePos.x - padding.left) / chartWidth) * (data.length - 1)), data.length - 1));
        const point = data[dataIndex];

        if (point) {
            const day = String(point.date.getDate()).padStart(2, '0');
            const month = String(point.date.getMonth() + 1).padStart(2, '0');
            const year = point.date.getFullYear();

            let hours = point.date.getHours();
            const minutes = String(point.date.getMinutes()).padStart(2, '0');

            const ampm = hours >= 12 ? 'PM' : 'AM';
            hours = hours % 12;
            if (hours === 0) hours = 12;

            const dateStr = `${day}/${month}/${year} ${String(hours).padStart(2,'0')}:${minutes} ${ampm}`;
            tooltipDate.textContent = dateStr;

            tooltipDate.textContent = dateStr;
            tooltipPnL.textContent = `$${FormatUSD(point.pnl)}`;
            tooltipRR.textContent = `${FormatRR(point.rr)}`;

            tooltip.style.display = 'block';
            
            let tooltipX = e.clientX - rect.left + 40;
            let tooltipY = e.clientY - rect.top - 94;
            
            if (tooltipX + 200 > rect.width) {
                tooltipX = e.clientX - rect.left - 210;
            }
            if (tooltipY < 0) {
                tooltipY = e.clientY - rect.top + 40;
            }
            
            tooltip.style.left = tooltipX + 'px';
            tooltip.style.top = tooltipY + 'px';
        }
    } else {
        canvas.style.cursor = 'default';
        tooltip.style.display = 'none';
        mousePos.active = false;
    }

    drawChart();
});

canvas.addEventListener('mouseleave', () => {
    mousePos.active = false;
    tooltip.style.display = 'none';
    
    document.getElementById('radarPnl').style.display = 'none';
    document.getElementById('radarRR').style.display = 'none';
    
    drawChart();
});

// Initialize
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// ======================= Chart BALANCE ======================= //
const canvasBalance = document.getElementById('chartCanvasBalance');
const ctxBalance = canvasBalance.getContext('2d');
const tooltipBalance = document.getElementById('tooltip-balance');
const dateLabel = document.getElementById('dateLabelBalance');
        
let balanceFullData = [];
let balanceCurrentData = [];
let currentFilterRange = 'all';
let balanceTimeWindow = null;

function formatBalanceTime24(date) {
    return date.toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit'
    });
}

async function loadTradeHistory() {
    try {
        // Ambil deposit awal dari local cache 'tf'
        const tfDataStr = localStorage.getItem('tf');
        let initialDeposit = 0;
        if (tfDataStr) {
            try {
                const tfDataArr = JSON.parse(tfDataStr); // Parse jadi array
                if (Array.isArray(tfDataArr) && tfDataArr.length > 0) {
                    initialDeposit = Number(tfDataArr[0].Deposit) || 0; // Ambil deposit pertama
                }
            } catch {
                console.warn('Gagal parse local cache tf, pakai deposit 0');
            }
        }

        const tradeData = await getDB();
        const validTrades = tradeData.filter(t => t.Pnl !== undefined && t.Pnl !== null);
        validTrades.sort((a, b) => a.date - b.date);

        let cumulativeBalance = initialDeposit;
        const processedData = validTrades.map(entry => {
            const pnl = Number(entry.Pnl) || 0;
            cumulativeBalance += pnl;
            return {
                date: new Date(Number(entry.date)),
                balance: parseFloat(cumulativeBalance.toFixed(2)),
                tradeNumber: entry.tradeNumber,
                PnL: pnl
            };
        });

        const firstDate = new Date(Number(validTrades[0]?.date || Date.now()));
        firstDate.setHours(0, 0, 0, 0);

        // Pastikan titik awal benar-benar sebelum trade pertama
        let firstTradeDate = validTrades.length > 0 
            ? new Date(Number(validTrades[0].date)) 
            : new Date();

        // Titik $0: 1 detik sebelum deposit
        const zeroPointDate = new Date(firstTradeDate);
        zeroPointDate.setSeconds(zeroPointDate.getSeconds() - 2);

        // Titik deposit: 1 detik sebelum trade pertama
        const depositPointDate = new Date(firstTradeDate);
        depositPointDate.setSeconds(depositPointDate.getSeconds() - 1);

        balanceFullData = [
            { date: zeroPointDate, balance: 0 },
            { date: depositPointDate, balance: parseFloat(initialDeposit.toFixed(2)) },
            ...processedData
        ];

        balanceCurrentData = [...balanceFullData];
        resizeBalanceCanvas();
    } catch (error) {
        console.error('Error loading trade history:', error);
        balanceCurrentData = [...balanceFullData];
        resizeBalanceCanvas();
    }
}

function filterData(range) {
    currentFilterRange = range;

    // Tidak filter data — selalu gunakan balanceFullData penuh
    // Cukup set window untuk keperluan visualisasi
    const now = new Date();

    if (range === 'all') {
        balanceTimeWindow = null;
    } else if (range === '24h') {
        const today08 = new Date(now);
        today08.setHours(8, 0, 0, 0);
        balanceTimeWindow = {
            start: new Date(today08),
            end: new Date(today08.getTime() + 24 * 60 * 60 * 1000)
        };
    } else if (range === '1w') {
        const end = new Date(now);
        end.setHours(23, 59, 59, 999);
        const start = new Date(end);
        start.setDate(end.getDate() - 6);
        start.setHours(0, 0, 0, 0);
        balanceTimeWindow = { start, end };
    } else if (range === '1m') {
        const end = new Date(now);
        end.setHours(23, 59, 59, 999);
        const start = new Date(end);
        start.setDate(end.getDate() - 29);
        start.setHours(0, 0, 0, 0);
        balanceTimeWindow = { start, end };
    }

    updateFilterStats(range);
    drawBalanceChart();
}

function updateFilterStats(range) {
    const subtitle = document.getElementById('subtitleFilterBalance');
    const valueEl = document.getElementById('valueFilterBalance');

    subtitle.textContent = `${range.toUpperCase()} Account Value (Combined)`;

    if (balanceFullData.length === 0) {
        valueEl.textContent = '$0.00';
        valueEl.style.color = 'rgb(163, 163, 163)';
        return;
    }

    // 🔹 SELALU TAMPILKAN BALANCE AKHIR TOTAL
    const finalBalance = balanceFullData[balanceFullData.length - 1].balance;
    valueEl.textContent = formatBalanceCurrency(finalBalance);

    // 🔹 TAPI WARNA BERDASARKAN PnL DI RENTANG FILTER
    let pnlInRange = 0;

    if (range === 'all') {
        // PnL total = balance akhir - balance awal
        const initialBalance = balanceFullData[0]?.balance || 0;
        pnlInRange = finalBalance - initialBalance;
    } else if (balanceTimeWindow) {
        // Cari balance pertama sebelum atau di awal window
        const dataBeforeOrInWindow = balanceFullData
            .filter(d => d.date <= balanceTimeWindow.end)
            .sort((a, b) => a.date - b.date);

        if (dataBeforeOrInWindow.length === 0) {
            pnlInRange = 0;
        } else {
            // Balance di awal window = balance terakhir sebelum window dimulai
            const beforeWindow = balanceFullData
                .filter(d => d.date < balanceTimeWindow.start)
                .sort((a, b) => a.date - b.date);
            
            const startBalance = beforeWindow.length > 0 
                ? beforeWindow[beforeWindow.length - 1].balance 
                : (balanceFullData[0]?.balance || 0);

            const endBalance = dataBeforeOrInWindow[dataBeforeOrInWindow.length - 1].balance;
            pnlInRange = endBalance - startBalance;
        }
    }

    // 🔹 SET WARNA BERDASARKAN PnL DI RENTANG
    if (pnlInRange > 0) {
        valueEl.style.color = 'rgb(52, 211, 153)';
    } else if (pnlInRange < 0) {
        valueEl.style.color = 'rgb(251, 113, 133)';
    } else {
        valueEl.style.color = 'rgb(163, 163, 163)';
    }
}

function resizeBalanceCanvas() {
    const wrapper = canvasBalance.parentElement;
    canvasBalance.width = wrapper.clientWidth;
    canvasBalance.height = wrapper.clientHeight;
    drawBalanceChart();
}

// Format currency
function formatBalanceCurrency(value) {
    return '$' + value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Format date short
function formatBalanceDateShort(date) {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Format date full
function formatBalanceDateFull(date) {
    return date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
}

// Fungsion Show Trades
let showCircles = false;
const toggleBtn = document.getElementById('toggleCircles');

toggleBtn.addEventListener('click', () => {
    showCircles = !showCircles;

    if (showCircles) {
        toggleBtn.classList.add('on');
        toggleBtn.classList.remove('off');
    } else {
        toggleBtn.classList.add('off');
        toggleBtn.classList.remove('on');
    }

    drawBalanceChart();
});

// Chart settings
let balanceChartArea = {};
let balancePoints = [];
let balanceCurrentChartColor = 'rgb(13, 185, 129)';

function drawBalanceChart() {
    ctxBalance.clearRect(0, 0, canvasBalance.width, canvasBalance.height);

    if (balanceCurrentData.length === 0) {
        ctxBalance.save();
        ctxBalance.font = '700 55px TASA Explorer';
        ctxBalance.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctxBalance.textAlign = 'center';
        ctxBalance.textBaseline = 'middle';
        ctxBalance.fillText('Nexion Trades', canvasBalance.width / 2, canvasBalance.height / 2.5);
        ctxBalance.restore();
        return;
    }

    // ==== FIND MIN/MAX BALANCE BERDASARKAN DATA YANG AKAN DITAMPILKAN ====
    let relevantBalances = [];

    if (currentFilterRange === 'all') {
        relevantBalances = balanceFullData.map(d => d.balance);
    } else if (balanceTimeWindow) {
        // Ambil semua balance dari data yang <= windowEnd
        const upToWindow = balanceFullData
            .filter(d => d.date <= balanceTimeWindow.end)
            .map(d => d.balance);
        if (upToWindow.length > 0) {
            relevantBalances = upToWindow;
        } else {
            // Fallback: ambil semua
            relevantBalances = balanceFullData.map(d => d.balance);
        }
    } else {
        relevantBalances = balanceFullData.map(d => d.balance);
    }

    const minBalance = Math.min(...relevantBalances) * 0.9;
    const maxBalance = Math.max(...relevantBalances) * 1.1;
    const rangeBalance = maxBalance - minBalance || 1;

    // ==== HITUNG PADDING KIRI DINAMIS ====
    ctxBalance.font = '12px Inter';
    const sampleTexts = [
        formatBalanceCurrency(minBalance),
        formatBalanceCurrency(maxBalance),
        formatBalanceCurrency((minBalance + maxBalance) / 2)
    ];

    const widestText = sampleTexts.reduce((a, b) =>
        ctxBalance.measureText(a).width > ctxBalance.measureText(b).width ? a : b
    );

    const textWidth = ctxBalance.measureText(widestText).width;
    const dynamicLeftPadding = textWidth + 20;

    // ==== GUNAKAN padding fleksibel ====
    const padding = { top: 10, right: 20, bottom: 35, left: dynamicLeftPadding };

    balanceChartArea = {
        left: padding.left,
        right: canvasBalance.width - padding.right,
        top: padding.top,
        bottom: canvasBalance.height - padding.bottom,
        width: canvasBalance.width - padding.left - padding.right,
        height: canvasBalance.height - padding.top - padding.bottom
    };

    // ==== GRID + Y VALUES ====
    ctxBalance.font = '12px Inter';
    ctxBalance.fillStyle = 'rgb(163, 163, 163)';
    ctxBalance.textAlign = 'right';
    const ySteps = 5;
    for (let i = 0; i <= ySteps; i++) {
        const value = minBalance + (rangeBalance * (i / ySteps));
        const y = balanceChartArea.bottom - (balanceChartArea.height * i / ySteps);
        ctxBalance.fillText(formatBalanceCurrency(value), balanceChartArea.left - 10, y + 4);
    }

    // ==== GENERATE TIME AXIS BERDASARKAN FILTER MODE ====
    let fullDates = [];
    let axisStart, axisEnd;

    if (currentFilterRange === '24h' && balanceTimeWindow) {
        // Mode 24 jam: dari 08:00 hari ini ke 08:00 besok
        axisStart = new Date(balanceTimeWindow.start);
        axisEnd = new Date(balanceTimeWindow.end);

        // Generate tiap 2 jam → total 13 titik (08:00, 10:00, ..., 08:00)
        for (let i = 0; i <= 12; i++) {
            const time = new Date(axisStart.getTime() + i * 2 * 60 * 60 * 1000);
            fullDates.push(time);
        }
    } else if ((currentFilterRange === '1w' || currentFilterRange === '1m') && balanceTimeWindow) {
        axisStart = new Date(balanceTimeWindow.start);
        axisEnd = new Date(balanceTimeWindow.end);

        // Bulatkan ke hari
        axisStart.setHours(0, 0, 0, 0);
        axisEnd.setHours(0, 0, 0, 0);

        // Generate tiap hari
        let current = new Date(axisStart);
        while (current <= axisEnd) {
            fullDates.push(new Date(current));
            current.setDate(current.getDate() + 1);
        }
    } else {
        // Mode 'all' atau fallback
        const firstDate = new Date(balanceCurrentData[0].date);
        firstDate.setHours(0, 0, 0, 0);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let current = new Date(firstDate);
        while (current <= today) {
            fullDates.push(new Date(current));
            current.setDate(current.getDate() + 1);
        }
        axisStart = fullDates[0];
        axisEnd = fullDates[fullDates.length - 1];
    }

    // Jika tidak ada fullDates (edge case), fallback ke data asli
    if (fullDates.length === 0) {
        fullDates = balanceCurrentData.map(d => new Date(d.date));
        if (fullDates.length === 0) return;
        axisStart = fullDates[0];
        axisEnd = fullDates[fullDates.length - 1];
    }

    // ==== INTERPOLASI BALANCE DARI balanceFullData (SEMUA DATA) ====
    let lastBalance = balanceFullData.length > 0 ? balanceFullData[0].balance : 0;

    // Urutkan balanceFullData sekali (pastikan)
    const sortedFullData = [...balanceFullData].sort((a, b) => a.date - b.date);

    balancePoints = fullDates.map(d => {
        // Cari data terakhir yang <= d (dari SEMUA data)
        const match = sortedFullData
            .filter(t => t.date.getTime() <= d.getTime())
            .pop(); // ambil yang paling akhir

        if (match) {
            lastBalance = match.balance;
        }
        // Jika tidak ada match (d terlalu awal), lastBalance tetap dari awal

        const normalizedValue = (lastBalance - minBalance) / rangeBalance;
        const y = balanceChartArea.bottom - (balanceChartArea.height * normalizedValue);

        const tRatio = (d.getTime() - axisStart.getTime()) / (axisEnd.getTime() - axisStart.getTime() || 1);
        const x = balanceChartArea.left + tRatio * balanceChartArea.width;

        return { 
            x, 
            y, 
            date: d, 
            balance: lastBalance, 
            isData: !!match 
        };
    });
    // ==== TENTUKAN WARNA BERDASARKAN PERGERAKAN ====
    let lineColor, gradientStart;
    if (balancePoints.length <= 1) {
        lineColor = 'rgb(13, 185, 129)';
        gradientStart = 'rgba(13, 185, 129, 0.65)';
    } else {
        const firstBalance = balancePoints.find(p=>p.isData)?.balance || balancePoints[0].balance;
        const lastBalanceVal = balancePoints[balancePoints.length-1].balance;
        if(lastBalanceVal > firstBalance) { lineColor = 'rgb(13, 185, 129)'; gradientStart = 'rgba(13, 185, 129, 0.65)'; }
        else if(lastBalanceVal < firstBalance) { lineColor = 'rgb(239, 68, 68)'; gradientStart = 'rgba(239, 68, 68, 0.65)'; }
        else { lineColor = 'rgb(13, 185, 129)'; gradientStart = 'rgba(13, 185, 129, 0.65)'; }
    }

    const circlebalance = document.getElementById('circlebalance');
    if (circlebalance) {
        circlebalance.style.background = lineColor;
        const matchCol = lineColor.match(/\d+/g);
        if (matchCol && matchCol.length === 3) {
            const [r, g, b] = matchCol;
            circlebalance.style.setProperty('--circlebalance-color', lineColor);
            circlebalance.style.setProperty('--circlebalance-after-color', `rgba(${r}, ${g}, ${b}, 0.6)`);
        }
    }

    // ==== GRADIENT FILL ====
    const gradient = ctxBalance.createLinearGradient(0, balanceChartArea.top, 0, balanceChartArea.bottom);
    const match = lineColor.match(/\d+/g);
    if (match && match.length === 3) {
        const [r, g, b] = match;
        gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.65)`);
        gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
    } else {
        gradient.addColorStop(0, 'rgba(13, 185, 129, 0.65)');
        gradient.addColorStop(1, 'rgba(13, 185, 129, 0)');
    }

    ctxBalance.fillStyle = gradient;
    ctxBalance.beginPath();
    ctxBalance.moveTo(balancePoints[0].x, balanceChartArea.bottom);
    ctxBalance.lineTo(balancePoints[0].x, balancePoints[0].y);

    for (let i = 0; i < balancePoints.length - 1; i++) {
        const p0 = balancePoints[i - 1] || balancePoints[i];
        const p1 = balancePoints[i];
        const p2 = balancePoints[i + 1];
        const p3 = balancePoints[i + 2] || p2;

        const cp1x = p1.x + (p2.x - p0.x) / 6;
        const cp1y = p1.y + (p2.y - p0.y) / 6;
        const cp2x = p2.x - (p3.x - p1.x) / 6;
        const cp2y = p2.y - (p3.y - p1.y) / 6;

        ctxBalance.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
    }

    ctxBalance.lineTo(balancePoints[balancePoints.length - 1].x, balanceChartArea.bottom);
    ctxBalance.closePath();
    ctxBalance.fill();

    // ==== GARIS UTAMA HALUS (CUBIC BEZIER) ====
    ctxBalance.strokeStyle = lineColor;
    ctxBalance.lineWidth = 3;
    ctxBalance.lineJoin = 'round';
    ctxBalance.lineCap = 'round';
    ctxBalance.shadowColor = 'rgba(16, 185, 129, 0.4)';
    ctxBalance.shadowBlur = 10;

    ctxBalance.beginPath();
    ctxBalance.moveTo(balancePoints[0].x, balancePoints[0].y);

    for (let i = 0; i < balancePoints.length - 1; i++) {
        const p0 = balancePoints[i - 1] || balancePoints[i];
        const p1 = balancePoints[i];
        const p2 = balancePoints[i + 1];
        const p3 = balancePoints[i + 2] || p2;

        const cp1x = p1.x + (p2.x - p0.x) / 6;
        const cp1y = p1.y + (p2.y - p0.y) / 6;
        const cp2x = p2.x - (p3.x - p1.x) / 6;
        const cp2y = p2.y - (p3.y - p1.y) / 6;

        ctxBalance.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
    }
    ctxBalance.stroke();
    ctxBalance.shadowBlur = 0;

    // ==== Circle Poin untuk data asli ====
    if (showCircles) {
        ctxBalance.fillStyle = 'rgb(245, 245, 245)';
        balancePoints.forEach(p => {
            if(p.isData){
                ctxBalance.beginPath();
                ctxBalance.arc(p.x, p.y, 2, 0, Math.PI * 2);
                ctxBalance.fill();
            }
        });
    }

    // ==== LABEL X-AXIS ====
    ctxBalance.fillStyle = 'rgb(163, 163, 163)';
    ctxBalance.font = '11px Inter';
    ctxBalance.textAlign = 'center';

    if (currentFilterRange === '24h') {
        // Tampilkan semua jam (08:00, 10:00, ..., 08:00)
        balancePoints.forEach((p, i) => {
            ctxBalance.fillText(formatBalanceTime24(p.date), p.x, balanceChartArea.bottom + 20);
        });
    } else {
        // Mode harian: limit label
        const maxLabels = currentFilterRange === '1w' ? 8 : 11;
        let step = 1;
        if (balancePoints.length > maxLabels) {
            step = Math.ceil(balancePoints.length / (maxLabels - 1));
        }
        ctxBalance.fillText(formatBalanceDateShort(balancePoints[0].date), balancePoints[0].x, balanceChartArea.bottom + 20);
        for (let i = step; i < balancePoints.length - 1; i += step) {
            ctxBalance.fillText(formatBalanceDateShort(balancePoints[i].date), balancePoints[i].x, balanceChartArea.bottom + 20);
        }
        if (balancePoints.length > 1 && (balancePoints.length - 1) % step !== 0) {
            const last = balancePoints[balancePoints.length - 1];
            ctxBalance.fillText(formatBalanceDateShort(last.date), last.x, balanceChartArea.bottom + 20);
        }
    }

    // ==== LAST PRICE circlebalance ====
    const last = balancePoints[balancePoints.length - 1];
    if (last && circlebalance) {
        circlebalance.style.display = 'block';
        circlebalance.style.left = `${last.x}px`;
        circlebalance.style.top = `${last.y}px`;
    } else if(circlebalance){
        circlebalance.style.display = 'none';
    }
}

let balanceLastPoint = null;

canvasBalance.addEventListener('mousemove', (e) => {
    if (balanceCurrentData.length === 0) {
        canvasBalance.style.cursor = 'default';
        return;
    }

    const rect = canvasBalance.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const inChart = (
        mouseX >= balanceChartArea.left && mouseX <= balanceChartArea.right &&
        mouseY >= balanceChartArea.top && mouseY <= balanceChartArea.bottom
    );

    if (!inChart) {
        canvasBalance.style.cursor = 'default'; // 🔹 Kursor balik ke normal
        tooltipBalance.style.display = "none";
        dateLabel.style.display = "none";
        drawBalanceChart();
        balanceLastPoint = null;
        return;
    }

    // 🔹 Saat dalam area chart, ubah jadi crosshair
    canvasBalance.style.cursor = 'crosshair';

    let closestPoint = null;
    let minDist = Infinity;
    balancePoints.forEach(p => {
        const dist = Math.abs(p.x - mouseX);
        if (dist < minDist) {
            minDist = dist;
            closestPoint = p;
        }
    });

    if (!closestPoint) return;

    drawBalanceChart();

    // Garis vertikal
    ctxBalance.strokeStyle = balanceCurrentChartColor;
    ctxBalance.lineWidth = 1;
    ctxBalance.setLineDash([5, 5]);
    ctxBalance.beginPath();
    ctxBalance.moveTo(closestPoint.x, balanceChartArea.top);
    ctxBalance.lineTo(closestPoint.x, balanceChartArea.bottom);
    ctxBalance.stroke();
    ctxBalance.setLineDash([]);

    // Titik highlight
    ctxBalance.fillStyle = '#fff';
    ctxBalance.beginPath();
    ctxBalance.arc(closestPoint.x, closestPoint.y, 2, 0, Math.PI * 2);
    ctxBalance.fill();

    tooltipBalance.style.display = "block";
    dateLabel.style.display = "block";

    if (!balanceLastPoint || balanceLastPoint !== closestPoint) {
        tooltipBalance.querySelector('.tooltip-stats').textContent = formatBalanceCurrency(closestPoint.balance);

        const date = closestPoint.date;
        const d = date.getDate().toString().padStart(2, '0');
        const m = (date.getMonth() + 1).toString().padStart(2, '0');
        const y = date.getFullYear();
        let h = date.getHours();
        const min = date.getMinutes().toString().padStart(2, '0');
        const ampm = h >= 12 ? 'PM' : 'AM';
        h = h % 12;
        h = h ? h : 12;
        const hh = h.toString().padStart(2, '0');

        tooltipBalance.querySelector('.tooltip-date-balance').textContent = `${d}/${m}/${y} ${hh}:${min} ${ampm}`;

        const monthDay = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const time = date.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
        dateLabel.textContent = `${monthDay} ${time}`;
        balanceLastPoint = closestPoint;
    }

    let tooltipX = mouseX + 20;
    let tooltipY = mouseY - 80;

    const tooltipWidth = tooltipBalance.offsetWidth;
    const tooltipHeight = tooltipBalance.offsetHeight;

    if (tooltipX + tooltipWidth > balanceChartArea.right) {
        tooltipX = mouseX - tooltipWidth - 20;
    }
    if (tooltipY < balanceChartArea.top) {
        tooltipY = mouseY + 30;
    }

    tooltipBalance.style.left = tooltipX + 'px';
    tooltipBalance.style.top = tooltipY + 'px';

    const labelWidth = dateLabel.offsetWidth || 60;
    const labelTop = balanceChartArea.bottom + 10;

    const wrapperRect = canvasBalance.parentElement.getBoundingClientRect();
    const offsetLeft = rect.left - wrapperRect.left;

    let labelLeft = offsetLeft + closestPoint.x - (labelWidth / 2);

    if (labelLeft < 0) {
        labelLeft = offsetLeft + closestPoint.x - labelWidth * 0.25;
    } else if (labelLeft + labelWidth > wrapperRect.width) {
        labelLeft = offsetLeft + closestPoint.x - labelWidth * 0.75;
    }

    labelLeft = Math.max(4, Math.min(wrapperRect.width - labelWidth - 4, labelLeft));

    dateLabel.style.left = `${labelLeft}px`;
    dateLabel.style.top = `${labelTop}px`;
});

canvasBalance.addEventListener('mouseleave', () => {
    canvasBalance.style.cursor = 'default';
    tooltipBalance.style.display = "none";
    dateLabel.style.display = "none";
    balanceLastPoint = null;
    drawBalanceChart();
});


// Initial draw
loadTradeHistory().then(() => {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            filterData(btn.dataset.range);
        });
    });
    document.querySelector('.filter-btn[data-range="all"]').classList.add('active');
    filterData('all');
});

// ======================= Chart Pairs ======================= //
const cryptoData = { btc: 0, eth: 0, sol: 0 };
const circumference = 2 * Math.PI * 100; // radius = 100

// Helper: Update tampilan tooltip dengan nilai terformat
function updateTooltipText() {
    document.querySelector('#btcTooltip .tooltip-value-pairs').textContent = cryptoData.btc.toFixed(2) + '%';
    document.querySelector('#ethTooltip .tooltip-value-pairs').textContent = cryptoData.eth.toFixed(2) + '%';
    document.querySelector('#solTooltip .tooltip-value-pairs').textContent = cryptoData.sol.toFixed(2) + '%';
}

async function loadCryptoData() {
    try {
        const data = await getDB();

        const counts = { btc: 0, eth: 0, sol: 0 };
        data.forEach(item => {
            const pair = item.Pairs?.toUpperCase();
            if (!pair) return;
            if (pair.includes("BTC")) counts.btc++;
            else if (pair.includes("ETH")) counts.eth++;
            else if (pair.includes("SOL")) counts.sol++;
        });

        const total = counts.btc + counts.eth + counts.sol;

        // Hindari pembagian dengan nol
        if (total === 0) {
            cryptoData.btc = cryptoData.eth = cryptoData.sol = 0;
        } else {
            cryptoData.btc = (counts.btc / total) * 100;
            cryptoData.eth = (counts.eth / total) * 100;
            cryptoData.sol = (counts.sol / total) * 100;
        }

        updateChartPairs();
        setupTooltips();
        updateTooltipText();

    } catch (err) {
        console.error("Gagal memuat data trading:", err);
        // Opsional: fallback ke data dummy jika diperlukan
        // setCryptoData(33.33, 33.33, 33.34);
    }
}

function updateChartPairs() {
    const btcLength = (cryptoData.btc / 100) * circumference;
    const ethLength = (cryptoData.eth / 100) * circumference;
    const solLength = (cryptoData.sol / 100) * circumference;

    const btcSegment = document.getElementById('btcSegment');
    const ethSegment = document.getElementById('ethSegment');
    const solSegment = document.getElementById('solSegment');

    if (!btcSegment || !ethSegment || !solSegment) return;

    btcSegment.style.strokeDasharray = `${btcLength} ${circumference}`;
    btcSegment.style.strokeDashoffset = '0';

    ethSegment.style.strokeDasharray = `${ethLength} ${circumference}`;
    ethSegment.style.strokeDashoffset = -btcLength;

    solSegment.style.strokeDasharray = `${solLength} ${circumference}`;
    solSegment.style.strokeDashoffset = -(btcLength + ethLength);
}

function getTooltipPosition(percentage, offset) {
    // Posisi tengah segmen dalam radian
    const midPercent = offset + percentage / 2;
    const angle = (midPercent / 100) * 2 * Math.PI - Math.PI / 2; // mulai dari atas (12 o'clock)
    const radius = 120; // jarak tooltip dari pusat
    const centerX = 133.5;
    const centerY = 133.5;
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);
    return { x, y };
}

function setupTooltips() {
    const btcPos = getTooltipPosition(cryptoData.btc, 0);
    const ethPos = getTooltipPosition(cryptoData.eth, cryptoData.btc);
    const solPos = getTooltipPosition(cryptoData.sol, cryptoData.btc + cryptoData.eth);

    const tooltips = [
        { id: 'btcTooltip', pos: btcPos, value: cryptoData.btc },
        { id: 'ethTooltip', pos: ethPos, value: cryptoData.eth },
        { id: 'solTooltip', pos: solPos, value: cryptoData.sol }
    ];

    tooltips.forEach(({ id, pos, value }) => {
        const el = document.getElementById(id);
        if (!el) return;

        if (value > 0) {
            el.style.left = `${pos.x}px`;
            el.style.top = `${pos.y}px`;
            el.style.transform = 'translate(-50%, -50%)';
            el.classList.add('show');
        } else {
            el.classList.remove('show');
        }
    });
}

// Event hover untuk highlight
['btcSegment', 'ethSegment', 'solSegment'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
        el.addEventListener('mouseenter', () => el.style.filter = 'brightness(1.2)');
        el.addEventListener('mouseleave', () => el.style.filter = 'brightness(1)');
    }
});

// Fungsi eksternal untuk debug atau fallback
function setCryptoData(btc, eth, sol) {
    cryptoData.btc = btc;
    cryptoData.eth = eth;
    cryptoData.sol = sol;
    updateChartPairs();
    setupTooltips();
    updateTooltipText();
}

// Jalankan hanya setelah DOM siap
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadCryptoData);
} else {
    loadCryptoData();
}

// ======================= Chart WR ======================= //
const canvasWrChart = document.getElementById('donutChart');
const ctxWrChart = canvasWrChart.getContext('2d');

// Ukuran canvas
canvasWrChart.width = 700;
canvasWrChart.height = 450;

// Hitung posisi center otomatis
const centerX = canvasWrChart.width / 2;
const centerY = canvasWrChart.height / 2;

const radius = 120;
const holeRadius = 75;

let dataWrChart = [];
let total = 0;

let animationProgress = 0;
const animationDuration = 1500;
let startTime = null;

// ========== Fungsi Load Data JSON ==========
async function loadWrChartData() {
    try {
        const data = await getDB();

        const counts = { Profite: 0, Loss: 0, Missed: 0 };
        data.forEach(item => {
            if (item.Result === "Profit") counts.Profite++;
            else if (item.Result === "Loss") counts.Loss++;
            else if (item.Result === "Missed") counts.Missed++;
        });

        dataWrChart = [
            { label: 'Win', value: counts.Profite, color1: '#34d399', color2: '#2D7D60' },
            { label: 'Lose', value: counts.Loss, color1: '#fb7185', color2: '#bb3747' },
            { label: 'Missed', value: counts.Missed, color1: '#e7e7e7', color2: '#d1d1d1' }
        ];

        total = dataWrChart.reduce((sum, item) => sum + item.value, 0);

        requestAnimationFrame(animateWrChart);
    } catch (err) {
        console.error("Gagal memuat data WR:", err);
    }
}

// ========== Fungsi Chart ==========
function createLinearGradientWrChart(color1, color2) {
    const grad = ctxWrChart.createLinearGradient(
        centerX - radius,
        centerY - radius,
        centerX + radius,
        centerY + radius
    );
    grad.addColorStop(0, color1);
    grad.addColorStop(1, color2);
    return grad;
}

function drawDonutSegment(startAngle, endAngle, color1, color2) {
    ctxWrChart.beginPath();
    ctxWrChart.arc(centerX, centerY, radius, startAngle, endAngle);
    ctxWrChart.arc(centerX, centerY, holeRadius, endAngle, startAngle, true);
    ctxWrChart.closePath();

    const gradient = createLinearGradientWrChart(color1, color2);
    ctxWrChart.fillStyle = gradient;

    ctxWrChart.shadowColor = 'rgba(0, 0, 0, 0.15)';
    ctxWrChart.shadowBlur = 12;
    ctxWrChart.shadowOffsetX = 0;
    ctxWrChart.shadowOffsetY = 4;
    ctxWrChart.fill();
    ctxWrChart.shadowColor = 'transparent';
}

function drawLabelWrChart(item, startAngle, endAngle, delay) {
    if (item.value === 0) return;

    const progress = Math.max(0, Math.min(1, (animationProgress - delay) / 500));
    if (progress <= 0) return;

    const midAngle = startAngle + (endAngle - startAngle) / 2;
    const percentage = ((item.value / total) * 100).toFixed(1) + '%';

    const lineStartX = centerX + Math.cos(midAngle) * radius;
    const lineStartY = centerY + Math.sin(midAngle) * radius;

    let lineMidX, lineMidY, lineEndX, lineEndY, textX, align;
    const isRightSide = Math.cos(midAngle) > 0;
    const isBottom = Math.sin(midAngle) > 0;

    const offsetX = 25;
    const offsetY = 30;

    if (isRightSide) {
        lineMidX = lineStartX + offsetX;
        lineMidY = lineStartY + (isBottom ? offsetY : -offsetY);
        lineEndX = canvasWrChart.width - 40;
        lineEndY = lineMidY;
        textX = lineEndX - 10;
        align = 'right';
    } else {
        lineMidX = lineStartX - offsetX;
        lineMidY = lineStartY + (isBottom ? offsetY : -offsetY);
        lineEndX = 40;
        lineEndY = lineMidY;
        textX = lineEndX + 10;
        align = 'left';
    }

    // Garis label
    ctxWrChart.strokeStyle = item.color2;
    ctxWrChart.lineWidth = 2;
    ctxWrChart.globalAlpha = progress;
    ctxWrChart.beginPath();
    ctxWrChart.moveTo(lineStartX, lineStartY);
    ctxWrChart.lineTo(lineMidX, lineMidY);
    ctxWrChart.lineTo(lineEndX, lineEndY);
    ctxWrChart.stroke();

    // Titik ujung
    ctxWrChart.fillStyle = item.color1;
    ctxWrChart.beginPath();
    ctxWrChart.arc(lineEndX, lineEndY, 4, 0, Math.PI * 2);
    ctxWrChart.fill();

    // Text persentase
    ctxWrChart.textAlign = align;
    ctxWrChart.fillStyle = 'rgb(245, 245, 245)';
    ctxWrChart.font = 'bold 22px Inter';
    ctxWrChart.fillText(percentage, textX, lineEndY - 10);

    // Label kecil di bawah
    ctxWrChart.fillStyle = 'rgb(163, 163, 163)';
    ctxWrChart.font = '600 14px Inter';
    ctxWrChart.fillText(item.label, textX, lineEndY + 18);

    ctxWrChart.globalAlpha = 1;
}

function drawCenterText() {
    const progress = Math.max(0, Math.min(1, (animationProgress - 1200) / 300));
    if (progress <= 0) return;

    ctxWrChart.globalAlpha = progress;
    ctxWrChart.fillStyle = 'rgb(245, 245, 245)';
    ctxWrChart.font = 'bold 32px Inter';
    ctxWrChart.textAlign = 'center';
    ctxWrChart.fillText(total.toLocaleString('id-ID'), centerX, centerY + 10);
    ctxWrChart.globalAlpha = 1;
}

function animateWrChart(timestamp) {
    if (!startTime) startTime = timestamp;
    animationProgress = timestamp - startTime;

    ctxWrChart.clearRect(0, 0, canvasWrChart.width, canvasWrChart.height);

    let currentAngle = -Math.PI / 2;
    let progress = Math.min(1, animationProgress / animationDuration);
    progress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);

    dataWrChart.forEach((item, index) => {
        const sliceAngle = (item.value / total) * Math.PI * 2;
        const endAngle = currentAngle + sliceAngle * progress;

        const itemDelay = index * 300;
        const itemProgress = Math.max(0, Math.min(1, (animationProgress - itemDelay) / 800));

        if (itemProgress > 0) {
            const animateWrChartdEndAngle = currentAngle + sliceAngle * itemProgress;
            drawDonutSegment(currentAngle, animateWrChartdEndAngle, item.color1, item.color2);
        }

        if (itemProgress >= 0.8) {
            drawLabelWrChart(item, currentAngle, currentAngle + sliceAngle, 1000 + index * 300);
        }

        currentAngle += sliceAngle;
    });

    drawCenterText();

    if (animationProgress < animationDuration + 1500) {
        requestAnimationFrame(animateWrChart);
    }
}

// Jalankan saat halaman load
loadWrChartData();

// Initialisasi
window.addEventListener('resize', () => {
    resizeCanvas();
    resizeBalanceCanvas();
});