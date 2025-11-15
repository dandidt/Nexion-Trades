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

// ======================= Chart BALANCE ======================= //
const canvasBalance = document.getElementById('chartCanvasBalance');
const ctxBalance = canvasBalance.getContext('2d');
const tooltipBalance = document.getElementById('tooltip-balance');
const dateLabel = document.getElementById('dateLabelBalance');
        
let balanceFullData = [];
let balanceCurrentData = [];
let currentFilterRange = 'all';
let balanceTimeWindow = null;
let balanceAnimationProgress = 1;
let balanceOldPoints = [];
let balanceTargetPoints = [];
let balanceAnimationFrameId = null;


function formatBalanceTime24(date) {
    return date.toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit'
    });
}

async function loadTradeHistory() {
    try {
        const tradeData = await getDB();
        if (!Array.isArray(tradeData) || tradeData.length === 0) {
            console.warn('Data trading kosong');
            balanceFullData = [];
            balanceCurrentData = [];
            resizeBalanceCanvas();
            return;
        }

        const sortedTrades = tradeData
            .filter(t => t.date)
            .sort((a, b) => a.date - b.date);

        let cumulativeBalance = 0;
        const processedData = [];

        for (const entry of sortedTrades) {
            if (entry.action === 'Deposit' || entry.action === 'Withdraw') {
                const val = Number(entry.value) || 0;
                cumulativeBalance += val;
                processedData.push({
                    date: new Date(Number(entry.date)),
                    balance: parseFloat(cumulativeBalance.toFixed(2)),
                    tradeNumber: entry.tradeNumber,
                    PnL: val,
                    action: entry.action
                });
                continue;
            }

            if (entry.Pnl !== undefined && entry.Pnl !== null) {
                const pnl = Number(entry.Pnl) || 0;
                cumulativeBalance += pnl;
                processedData.push({
                    date: new Date(Number(entry.date)),
                    balance: parseFloat(cumulativeBalance.toFixed(2)),
                    tradeNumber: entry.tradeNumber,
                    PnL: pnl
                });
            }
        }

        const firstDate = new Date(Number(sortedTrades[0]?.date || Date.now()));
        const zeroPointDate = new Date(firstDate.getTime() - 2000);

        balanceFullData = [
            { date: zeroPointDate, balance: 0 },
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

    const userTimezone = localStorage.getItem('timezone') || Intl.DateTimeFormat().resolvedOptions().timeZone;
    const now = new Date();

    const todayInTz = new Date(now.toLocaleDateString('sv-SE', { timeZone: userTimezone }) + 'T00:00:00');
    const nowInTz = new Date(now.toLocaleString('en-US', { timeZone: userTimezone }));

    const referenceTime = new Date(todayInTz.getTime() + (now.getTime() - nowInTz.getTime()));

    if (nowInTz < todayInTz) {
        referenceTime.setDate(referenceTime.getDate() - 1);
    }

    if (range === 'all') {
        balanceTimeWindow = null;
    } else if (range === '24h') {
        const start = new Date(referenceTime);
        const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
        balanceTimeWindow = { start, end };
    } else if (range === '1w') {
        const start = new Date(referenceTime);
        start.setDate(referenceTime.getDate() - 6);
        const end = new Date(referenceTime.getTime() + 24 * 60 * 60 * 1000);
        balanceTimeWindow = { start, end };
    } else if (range === '1m') {
        const start = new Date(referenceTime);
        start.setDate(referenceTime.getDate() - 29);
        const end = new Date(referenceTime.getTime() + 24 * 60 * 60 * 1000);
        balanceTimeWindow = { start, end };
    }

    updateFilterStats(range);
    
    // BARU: Simpan posisi lama sebelum menggambar yang baru
    balanceOldPoints = balancePoints.length > 0 ? [...balancePoints] : [];
    
    // BARU: Reset progress dan mulai animasi
    balanceAnimationProgress = 0;
    startBalanceAnimation();
}

function startBalanceAnimation() {
    if (balanceAnimationFrameId) {
        cancelAnimationFrame(balanceAnimationFrameId);
    }
    
    const duration = 600; // ms
    const startTime = performance.now();
    
    function animate(currentTime) {
        const elapsed = currentTime - startTime;
        balanceAnimationProgress = Math.min(elapsed / duration, 1);
        
        // Easing function (ease-out-cubic untuk smooth ending)
        const eased = 1 - Math.pow(1 - balanceAnimationProgress, 3);
        
        drawBalanceChart(eased);
        
        if (balanceAnimationProgress < 1) {
            balanceAnimationFrameId = requestAnimationFrame(animate);
        } else {
            balanceAnimationFrameId = null;
        }
    }
    
    balanceAnimationFrameId = requestAnimationFrame(animate);
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

    const finalBalance = balanceFullData[balanceFullData.length - 1].balance;
    valueEl.textContent = formatBalanceCurrency(finalBalance);

    let pnlInRange = 0;

    if (range === 'all') {
        const initialBalance = balanceFullData[0]?.balance || 0;
        pnlInRange = finalBalance - initialBalance;
    } else if (balanceTimeWindow) {
        const dataBeforeOrInWindow = balanceFullData
            .filter(d => d.date <= balanceTimeWindow.end)
            .sort((a, b) => a.date - b.date);

        if (dataBeforeOrInWindow.length === 0) {
            pnlInRange = 0;
        } else {
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

function formatBalanceCurrency(value) {
    return '$' + value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatBalanceDateShort(date) {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatBalanceDateFull(date) {
    return date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
}

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

let balanceChartArea = {};
let balancePoints = [];
let balanceCurrentChartColor = 'rgb(13, 185, 129)';

function drawBalanceChart(animProgress = 1) {
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

    // --- Bagian Pembuatan Sumbu Y (Tetap Sama) ---
    let relevantBalances = [];

    if (currentFilterRange === 'all') {
        relevantBalances = balanceFullData.map(d => d.balance);
    } else if (balanceTimeWindow) {
        const upToWindow = balanceFullData
            .filter(d => d.date <= balanceTimeWindow.end)
            .map(d => d.balance);
        if (upToWindow.length > 0) {
            relevantBalances = upToWindow;
        } else {
            relevantBalances = balanceFullData.map(d => d.balance);
        }
    } else {
        relevantBalances = balanceFullData.map(d => d.balance);
    }

    const minBalance = Math.min(...relevantBalances) * 0.9;
    const maxBalance = Math.max(...relevantBalances) * 1.1;
    const rangeBalance = maxBalance - minBalance || 1;

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

    const padding = { top: 10, right: 20, bottom: 35, left: dynamicLeftPadding };

    balanceChartArea = {
        left: padding.left,
        right: canvasBalance.width - padding.right,
        top: padding.top,
        bottom: canvasBalance.height - padding.bottom,
        width: canvasBalance.width - padding.left - padding.right,
        height: canvasBalance.height - padding.top - padding.bottom
    };

    ctxBalance.font = '12px Inter';
    ctxBalance.fillStyle = 'rgb(163, 163, 163)';
    ctxBalance.textAlign = 'right';
    const ySteps = 5;
    for (let i = 0; i <= ySteps; i++) {
        const value = minBalance + (rangeBalance * (i / ySteps));
        const y = balanceChartArea.bottom - (balanceChartArea.height * i / ySteps);
        ctxBalance.fillText(formatBalanceCurrency(value), balanceChartArea.left - 10, y + 4);
    }

    // --- Bagian Pembuatan Titik-Titik Data untuk Grafik ---
    let fullDates = [];
    let axisStart, axisEnd;

    if (currentFilterRange === '24h' && balanceTimeWindow) {
        axisStart = new Date(balanceTimeWindow.start);
        axisEnd = new Date(balanceTimeWindow.end);
        for (let i = 0; i <= 12; i++) {
            const time = new Date(axisStart.getTime() + i * 2 * 60 * 60 * 1000);
            if (time <= axisEnd) {
                fullDates.push(time);
            }
        }
    } else if ((currentFilterRange === '1w' || currentFilterRange === '1m') && balanceTimeWindow) {
        axisStart = new Date(balanceTimeWindow.start);
        axisEnd = new Date(balanceTimeWindow.end);
        let currentDate = new Date(axisStart);
        while (currentDate <= axisEnd) {
            fullDates.push(new Date(currentDate));
            currentDate.setDate(currentDate.getDate() + 1);
        }
    } else {
        if (balanceFullData.length === 0) {
            axisStart = new Date();
            axisEnd = new Date();
            fullDates = [new Date()];
        } else {
            const sortedFullData = [...balanceFullData].sort((a, b) => a.date - b.date);
            
            const firstDataDate = new Date(sortedFullData[0].date);
            const lastDataDate = new Date(sortedFullData[sortedFullData.length - 1].date);

            axisStart = new Date(firstDataDate);
            axisStart.setHours(8, 0, 0, 0);

            axisEnd = new Date(lastDataDate);
            axisEnd.setHours(8, 0, 0, 0);
            axisEnd.setDate(axisEnd.getDate() + 1);

            const numLabels = 14;
            const totalDuration = axisEnd.getTime() - axisStart.getTime();

            if (totalDuration === 0) {
                fullDates = [new Date(axisStart)];
            } else {
                for (let i = 0; i < numLabels; i++) {
                    const ratio = i / (numLabels - 1);
                    const interpolatedTime = axisStart.getTime() + (totalDuration * ratio);
                    fullDates.push(new Date(interpolatedTime));
                }
            }
        }
    }

    if (fullDates.length === 0) {
        fullDates = balanceCurrentData.map(d => new Date(d.date));
        if (fullDates.length === 0) return;
        axisStart = fullDates[0];
        axisEnd = fullDates[fullDates.length - 1];
    }

    let lastBalance = balanceFullData.length > 0 ? balanceFullData[0].balance : 0;
    const sortedFullData = [...balanceFullData].sort((a, b) => a.date - b.date);

    balancePoints = fullDates.map(d => {
        const match = sortedFullData
            .filter(t => t.date.getTime() <= d.getTime())
            .pop();

        if (match) {
            lastBalance = match.balance;
        }

        const normalizedValue = (lastBalance - minBalance) / rangeBalance;
        const y = balanceChartArea.bottom - (balanceChartArea.height * normalizedValue);

        const timeRange = axisEnd.getTime() - axisStart.getTime();
        const tRatio = timeRange !== 0 ? (d.getTime() - axisStart.getTime()) / timeRange : 0;
        const x = balanceChartArea.left + tRatio * balanceChartArea.width;

        return {
            x,
            y,
            date: d,
            balance: lastBalance,
            isData: !!match
        };
    });

    // Animasion
    balanceTargetPoints = [...balancePoints];
    
    if (animProgress < 1 && balanceOldPoints.length > 0) {
        // Interpolasi antara posisi lama dan baru
        balancePoints = balancePoints.map((newPoint, i) => {
            // Cari titik terdekat di array lama berdasarkan timestamp
            let oldPoint = balanceOldPoints[i];
            
            // Jika jumlah titik berbeda, cari yang paling mendekati
            if (!oldPoint || balanceOldPoints.length !== balanceTargetPoints.length) {
                const closestOld = balanceOldPoints.reduce((prev, curr) => {
                    return Math.abs(curr.date - newPoint.date) < Math.abs(prev.date - newPoint.date) ? curr : prev;
                });
                oldPoint = closestOld;
            }
            
            return {
                x: oldPoint.x + (newPoint.x - oldPoint.x) * animProgress,
                y: oldPoint.y + (newPoint.y - oldPoint.y) * animProgress,
                date: newPoint.date,
                balance: oldPoint.balance + (newPoint.balance - oldPoint.balance) * animProgress,
                isData: newPoint.isData
            };
        });
    }

    // --- Bagian Menggambar Grafik ---
    let lineColor = 'rgb(13, 185, 129)';
    let gradientStart = 'rgba(13, 185, 129, 0.65)';

    const sortedData = [...balanceFullData].sort((a, b) => a.date - b.date);

    if (sortedData.length === 0) {
    } else if (currentFilterRange === 'all') {
        const startBalance = sortedData[0].balance;
        const endBalance = sortedData[sortedData.length - 1].balance;
        if (endBalance < startBalance) lineColor = 'rgb(239, 68, 68)';
        gradientStart = lineColor === 'rgb(13, 185, 129)' 
            ? 'rgba(13, 185, 129, 0.65)' 
            : 'rgba(239, 68, 68, 0.65)';
    } else if (balanceTimeWindow) {
        const dataAtOrBeforeStart = sortedData
            .filter(d => d.date <= balanceTimeWindow.start)
            .pop();

        const dataAtOrBeforeEnd = sortedData
            .filter(d => d.date <= balanceTimeWindow.end)
            .pop();

        let startBalance, endBalance;

        if (dataAtOrBeforeStart) {
            startBalance = dataAtOrBeforeStart.balance;
        } else {
            startBalance = sortedData[0].balance;
        }

        if (dataAtOrBeforeEnd) {
            endBalance = dataAtOrBeforeEnd.balance;
        } else {
            endBalance = startBalance;
        }

        if (endBalance < startBalance) {
            lineColor = 'rgb(239, 68, 68)';
            gradientStart = 'rgba(239, 68, 68, 0.65)';
        }
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

    let shadowColor;
    if (lineColor === 'rgb(13, 185, 129)') {
        shadowColor = 'rgba(13, 185, 129, 0.4)';
    } else if (lineColor === 'rgb(239, 68, 68)') {
        shadowColor = 'rgba(239, 68, 68, 0.4)';
    } else {
        shadowColor = 'rgba(13, 185, 129, 0.4)';
    }

    ctxBalance.strokeStyle = lineColor;
    ctxBalance.lineWidth = 3;
    ctxBalance.lineJoin = 'round';
    ctxBalance.lineCap = 'round';
    ctxBalance.shadowColor = shadowColor;
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

    if (showCircles) {
        ctxBalance.fillStyle = 'rgb(245, 245, 245)';
        balancePoints.forEach(p => {
            if (p.isData) {
                ctxBalance.beginPath();
                ctxBalance.arc(p.x, p.y, 2, 0, Math.PI * 2);
                ctxBalance.fill();
            }
        });
    }

    // --- Bagian Baru: Menggambar Label Sumbu X ---
    ctxBalance.fillStyle = 'rgb(163, 163, 163)';
    ctxBalance.font = '11px Inter';
    ctxBalance.textAlign = 'center';

    if (currentFilterRange === '24h') {
        balancePoints.forEach((p, i) => {
            ctxBalance.fillText(formatBalanceTime24(p.date), p.x, balanceChartArea.bottom + 20);
        });
    } else if (currentFilterRange === '1w' || currentFilterRange === '1m') {
        const maxLabels = currentFilterRange === '1w' ? 8 : 15;
        const totalPoints = balancePoints.length;

        let step = 1;
        if (totalPoints > maxLabels) {
            step = Math.ceil(totalPoints / maxLabels);
        }

        for (let i = 0; i < balancePoints.length; i += step) {
            ctxBalance.fillText(formatBalanceDateShort(balancePoints[i].date), balancePoints[i].x, balanceChartArea.bottom + 20);
        }

        const lastPointIndex = balancePoints.length - 1;
        if (lastPointIndex > 0 && (lastPointIndex % step !== 0 || step === 1)) {
            const lastPoint = balancePoints[lastPointIndex];
            const lastPointWasWrittenByLoop = (lastPointIndex % step === 0);
            if (!lastPointWasWrittenByLoop) {
                ctxBalance.fillText(formatBalanceDateShort(lastPoint.date), lastPoint.x, balanceChartArea.bottom + 20);
            }
        }

    // --- Bagian Baru: Menggambar Label Sumbu X ---
    } else { // currentFilterRange === 'all'
        const chooseLabelFormat = (date, index, allPoints) => {
            if (index === 0 || index === allPoints.length - 1) {
                return formatBalanceDateShort(date);
            }

            const prevDate = allPoints[index - 1].date;
            if (prevDate.toDateString() !== date.toDateString()) {
                return formatBalanceDateShort(date);
            } else {
                return formatBalanceTime24(date);
            }
        };

        balancePoints.forEach((point, i) => {
            const label = chooseLabelFormat(point.date, i, balancePoints);
            ctxBalance.fillText(label, point.x, balanceChartArea.bottom + 20);
        });
    }

    // --- Bagian Menampilkan Circle Terakhir (Tetap Sama) ---
    const last = balancePoints[balancePoints.length - 1];
    if (last && circlebalance) {
        circlebalance.style.display = 'block';
        circlebalance.style.left = `${last.x}px`;
        circlebalance.style.top = `${last.y}px`;
    } else if (circlebalance) {
        circlebalance.style.display = 'none';
    }
}

let balanceLastPoint = null;

canvasBalance.addEventListener('mousemove', (e) => {

    if (balanceAnimationFrameId) {
        cancelAnimationFrame(balanceAnimationFrameId);
        balanceAnimationFrameId = null;
        balanceAnimationProgress = 1;
        drawBalanceChart(1);
    }

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
        canvasBalance.style.cursor = 'default';
        tooltipBalance.style.display = "none";
        dateLabel.style.display = "none";
        drawBalanceChart();
        balanceLastPoint = null;
        return;
    }

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

    ctxBalance.strokeStyle = balanceCurrentChartColor;
    ctxBalance.lineWidth = 1;
    ctxBalance.setLineDash([5, 5]);
    ctxBalance.beginPath();
    ctxBalance.moveTo(closestPoint.x, balanceChartArea.top);
    ctxBalance.lineTo(closestPoint.x, balanceChartArea.bottom);
    ctxBalance.stroke();
    ctxBalance.setLineDash([]);

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

loadTradeHistory().then(() => {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            filterData(btn.dataset.range);
        });
    });
    document.querySelector('.filter-btn[data-range="24h"]').classList.add('active');
    filterData('24h');
});

// ======================= Chart PnL & RR ======================= //
const canvas = document.getElementById('chartCanvas');
const ctx = canvas.getContext('2d');
const tooltip = document.getElementById('tooltip');
const tooltipDate = document.getElementById('tooltipDate');
const tooltipPnL = document.getElementById('tooltipPnL');
const tooltipRR = document.getElementById('tooltipRR');

let mousePos = { x: 0, y: 0, active: false };

function resizeCanvas() {
    const container = canvas.parentElement;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    if (width <= 0 || height <= 0) return;

    canvas.width = width;
    canvas.height = height;

    if (data && data.length > 0) {
        drawChart();
    }
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
        return [];
    }
}

let data = [];

loadData().then(loadedData => {
    data = loadedData;
    drawChart();
});

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

    if (width <= 0 || height <= 0) {
        console.warn("Canvas belum siap, skip render");
        return;
    }

    canvas.width = width;
    canvas.height = height;
    
    const padding = { top: 20, right: 60, bottom: 30, left: 80 };
    ctx.clearRect(0, 0, width, height);

    if (!Array.isArray(data) || data.length === 0) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.font = '700 55px TASA Explorer';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Nexion Trades', width / 2, height / 2);
        return;
    }

    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    if (data.length === 0) return;

    ctx.strokeStyle = 'rgba(38, 38, 38, 0.65)';
    ctx.lineWidth = 1;

    for (let i = 0; i <= 10; i++) {
        const y = padding.top + (chartHeight / 10) * i;
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(width - padding.right, y);
        ctx.stroke();
    }

    const pnlValues = data.map(d => d.pnl);
    const rrValues = data.map(d => d.rr);
    const minPnl = Math.min(...pnlValues);
    const maxPnl = Math.max(...pnlValues);
    const minRR = Math.min(...rrValues);
    const maxRR = Math.max(...rrValues);

    const rangePnl = maxPnl - minPnl || 1;
    const rangeRR = maxRR - minRR || 1;

    ctx.strokeStyle = '#00ffcc';
    ctx.lineWidth = 2;
    ctx.beginPath();
    const pnlPoints = data.map((point, i) => ({
        x: padding.left + (i / (data.length - 1)) * chartWidth,
        y: padding.top + chartHeight - ((point.pnl - minPnl) / rangePnl) * chartHeight
    }));
    drawSmoothPath(ctx, pnlPoints);
    ctx.stroke();

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

    ctx.strokeStyle = '#ff9500';
    ctx.lineWidth = 2;
    ctx.beginPath();
    const rrPoints = data.map((point, i) => ({
        x: padding.left + (i / (data.length - 1)) * chartWidth,
        y: padding.top + chartHeight - ((point.rr - minRR) / rangeRR) * chartHeight
    }));
    drawSmoothPath(ctx, rrPoints);
    ctx.stroke();

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

    const numLabels = 10;

    ctx.fillStyle = '#00ffcc';
    ctx.font = '10px Inter';
    ctx.textAlign = 'right';
    for (let i = 0; i <= numLabels; i++) {
        const value = minPnl + (rangePnl * (i / numLabels));
        const y = padding.top + ((numLabels - i) / numLabels) * chartHeight;
        const label = `$${FormatUSD(value)}`;
        ctx.fillText(label, padding.left - 10, y + 3);
    }

    ctx.fillStyle = '#ff9500';
    ctx.textAlign = 'left';
    for (let i = 0; i <= numLabels; i++) {
        const value = minRR + (rangeRR * (i / numLabels));
        const y = padding.top + ((numLabels - i) / numLabels) * chartHeight;
        const label = FormatRR(value);
        ctx.fillText(label, width - padding.right + 10, y + 3);
    }

    ctx.strokeStyle = 'rgba(255, 255, 255, 1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding.left, height - padding.bottom);
    ctx.lineTo(width - padding.right, height - padding.bottom);
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255, 255, 255, 1)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 1)';
    ctx.lineWidth = 1;

    const labelInterval = Math.ceil(data.length / 10);

    for (let i = 0; i < data.length; i += labelInterval) {
        const point = data[i];
        const x = padding.left + (i / (data.length - 1)) * chartWidth;
        const yLabel = height - padding.bottom + 20;

        const date = new Date(point.date);
        const label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

        ctx.fillText(label, x, yLabel);

        const tickTop = height - padding.bottom;
        ctx.beginPath();
        ctx.moveTo(x, tickTop);
        ctx.lineTo(x, tickTop + 6);
        ctx.stroke();
    }

    if (mousePos.active && data.length > 0 && mousePos.x >= padding.left && mousePos.x <= width - padding.right) {
        const dataIndex = Math.max(0, Math.min(Math.round(((mousePos.x - padding.left) / chartWidth) * (data.length - 1)), data.length - 1));
        const point = data[dataIndex];

        if (point) {
            const x = padding.left + (dataIndex / (data.length - 1)) * chartWidth;
            const y = mousePos.y;

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

            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 4]);

            ctx.beginPath();
            ctx.moveTo(x, padding.top);
            ctx.lineTo(x, height - padding.bottom);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(padding.left, y);
            ctx.lineTo(width - padding.right, y);
            ctx.stroke();
            ctx.setLineDash([]);

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

            ctx.beginPath();
            ctx.arc(mousePos.x, mousePos.y, 6, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.lineWidth = 1;
            ctx.fill();
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(mousePos.x, mousePos.y, 4, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(10, 15, 20, 1)';
            ctx.fill();
        }
    }

}

canvas.addEventListener('mousemove', (e) => {
    if (!data || data.length === 0) return; // 🛡️

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    mousePos.x = x * scaleX;
    mousePos.y = y * scaleY;
    mousePos.active = true;

    const padding = { left: 80, right: 60, top: 20, bottom: 40 };
    const chartWidth = canvas.width - padding.left - padding.right;

    if (
        mousePos.x >= padding.left &&
        mousePos.x <= canvas.width - padding.right &&
        mousePos.y >= padding.top &&
        mousePos.y <= canvas.height - padding.bottom
    ) {
        canvas.style.cursor = 'none';
        const dataIndex = Math.max(0, Math.min(Math.round(((mousePos.x - padding.left) / chartWidth) * (data.length - 1)), data.length - 1));
        const point = data[dataIndex];
        if (!point) return;

        const d = point.date instanceof Date ? point.date : new Date(point.date);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        let hours = d.getHours();
        const minutes = String(d.getMinutes()).padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12 || 12;
        const dateStr = `${day}/${month}/${year} ${String(hours).padStart(2,'0')}:${minutes} ${ampm}`;

        tooltipDate.textContent = dateStr;
        tooltipPnL.textContent = `$${FormatUSD(point.pnl)}`;
        tooltipRR.textContent = `${FormatRR(point.rr)}`;
        tooltip.style.display = 'block';

        let tooltipX = e.clientX - rect.left + 40;
        let tooltipY = e.clientY - rect.top - 94;
        if (tooltipX + 200 > rect.width) tooltipX -= 250;
        if (tooltipY < 0) tooltipY += 100;
        tooltip.style.left = tooltipX + 'px';
        tooltip.style.top = tooltipY + 'px';
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
    const radarPnl = document.getElementById('radarPnl');
    const radarRR = document.getElementById('radarRR');
    if (radarPnl) radarPnl.style.display = 'none';
    if (radarRR) radarRR.style.display = 'none';
    drawChart();
});


function initChart() {
    if (!canvas || !ctx) return;
    
    resizeCanvas();
    
    loadData().then(loadedData => {
        data = loadedData;
        drawChart();
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initChart);
} else {
    setTimeout(initChart, 0);
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// ======================= Chart Pairs ======================= //
const cryptoData = { btc: 0, eth: 0, sol: 0 };
const circumference = 2 * Math.PI * 100;

function updateTooltipText() {
    document.querySelector('#btcTooltip .tooltip-value-pairs').textContent = cryptoData.btc.toFixed(2) + '%';
    document.querySelector('#ethTooltip .tooltip-value-pairs').textContent = cryptoData.eth.toFixed(2) + '%';
    document.querySelector('#solTooltip .tooltip-value-pairs').textContent = cryptoData.sol.toFixed(2) + '%';
}

function updateIdentifiers() {
    const identifiers = [
        { key: 'btc', selector: '.bx-in-identifier:nth-child(1)' },
        { key: 'eth', selector: '.bx-in-identifier:nth-child(2)' },
        { key: 'sol', selector: '.bx-in-identifier:nth-child(3)' }
    ];

    identifiers.forEach(({ key, selector }) => {
        const el = document.querySelector(selector);
        if (!el) return;

        if (cryptoData[key] > 0) {
            el.style.display = 'flex';
        } else {
            el.style.display = 'none';
        }
    });
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
        updateIdentifiers();

    } catch (err) {
        console.error("Gagal memuat data trading:", err);
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
    const midPercent = offset + percentage / 2;
    const angle = (midPercent / 100) * 2 * Math.PI - Math.PI / 2;
    const radius = 120;
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

['btcSegment', 'ethSegment', 'solSegment'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
        el.addEventListener('mouseenter', () => el.style.filter = 'brightness(1.2)');
        el.addEventListener('mouseleave', () => el.style.filter = 'brightness(1)');
    }
});

function setCryptoData(btc, eth, sol) {
    cryptoData.btc = btc;
    cryptoData.eth = eth;
    cryptoData.sol = sol;
    updateChartPairs();
    setupTooltips();
    updateTooltipText();
}

async function updateTotalPairs() {
    try {
        const data = await getDB();
        const uniquePairs = new Set();

        data.forEach(item => {
            const pair = item.Pairs?.toUpperCase();
            if (!pair) return;
            if (pair.includes("BTC")) uniquePairs.add("BTC");
            else if (pair.includes("ETH")) uniquePairs.add("ETH");
            else if (pair.includes("SOL")) uniquePairs.add("SOL");
        });

        document.querySelector('.total-value-pairs').textContent = uniquePairs.size;
    } catch (err) {
        console.error("Gagal menghitung total pairs:", err);
    }
}

updateTotalPairs();

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadCryptoData);
} else {
    loadCryptoData();
}

// ======================= Chart Winrate ======================= //
const canvasWrChart = document.getElementById('donutChart');
const ctxWrChart = canvasWrChart.getContext('2d');
const circumferenceSVG = 2 * Math.PI * 82.5;

function resizeWrChart() {
    const parent = canvasWrChart.parentElement;
    const parentWidth = parent.clientWidth;
    const parentHeight = parent.clientHeight;
    const dpr = window.devicePixelRatio || 1;

    canvasWrChart.style.width = parentWidth + 'px';
    canvasWrChart.style.height = parentHeight + 'px';

    canvasWrChart.width = Math.round(parentWidth * dpr);
    canvasWrChart.height = Math.round(parentHeight * dpr);

    ctxWrChart.setTransform(1, 0, 0, 1, 0, 0);
    ctxWrChart.scale(dpr, dpr);

    const centerX = parentWidth / 2;
    const centerY = parentHeight / 2;

    ctxWrChart.imageSmoothingEnabled = false;

    return { centerX, centerY };
}

let { centerX, centerY } = resizeWrChart();
window.addEventListener('resize', () => {
    const newCenter = resizeWrChart();
    centerX = newCenter.centerX;
    centerY = newCenter.centerY;

    if (dataWrChart.length > 0) {
        startTime = null;
        updateSVGRing();
        setTimeout(() => requestAnimationFrame(animateWrChart), 50);
    }
});

const radius = 100;
const holeRadius = 65;

let dataWrChart = [];
let total = 0;

let animationProgress = 0;
const animationDuration = 500;
let startTime = null;

function updateSVGRing() {
    if (total === 0) return;

    const winPercentage = (dataWrChart[0].value / total) * 100;
    const losePercentage = (dataWrChart[1].value / total) * 100;
    const missedPercentage = (dataWrChart[2].value / total) * 100;

    const winLength = (winPercentage / 100) * circumferenceSVG;
    const loseLength = (losePercentage / 100) * circumferenceSVG;
    const missedLength = (missedPercentage / 100) * circumferenceSVG;

    const winSegment = document.getElementById('winSegment');
    const loseSegment = document.getElementById('loseSegment');
    const missedSegment = document.getElementById('missedSegment');

    if (!winSegment || !loseSegment || !missedSegment) return;

    winSegment.style.strokeDasharray = `${winLength} ${circumferenceSVG}`;
    winSegment.style.strokeDashoffset = '0';

    loseSegment.style.strokeDasharray = `${loseLength} ${circumferenceSVG}`;
    loseSegment.style.strokeDashoffset = -winLength;

    missedSegment.style.strokeDasharray = `${missedLength} ${circumferenceSVG}`;
    missedSegment.style.strokeDashoffset = -(winLength + loseLength);
}

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
            { label: 'Win', value: counts.Profite, color1: '#4dd4ac', color2: '#4dd4ac' },
            { label: 'Lose', value: counts.Loss, color1: '#ff0000', color2: '#ff0000' },
            { label: 'Missed', value: counts.Missed, color1: '#ffffff', color2: '#ffffff' }
        ];

        total = dataWrChart.reduce((sum, item) => sum + item.value, 0);

        updateSVGRing();
        requestAnimationFrame(animateWrChart);
    } catch (err) {
        console.error("Gagal memuat data WR:", err);
    }
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

    ctxWrChart.strokeStyle = item.color2;
    ctxWrChart.lineWidth = 2;
    ctxWrChart.globalAlpha = progress;
    ctxWrChart.beginPath();
    ctxWrChart.moveTo(lineStartX, lineStartY);
    ctxWrChart.lineTo(lineMidX, lineMidY);
    ctxWrChart.lineTo(lineEndX, lineEndY);
    ctxWrChart.stroke();

    ctxWrChart.fillStyle = item.color1;
    ctxWrChart.beginPath();
    ctxWrChart.arc(lineEndX, lineEndY, 4, 0, Math.PI * 2);
    ctxWrChart.fill();

    ctxWrChart.textAlign = align;
    ctxWrChart.fillStyle = 'rgb(245, 245, 245)';
    ctxWrChart.font = 'bold 14px Inter';
    ctxWrChart.fillText(percentage, textX, lineEndY - 10);

    ctxWrChart.fillStyle = 'rgb(163, 163, 163)';
    ctxWrChart.font = '600 12px Inter';
    ctxWrChart.fillText(item.label, textX, lineEndY + 18);

    ctxWrChart.globalAlpha = 1;
}

function drawCenterText() {
    const progress = Math.max(0, Math.min(1, (animationProgress - 1200) / 300));
    if (progress <= 0) return;

    ctxWrChart.globalAlpha = progress;
    ctxWrChart.fillStyle = 'rgb(245, 245, 245)';
    ctxWrChart.font = 'bold 24px Inter';
    ctxWrChart.textAlign = 'center';
    ctxWrChart.fillText(total.toLocaleString('id-ID'), centerX, centerY + 10);
    ctxWrChart.globalAlpha = 1;
}

function animateWrChart(timestamp) {
    if (!startTime) startTime = timestamp;
    animationProgress = timestamp - startTime;

    ctxWrChart.clearRect(0, 0, canvasWrChart.width, canvasWrChart.height);

    let currentAngle = -Math.PI / 2;

    dataWrChart.forEach((item, index) => {
        const sliceAngle = (item.value / total) * Math.PI * 2;
        const itemDelay = index * 300;
        const itemProgress = Math.max(0, Math.min(1, (animationProgress - itemDelay) / 800));

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

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadWrChartData);
} else {
    loadWrChartData();
}

// UPDATE GLOBAL
window.addEventListener('resize', () => {
    resizeCanvas();
    resizeBalanceCanvas();
});

window.addEventListener('tradeDataUpdated', async () => {
    console.log('🔄 RENDER CHART SELESAI');
    // Balance Chart
    await loadTradeHistory();
    
    const activeBtn = document.querySelector('.filter-btn.active');
    const currentRange = activeBtn ? activeBtn.dataset.range : '24h';
    
    updateFilterStats(currentRange);
    drawBalanceChart();

    // Update Chart PnL & RR
    const loadedData = await loadData();
    data = loadedData;
    drawChart();
    
    // Update Chart Pairs
    await loadCryptoData();
    await updateTotalPairs();
    
    // Update Chart Winrate
    await loadWrChartData();
});