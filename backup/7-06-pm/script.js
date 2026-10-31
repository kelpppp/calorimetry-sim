// ============================================================
// script.js — PAGE LOGIC
// ============================================================
// Reads the inputs, calls the physics engine, drives the animations,
// fills the panels/table/graphs, and runs the step-by-step guide.
//
// Depends on:  engine.js (physics) · content.js (text) · Chart.js (graphs)
//
// How the page works (the short version):
//   1. "New investigation" asks which input to vary (mass or metal).
//   2. Each RUN = choose inputs -> metal goes into calorimeter, lid closes ->
//      START -> the graph draws for 5 s -> result, table row, trend graph update.
//   3. After TARGET_RUNS runs the investigation is complete.
//   4. The Walkthrough (Next button) walks through each run. It can be turned
//      off after the first investigation ("free mode"): then START does the
//      whole sequence by itself.
//
// Sections: 1 config · 2 DOM · 3 state · 4 helpers · 5 charts · 6 panels
//           7 controls · 8 guide + explanation · 9 animations · 10 run
//           11 handlers · 12 init
// ============================================================


// ---------- 1. CONFIG (easy to change) ----------
const TARGET_RUNS = 5;          // runs per investigation
const PLAYBACK_SECONDS = 5;     // how long the graph takes to draw (real seconds)
const METAL_MOVE_MS = 1400;     // metal moving into the calorimeter
const LID_MS = 800;             // lid closing
const MASS_DEFAULT = 0.10;      // kg — slider value after a reset
const METAL_MAX_SCALE = 1.3;    // metal picture size at the largest mass (1 = size at the smallest mass)
const TYPE_MIN_CPS = 90;         // Explanation typing speed: characters per second (minimum)
const TYPE_MAX_SECONDS = 4;     // ...but long explanations never take longer than this
const COLORS = { metal: '#e67e22', water: '#2e86de', trend: '#2c3e50' };


// ---------- 2. DOM REFERENCES ----------
const $ = (id) => document.getElementById(id);
const dom = {
    stage: $('stage'), metalImg: $('metalImg'),
    metalPicker: $('metalPicker'), massPicker: $('massPicker'), massValue: $('massValue'),
    metalNote: $('metalNote'), massNote: $('massNote'),
    startBtn: $('startBtn'), startHint: $('startHint'), resetRunBtn: $('resetRunBtn'),
    newInvBtn: $('newInvBtn'), aboutBtn: $('aboutBtn'),
    statusMsg: $('statusMsg'), invSummary: $('invSummary'), runCounter: $('runCounter'),
    inName: $('inName'), inValue: $('inValue'),
    constHeldName: $('constHeldName'), constHeld: $('constHeld'),
    constWaterMass: $('constWaterMass'), constWaterC: $('constWaterC'),
    constTw: $('constTw'), constTm: $('constTm'), outTf: $('outTf'),
    explainBody: $('explainBody'), explainPanel: document.querySelector('.panel[data-card="inference"]'),
    logBody: $('logBody'), trendMsg: $('trendMsg'), trendBox: $('trendBox'),
    guideToggle: $('guideToggle'), guideToggleRow: $('guideToggleRow'),
    guideProgress: $('guideProgress'), guideTitle: $('guideTitle'),
    guideBody: $('guideBody'), nextBtn: $('nextBtn'),
    dlg: $('invDialog'), dlgForm: $('invForm'), dlgCancel: $('dlgCancel'),
    dlgWarn: $('dlgWarn'), dlgTarget: $('dlgTarget'),
    guidedRow: $('guidedRow'), guidedCheck: $('guidedCheck'),
    welcomeDlg: $('welcomeDialog'), welcomeNext: $('welcomeNext'),
    aboutDlg: $('aboutDialog'), aboutBody: $('aboutBody'),
};


// ---------- 3. STATE ----------
const app = {
    mode: null,            // 'mass' | 'metal' — which input is being varied (null = no investigation yet)
    guided: true,          // step-by-step guide on?
    everCompleted: false,  // has the user finished an investigation?
    trial1Done: false,     // has the user been through every step of trial 1? (unlocks the "turn guide off" option)
    runs: [],              // finished runs
    lastRun: null,
    // phase of the CURRENT run:
    //   'idle'      nothing placed yet; inputs editable
    //   'placing'   metal moving in / lid closing
    //   'placed'    metal in calorimeter, lid closed, waiting for START
    //   'running'   graph is being drawn
    //   'done'      run finished
    //   'resetting' lid opening / metal coming out
    phase: 'idle',
    stepIndex: 0,          // index into GUIDE_STEPS
    token: 0,              // bumped whenever a run is cancelled, so old async code stops itself
    animId: null           // requestAnimationFrame id
};

let tempChart = null;
let trendChart = null;
let lastExplainHTML = null;
let typeToken = 0;          // bumped each time the Explanation text changes, so an old typing animation stops
let isTyping = false;       // true while the Explanation text is being 'written'


// ---------- 4. SMALL HELPERS ----------
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const isComplete = () => app.runs.length >= TARGET_RUNS;
const currentStepId = () => GUIDE_STEPS[app.stepIndex].id;

function showMsg(text) { dom.statusMsg.textContent = text; }
function clearMsg() { dom.statusMsg.textContent = ''; }

function updateMassLabel() {
    dom.massValue.textContent = parseFloat(dom.massPicker.value).toFixed(2);
}

// Metal picture grows slightly with the mass slider: 1x at the minimum mass,
// METAL_MAX_SCALE at the maximum. (Kept small so it always fits in the calorimeter.)
function updateMetalSize() {
    const min = parseFloat(dom.massPicker.min);
    const max = parseFloat(dom.massPicker.max);
    const t = (parseFloat(dom.massPicker.value) - min) / (max - min);
    const scale = 1 + (METAL_MAX_SCALE - 1) * Math.min(Math.max(t, 0), 1);
    dom.stage.style.setProperty('--metal-scale', scale.toFixed(3));
}

// Context object passed to the text functions in content.js
function guideContext() {
    return {
        mode: app.mode,
        runs: app.runs,
        lastRun: app.lastRun,
        targetRuns: TARGET_RUNS,
        complete: isComplete(),
        phase: app.phase,
        // same metal every trial -> its specific heat only needs inferring once (trial 1)
        skipInfer: app.mode === 'mass' && app.runs.length > 1,
        // once a trial has finished, it is still 'this' trial until the user moves on
        runNumber: app.phase === 'done' ? app.runs.length : Math.min(app.runs.length + 1, TARGET_RUNS)
    };
}

function readInputs() {
    const metalKey = dom.metalPicker.value;
    return { metalKey, metal: METALS[metalKey], mass: parseFloat(dom.massPicker.value) };
}

// Checks the inputs before a run. Returns { ok, msg } or { ok, metalKey, metal, mass, c }.
function validateInputs() {
    const v = readInputs();
    if (!v.metal) return { ok: false, msg: 'Please choose a metal first.' };
    if (!(v.mass > 0)) return { ok: false, msg: 'Please choose a mass.' };

    // each run must use a NEW value of the input being varied
    if (app.mode === 'mass' && app.runs.some((r) => r.mass.toFixed(2) === v.mass.toFixed(2))) {
        return { ok: false, msg: `You already ran ${v.mass.toFixed(2)} kg. Choose a different mass.` };
    }
    if (app.mode === 'metal' && app.runs.some((r) => r.metalKey === v.metalKey)) {
        return { ok: false, msg: `You already ran ${v.metal.name}. Choose a different metal.` };
    }
    return { ok: true, metalKey: v.metalKey, metal: v.metal, mass: v.mass, c: v.metal.specificHeat };
}


// ---------- 5. CHARTS (Chart.js) ----------
function createCharts() {
    Chart.defaults.font.size = 10;

    const timeAxis = { type: 'linear', min: 0, max: 1, title: { display: true, text: 'Time (simulated s)' } };

    tempChart = new Chart($('tempChart'), {
        type: 'line',
        data: {
            datasets: [
                { label: 'Metal', data: [], borderColor: COLORS.metal, backgroundColor: COLORS.metal, borderWidth: 2, pointRadius: 0 },
                { label: 'Water', data: [], borderColor: COLORS.water, backgroundColor: COLORS.water, borderWidth: 2, pointRadius: 0 }
            ]
        },
        options: {
            animation: false,                 // we do our own progressive drawing
            maintainAspectRatio: false,
            plugins: { legend: { position: 'top', labels: { boxWidth: 12 } } },
            scales: {
                x: { ...timeAxis },
                y: { min: 10, max: 105, title: { display: true, text: 'Temperature (°C)' } }
            }
        }
    });

    trendChart = new Chart($('trendChart'), {
        type: 'line',
        data: {
            datasets: [
                { label: 'Final temperature', data: [], borderColor: COLORS.trend, backgroundColor: COLORS.trend,
                  borderWidth: 2, pointRadius: 5, showLine: true }
            ]
        },
        options: {
            animation: false,
            maintainAspectRatio: false,
            scales: {
                x: { type: 'linear', title: { display: true, text: '' } },
                y: { title: { display: true, text: 'Final equilibrium temperature (°C)' } }
            },
            plugins: {
                legend: { display: false },
                title: { display: true, text: '' },
                tooltip: {
                    callbacks: {
                        // raw point carries the metal name and run number
                        label: (item) => `${item.raw.metal}, trial ${item.raw.run}: ${item.parsed.y.toFixed(2)} °C`
                    }
                }
            }
        }
    });
}

const toPoints = (xs, ys) => xs.map((x, i) => ({ x: x, y: ys[i] }));

// Reveal the temperature-time graph progressively over PLAYBACK_SECONDS.
// The physics has ALREADY been calculated (runSimulation); this only controls
// how much of the finished data is drawn. Resolves when done (or cancelled).
function playGraph(result, token) {
    return new Promise((resolve) => {
        const t = result.timeHistory;
        const metalPts = toPoints(t, result.metalTempHistory);
        const waterPts = toPoints(t, result.waterTempHistory);
        const tEnd = t[t.length - 1];

        // fix the axis ranges up front so the graphs don't jump while drawing
        tempChart.options.scales.x.max = tEnd;
        for (const ds of tempChart.data.datasets) ds.data = [];
        tempChart.update('none');

        const startTime = performance.now();

        function frame(now) {
            if (token !== app.token) { resolve(); return; }   // cancelled (reset / new investigation)
            const fraction = Math.min((now - startTime) / (PLAYBACK_SECONDS * 1000), 1);
            const upTo = Math.floor(fraction * (t.length - 1)) + 1;   // how many points to show

            tempChart.data.datasets[0].data = metalPts.slice(0, upTo);
            tempChart.data.datasets[1].data = waterPts.slice(0, upTo);
            tempChart.update('none');

            if (fraction < 1) {
                app.animId = requestAnimationFrame(frame);
            } else {
                app.animId = null;
                resolve();
            }
        }
        app.animId = requestAnimationFrame(frame);
    });
}

// Trend graph: final temperature vs the input being varied.
// It is always on screen; until there are 2 finished trials it is empty (axes, labels and title only)
// and an italic note underneath says what is missing.
function updateTrendChart() {
    const n = app.runs.length;
    const isMass = app.mode !== 'metal';
    const what = isMass ? 'metal mass' : 'specific heat';
    const enough = n >= 2;

    const xKey = isMass ? 'mass' : 'c';
    trendChart.data.datasets[0].data = enough
        ? app.runs.map((r) => ({ x: r[xKey], y: r.Tf, metal: r.metalName, run: r.run })).sort((a, b) => a.x - b.x)
        : [];

    const x = trendChart.options.scales.x;
    const y = trendChart.options.scales.y;
    x.title.text = isMass ? 'Metal mass (kg)' : 'Specific heat of the metal (J/(kg·°C))';
    if (enough) {
        x.min = x.max = y.min = y.max = undefined;                 // let the data set the axis ranges
    } else {
        x.min = isMass ? 0.1 : 100;  x.max = isMass ? 0.5 : 1000;  // fixed ranges for the empty graph
        y.min = 20;                  y.max = 100;
    }
    trendChart.options.plugins.title.text = !enough
        ? `Final temperature vs. ${what}`
        : isComplete()
            ? `Final temperature vs. ${what} (complete)`
            : `Final temperature vs. ${what} (${n} of ${TARGET_RUNS} trials)`;

    dom.trendMsg.textContent = n === 0 ? 'Complete at least two trials to see the trend.'
        : n === 1 ? 'Complete one more trial to see the trend.'
        : '';
    trendChart.update('none');
}


// ---------- 6. PANELS, DATA TABLE ----------
// The metal's specific heat is deliberately NOT shown: the student infers it from the result.
const metalText = (v) => v.metal.name;

// Variables card: inputs + constants appear when START is clicked.
function fillInputsPanel(v) {
    if (app.mode === 'mass') {
        dom.inValue.textContent = `${v.mass.toFixed(2)}`;
        dom.constHeldName.textContent = 'Metal';
        dom.constHeld.textContent = metalText(v);
    } else {
        dom.inValue.textContent = metalText(v);
        dom.constHeldName.textContent = 'Metal mass';
        dom.constHeld.textContent = `${v.mass.toFixed(2)} kg`;
    }
    dom.constWaterMass.textContent = `${MASS_WATER.toFixed(2)} kg`;
    dom.constWaterC.textContent = `${SPEC_HEAT_WATER} J/(kg·°C)`;
    dom.constTw.textContent = `${INIT_TEMP_WATER} °C`;
    dom.constTm.textContent = `${INIT_TEMP_METAL} °C`;
}

// Clears everything belonging to the CURRENT run (not the data table).
function clearRunPanels() {
    for (const id of ['inValue', 'constHeld', 'constWaterMass', 'constWaterC', 'constTw', 'constTm', 'outTf']) {
        dom[id].textContent = '—';
    }
    dom.constHeldName.textContent = 'Held-constant input';
    tempChart.data.datasets.forEach((ds) => { ds.data = []; });
    tempChart.options.scales.x.max = 1;
    tempChart.update('none');
}

// Data table: 5 rows exist from the start; each finished run fills in its row.
function clearLog() {
    dom.logBody.innerHTML = '';
    for (let i = 1; i <= TARGET_RUNS; i++) {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${i}</td><td></td><td></td><td></td>`;
        dom.logBody.appendChild(tr);
    }
}

function fillLogRow(r) {
    const tr = dom.logBody.rows[r.run - 1];
    tr.cells[1].textContent = r.metalName;
    tr.cells[2].textContent = r.mass.toFixed(2);
    tr.cells[3].textContent = r.Tf.toFixed(2);
}

// Shows the chosen metal next to the calorimeter (only when nothing is in the water).
function updateMetalPreview() {
    const key = dom.metalPicker.value;
    if (METALS[key]) {
        dom.metalImg.src = `assets/metal-${key}.png`;
        dom.metalImg.alt = `${METALS[key].name} sample`;
        dom.metalImg.hidden = false;
    } else {
        dom.metalImg.hidden = true;
    }
}


// ---------- 7. CONTROLS (enable / disable everything from one place) ----------
// Call this after ANY change to app.phase, app.mode, app.runs or the guide step.
function updateControls() {
    const hasInv = app.mode !== null;
    const complete = isComplete();
    const busy = ['placing', 'placed', 'running', 'resetting'].includes(app.phase);
    const heldLocked = app.runs.length > 0;          // the input NOT being varied locks after run 1

    // In guided mode the inputs can only be edited on step 1.
    const guidedGate = !app.guided || currentStepId() === 'inputs';
    const canEdit = hasInv && !busy && !complete && guidedGate;

    dom.metalPicker.disabled = !(canEdit && !(app.mode === 'mass' && heldLocked));
    dom.massPicker.disabled = !(canEdit && !(app.mode === 'metal' && heldLocked));

    // little notes under each control
    const note = (which) => {
        if (!hasInv) return '';
        if (app.mode === which) return 'Varied in this investigation';
        return 'Set it once; held constant for all trials in this investigation';
    };
    dom.metalNote.textContent = note('metal');
    dom.massNote.textContent = note('mass');

    // Variables card label for the varied input
    dom.inName.textContent = app.mode === 'mass' ? 'Metal mass (kg)'
        : app.mode === 'metal' ? 'Metal type' : 'Varied input';

    // START
    const guidedStartOk = app.guided && currentStepId() === 'place' && app.phase === 'placed';
    const freeStartOk = !app.guided && hasInv && !complete && (app.phase === 'idle' || app.phase === 'done');
    dom.startBtn.disabled = !(guidedStartOk || freeStartOk);

    // RESET RUN / NEW INVESTIGATION
    dom.resetRunBtn.disabled = !hasInv || complete || app.phase === 'placing' || app.phase === 'resetting';
    dom.newInvBtn.disabled = app.phase === 'placing' || app.phase === 'resetting';

    // summary line + counter
    if (!hasInv) {
        dom.invSummary.textContent = 'Click NEW INVESTIGATION to begin.';
    } else {
        const varied = app.mode === 'mass' ? 'metal mass' : 'metal type';
        const held = app.mode === 'mass' ? 'metal type' : 'metal mass';
        dom.invSummary.textContent = `Varying ${varied} (${held} held constant).`;
    }
    dom.runCounter.textContent = `${app.runs.length} of ${TARGET_RUNS} trials completed`;

    // NEXT (guided mode only)
    if (app.guided) {
        const ctx = guideContext();
        const step = GUIDE_STEPS[app.stepIndex];
        let enabled = false;
        switch (step.id) {
            case 'inputs': enabled = hasInv && app.phase === 'idle' && !complete; break;
            case 'place':  enabled = app.phase === 'placed'; break;
            case 'run':    // NEXT unlocks once the 5-second run has finished
            case 'result':
            case 'infer':
            case 'trend':  enabled = app.phase === 'done'; break;
        }
        dom.nextBtn.disabled = !enabled;
        dom.nextBtn.textContent = step.nextLabel(ctx);
    }

    // guide on/off switch: appears once trial 1 is completely finished, changeable between trials only
    dom.guideToggleRow.hidden = !(hasInv && app.trial1Done);       // only after every step of trial 1 is finished
    dom.guideToggle.checked = app.guided;
    dom.guideToggle.disabled = !(app.phase === 'idle' || app.phase === 'done');

    // italic hint under START while it can't be clicked yet
    dom.startHint.textContent = (app.guided && hasInv && dom.startBtn.disabled && !dom.nextBtn.disabled)
        ? 'START isn’t available yet. Follow the Walkthrough and click NEXT to continue.'
        : '';

    renderExplanation();
    updateNudge();
}


// ---------- 8. WALKTHROUGH + EXPLANATION ----------
function renderGuide() {
    document.querySelectorAll('.panel.highlight').forEach((c) => c.classList.remove('highlight'));
    const ctx = guideContext();

    if (app.guided) {
        const step = GUIDE_STEPS[app.stepIndex];
        dom.guideProgress.textContent = `Trial ${ctx.runNumber} of ${TARGET_RUNS}`;
        dom.guideTitle.textContent = typeof step.title === 'function' ? step.title(ctx) : step.title;
        dom.guideBody.innerHTML = step.body(ctx);
        dom.nextBtn.hidden = false;

        [].concat(step.focus).forEach((name) => {
            const panel = document.querySelector(`.panel[data-card="${name}"]`);
            if (panel) panel.classList.add('highlight');
        });
    } else {
        dom.guideProgress.textContent = 'Guide off';
        dom.guideTitle.textContent = REFERENCE.title;
        dom.guideBody.innerHTML = REFERENCE.body(ctx);
        dom.nextBtn.hidden = true;
    }
}

// Explanation card: the step's physics text (guided), or the specific-heat
// walkthrough after a finished trial (guide off). Only redraws when the text changes.
function renderExplanation() {
    let html;
    if (app.guided && app.mode === null) {
        html = '';                                   // nothing to explain before an investigation starts
    } else if (app.guided) {
        html = GUIDE_STEPS[app.stepIndex].explanation(guideContext());
    } else if (app.phase === 'done' && app.lastRun) {
        html = guideContext().skipInfer ? REFERENCE.sameMetal() : buildInferenceHTML(app.lastRun);
    } else {
        html = REFERENCE.explanation(guideContext());
    }
    dom.explainPanel.hidden = !html;                 // steps with no explanation hide the card completely
    if (html !== lastExplainHTML) {
        dom.explainBody.innerHTML = html;
        lastExplainHTML = html;
        dom.explainBody.scrollTop = 0;
        typeExplanation(dom.explainBody);
    }
}

// Makes the Explanation text appear as if it is being written, to draw the eye to it.
// The full text is laid out right away (the not-yet-written part is invisible), so nothing jumps around.
function typeExplanation(container) {
    const myToken = ++typeToken;
    isTyping = false;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    // collect the text pieces first, then change them
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) {
        if (walker.currentNode.nodeValue.trim()) nodes.push(walker.currentNode);
    }
    let total = 0;
    const items = nodes.map((node) => {
        const hidden = document.createElement('span');     // holds the part not written yet
        hidden.style.visibility = 'hidden';
        node.parentNode.insertBefore(hidden, node.nextSibling);
        const item = { node, hidden, text: node.nodeValue, start: total };
        total += item.text.length;
        return item;
    });
    if (total === 0) return;

    const charsPerSecond = Math.max(TYPE_MIN_CPS, total / TYPE_MAX_SECONDS);
    const startTime = performance.now();
    isTyping = true;

    function frame(now) {
        if (myToken !== typeToken) return;                  // a newer explanation took over
        const written = Math.floor(((now - startTime) / 1000) * charsPerSecond);
        const done = written >= total;
        for (const it of items) {
            const shown = done ? it.text.length : Math.min(Math.max(written - it.start, 0), it.text.length);
            it.node.nodeValue = it.text.slice(0, shown);
            it.hidden.textContent = it.text.slice(shown);
        }
        if (done) {
            items.forEach((it) => it.hidden.remove());
            isTyping = false;
            updateNudge();                                   // writing is finished: now point at the button
        } else {
            requestAnimationFrame(frame);
        }
    }
    requestAnimationFrame(frame);
}

// Pulses the button the user should click next (guided mode only).
// NEXT waits until the explanation has been written, so the user reads before being nudged.
function updateNudge() {
    const id = currentStepId();
    // at step 2 the user is meant to click START, so NEXT is not pulsed there
    let nextReady = app.guided && !dom.nextBtn.disabled && !isTyping && id !== 'place';
    if (nextReady && id === 'inputs') nextReady = validateInputs().ok;   // only once valid inputs are chosen
    dom.nextBtn.classList.toggle('nudge', nextReady);
    dom.startBtn.classList.toggle('nudge', app.guided && !dom.startBtn.disabled && !isTyping);
}

function goToStep(id) {
    app.stepIndex = GUIDE_STEPS.findIndex((s) => s.id === id);
    renderGuide();
    updateControls();
}


// ---------- 9. ANIMATIONS (metal + lid) ----------
// Each function returns a promise that resolves when the animation is over.
// They return false if the run was cancelled in the meantime.

// Metal moves into the water, THEN the lid closes.
async function placeMetal(token) {
    dom.stage.classList.add('metal-in');
    await sleep(METAL_MOVE_MS);
    if (token !== app.token) return false;
    dom.stage.classList.add('lid-closed');
    await sleep(LID_MS);
    return token === app.token;
}

// Lid opens, THEN the metal comes back out. Also clears the run's panels and graphs.
async function resetRunVisuals() {
    if (dom.stage.classList.contains('lid-closed')) {
        dom.stage.classList.remove('lid-closed');
        await sleep(LID_MS);
    }
    if (dom.stage.classList.contains('metal-in')) {
        dom.stage.classList.remove('metal-in');
        dom.stage.classList.add('metal-out');
        await sleep(METAL_MOVE_MS);
        dom.stage.classList.remove('metal-out');
    }
    clearRunPanels();
}

// Instant version (no animation), used when a whole investigation is replaced.
function resetStageInstant() {
    dom.stage.classList.remove('lid-closed', 'metal-in', 'metal-out');
}


// ---------- 10. RUNNING AN EXPERIMENT ----------
async function runExperiment(v, token) {
    fillInputsPanel(v);                    // inputs + constants appear when START is clicked
    app.phase = 'running';
    updateControls();

    const result = runSimulation(v.mass, v.c);     // engine.js: the physics is calculated here
    await playGraph(result, token);                // ...then revealed over PLAYBACK_SECONDS
    if (token !== app.token) return;               // cancelled

    onRunComplete(v, result);
}

function onRunComplete(v, result) {
    const run = {
        run: app.runs.length + 1,
        metalKey: v.metalKey,
        metalName: v.metal.name,
        mass: v.mass,
        c: v.c,
        Tf: result.equilibriumTemp,
        dTm: result.deltaTMetal,
        dTw: result.deltaTWater,
        Q: result.maxHeatTransferred,
        cInferred: result.inferredSpecificHeat
    };
    app.runs.push(run);
    app.lastRun = run;
    app.phase = 'done';
    if (isComplete()) app.everCompleted = true;

    dom.outTf.textContent = `${run.Tf.toFixed(2)} °C`;   // output appears when the graphs are finished
    fillLogRow(run);
    updateTrendChart();

    // Guided: stay on step 3 and let the user click NEXT when ready (renderGuide updates the step text).
    // Free mode: the specific-heat walkthrough appears in the Explanation card.
    if (!app.guided && isComplete()) showMsg('Investigation complete! Click NEW INVESTIGATION to try the other input.');
    renderGuide();
    updateControls();
}


// ---------- 11. EVENT HANDLERS ----------
async function onStart() {
    const v = validateInputs();
    if (!v.ok) { showMsg(v.msg); return; }
    clearMsg();
    const token = app.token;

    if (app.guided) {
        // Guided: the metal is already in the water (step 2). START moves on to step 3 and runs.
        if (currentStepId() === 'place' && app.phase === 'placed') goToStep('run');
        else return;
    } else {
        // Free mode: START does the whole sequence.
        if (app.phase === 'done') {                    // tidy up the previous run first
            app.phase = 'resetting';
            updateControls();
            await resetRunVisuals();
            if (token !== app.token) return;
        }
        updateMetalPreview();
        app.phase = 'placing';
        updateControls();
        if (!(await placeMetal(token))) return;
    }
    await runExperiment(v, token);
}

async function onNext() {
    const id = currentStepId();
    const token = app.token;

    if (id === 'inputs') {
        const v = validateInputs();
        if (!v.ok) { showMsg(v.msg); return; }
        clearMsg();
        fillInputsPanel(v);                // Variables panel shows the inputs + constants from step 2 on
        // Metal goes into the calorimeter and the lid closes when Next is clicked here.
        app.phase = 'placing';
        goToStep('place');
        if (!(await placeMetal(token))) return;
        app.phase = 'placed';
        updateControls();

    } else if (id === 'place') {
        await onStart();                   // NEXT here does the same as START

    } else if (id === 'run') {
        goToStep('result');                // the run has finished; the user chose to move on

    } else if (id === 'result') {
        // same metal in every trial -> its specific heat is only inferred once (trial 1)
        goToStep(guideContext().skipInfer ? 'trend' : 'infer');

    } else if (id === 'infer') {
        goToStep('trend');

    } else if (id === 'trend') {
        app.trial1Done = true;             // the user has now been through every step of (at least) trial 1
        if (isComplete()) {
            openDialog();                  // investigation finished -> start a new one
        } else {
            app.phase = 'resetting';       // set up the next run
            updateControls();
            await resetRunVisuals();
            if (token !== app.token) return;
            app.phase = 'idle';
            updateMetalPreview();
            goToStep('inputs');
        }
    }
}

// Guide on/off switch (only changeable between trials, see updateControls).
function onGuideToggle() {
    app.guided = dom.guideToggle.checked;
    if (app.guided) {
        // switching back on: pick up at the right step for where the user is
        const id = app.phase === 'done' ? (isComplete() ? 'trend' : 'result') : 'inputs';
        app.stepIndex = GUIDE_STEPS.findIndex((s) => s.id === id);
    }
    lastExplainHTML = null;                // redraw the Explanation for the new mode
    renderGuide();
    updateControls();
}

// RESET RUN: abandon the current run (the data table stays).
async function onResetRun() {
    app.token++;                           // stops any animation/await in progress
    const token = app.token;
    if (app.animId) cancelAnimationFrame(app.animId);
    app.animId = null;
    clearMsg();

    app.phase = 'resetting';
    updateControls();
    await resetRunVisuals();
    if (token !== app.token) return;

    app.phase = 'idle';
    updateMetalPreview();
    if (app.guided) goToStep('inputs');
    else { renderGuide(); updateControls(); }
}

// NEW INVESTIGATION: wipe everything and start over with a chosen mode.
function startNewInvestigation(mode, guided) {
    app.token++;
    if (app.animId) cancelAnimationFrame(app.animId);
    app.animId = null;
    resetStageInstant();

    app.mode = mode;
    app.guided = guided;
    app.runs = [];
    app.lastRun = null;
    app.phase = 'idle';
    app.stepIndex = 0;
    lastExplainHTML = null;                // forces the Explanation to be re-written

    dom.metalPicker.value = '';
    dom.massPicker.value = MASS_DEFAULT;
    updateMassLabel();
    updateMetalSize();
    updateMetalPreview();
    clearMsg();
    clearRunPanels();
    clearLog();
    updateTrendChart();

    renderGuide();
    updateControls();
}

function openDialog() {
    dom.dlgForm.reset();
    dom.dlg.returnValue = '';
    dom.guidedRow.hidden = !app.trial1Done;              // "turn guide off" only after every step of trial 1
    dom.guidedCheck.checked = app.guided;
    dom.dlgCancel.hidden = app.mode === null;            // can't cancel the very first choice
    dom.dlgWarn.hidden = !(app.runs.length > 0 && !isComplete());
    dom.dlgTarget.textContent = TARGET_RUNS;
    dom.dlg.showModal();
}

function bindEvents() {
    // welcome dialog -> then the first "choose an investigation" dialog
    dom.welcomeNext.addEventListener('click', () => { dom.welcomeDlg.close(); });
    dom.welcomeDlg.addEventListener('close', () => { openDialog(); }, { once: true });

    dom.startBtn.addEventListener('click', onStart);
    dom.guideToggle.addEventListener('change', onGuideToggle);
    dom.nextBtn.addEventListener('click', onNext);
    dom.resetRunBtn.addEventListener('click', onResetRun);
    dom.newInvBtn.addEventListener('click', openDialog);
    dom.aboutBtn.addEventListener('click', () => { dom.aboutDlg.showModal(); });

    dom.massPicker.addEventListener('input', () => { updateMassLabel(); updateMetalSize(); clearMsg(); updateNudge(); });
    dom.metalPicker.addEventListener('change', () => {
        clearMsg();
        updateNudge();
        if (app.phase === 'idle') updateMetalPreview();   // don't swap the picture while a metal is in the water
    });

    // dialog: the form closes it; read which button closed it
    dom.dlg.addEventListener('close', () => {
        if (dom.dlg.returnValue === 'start') {
            const mode = dom.dlgForm.elements['mode'].value;
            const guided = dom.guidedRow.hidden ? true : dom.guidedCheck.checked;
            startNewInvestigation(mode, guided);
        } else if (app.mode === null) {
            openDialog();                                  // the first choice is required
        }
    });
    dom.dlg.addEventListener('cancel', (e) => {            // Esc key
        if (app.mode === null) e.preventDefault();
    });
}


// ---------- 12. INIT ----------
function init() {
    // animation lengths come from the constants above, so there is one place to change them
    dom.stage.style.setProperty('--metal-ms', `${METAL_MOVE_MS}ms`);
    dom.stage.style.setProperty('--lid-ms', `${LID_MS}ms`);

    // build the dropdown from METALS (engine.js)
    for (const [key, metal] of Object.entries(METALS)) {
        const option = document.createElement('option');
        option.value = key;
        option.textContent = metal.name;
        dom.metalPicker.appendChild(option);
    }

    dom.aboutBody.innerHTML = ABOUT_MODEL.body();   // text lives in content.js

    createCharts();
    clearLog();
    clearRunPanels();
    updateMassLabel();
    updateMetalSize();
    updateTrendChart();
    bindEvents();
    renderGuide();
    updateControls();
    dom.welcomeDlg.showModal();
}

init();