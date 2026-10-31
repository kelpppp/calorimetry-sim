// ============================================================
// engine.js — PHYSICS ONLY
// ============================================================
// Rule for this file: nothing here may touch the page (no document,
// no elements, no styles). It only takes numbers in and gives numbers
// out, so it can be tested in the console or in Node.
//
// System: a metal sample + liquid water inside an insulated calorimeter.
// Model:  heat flows from hot to cold at a rate proportional to the
//         temperature difference, Q_dot = k * (T_metal - T_water).
//         Each substance changes temperature by  dT = Q / (m * c).
// ============================================================


// ---------- CONSTANTS (never change during a run) ----------
const MASS_WATER = 0.2;            // kg
const SPEC_HEAT_WATER = 4186;      // J/(kg·°C)
const INIT_TEMP_WATER = 20;        // °C
const INIT_TEMP_METAL = 100;       // °C

// Heat-flow constant: a MODEL CHOICE, not a measured value.
// It only changes how fast the curves settle (the time axis), never the
// final temperature. That's why the time axis is labelled "simulated".
const HEAT_FLOW_CONSTANT = 1;      // J/(s·°C)

const STEPS_PER_TAU = 100;         // dt = tau / STEPS_PER_TAU
const STOP_TOLERANCE = 0.001;      // °C — stop when |T_metal - T_water| <= this
const MAX_STEPS = 50000;           // safety limit so a bug can't loop forever


// ---------- METAL DATA ----------
// Keys must match the <option value="..."> names (they are built from
// this object in script.js, so adding a metal here adds it to the dropdown
// — add a matching assets/metal-<key>.png too).
const METALS = {
    iron:     { name: 'Iron',     specificHeat: 452 },   // J/(kg·°C)
    aluminum: { name: 'Aluminum', specificHeat: 900 },
    copper:   { name: 'Copper',   specificHeat: 387 },
    lead:     { name: 'Lead',     specificHeat: 128 },
    silver:   { name: 'Silver',   specificHeat: 235 }
};


// ---------- PHYSICS FUNCTIONS ----------

// Final equilibrium temperature from  Q_lost + Q_gained = 0.
// (This is the "target" — the run loop below never uses it to move anything.)
function getEquilibriumTemp(metalMass, metalSpecHeat) {
    const Cm = metalMass * metalSpecHeat;          // heat capacity of metal, J/°C
    const Cw = MASS_WATER * SPEC_HEAT_WATER;       // heat capacity of water, J/°C
    return (Cm * INIT_TEMP_METAL + Cw * INIT_TEMP_WATER) / (Cm + Cw);
}

// Heat gained by the water (= magnitude of heat lost by the metal), in J.
// (Renamed from your getmaxHeatTransferred — same idea, capital M.)
function getMaxHeatTransferred(equilibriumTemp) {
    return MASS_WATER * SPEC_HEAT_WATER * (equilibriumTemp - INIT_TEMP_WATER);
}

// Infer the metal's specific heat from a measured final temperature:
//   m_w c_w (T_f - T_w,i) = m_m c_m (T_m,i - T_f)   →   solve for c_m
function inferSpecificHeat(finalTemp, metalMass) {
    return (MASS_WATER * SPEC_HEAT_WATER * (finalTemp - INIT_TEMP_WATER)) /
           (metalMass * (INIT_TEMP_METAL - finalTemp));
}

// Which metal in METALS has a specific heat closest to a given value?
// Returns the key, e.g. 'copper'.
function closestMetal(specificHeat) {
    let bestKey = null;
    let bestDiff = Infinity;
    for (const [key, m] of Object.entries(METALS)) {
        const diff = Math.abs(m.specificHeat - specificHeat);
        if (diff < bestDiff) { bestDiff = diff; bestKey = key; }
    }
    return bestKey;
}

// Time step chosen from the system's time constant so every input
// (light or heavy, low or high c) settles in a similar number of steps.
//   tau = Cm*Cw / (k*(Cm + Cw))
function computeDt(metalMass, metalSpecHeat) {
    const Cm = metalMass * metalSpecHeat;
    const Cw = MASS_WATER * SPEC_HEAT_WATER;
    const tau = (Cm * Cw) / (HEAT_FLOW_CONSTANT * (Cm + Cw));
    return tau / STEPS_PER_TAU;
}

// One time step. Pure function: takes the old state, returns a NEW state.
function step(state, dt, metalMass, metalSpecHeat) {
    const tempDiff = state.currentMetalTemp - state.currentWaterTemp;

    // heat that flows from metal to water during this step
    const heatThisStep = HEAT_FLOW_CONSTANT * tempDiff * dt;

    // Q = m c dT  →  dT = Q / (m c)   (metal loses heat, water gains it)
    return {
        currentMetalTemp: state.currentMetalTemp - heatThisStep / (metalMass * metalSpecHeat),
        currentWaterTemp: state.currentWaterTemp + heatThisStep / (MASS_WATER * SPEC_HEAT_WATER),
        currentHeatTransferred: state.currentHeatTransferred + heatThisStep,
        timeElapsed: state.timeElapsed + dt
    };
}


// ---------- RUN ----------
// Runs one full experiment and returns everything the page needs.
// No globals are read or written except the constants above.
function runSimulation(metalMass, metalSpecHeat) {
    if (!(metalMass > 0) || !(metalSpecHeat > 0)) {
        throw new Error('runSimulation needs a positive mass and specific heat.');
    }

    const equilibriumTemp = getEquilibriumTemp(metalMass, metalSpecHeat);
    const dt = computeDt(metalMass, metalSpecHeat);

    let state = {
        currentMetalTemp: INIT_TEMP_METAL,
        currentWaterTemp: INIT_TEMP_WATER,
        currentHeatTransferred: 0,
        timeElapsed: 0
    };

    // History arrays are local, so a second run can't erase the first.
    const timeHistory = [state.timeElapsed];
    const metalTempHistory = [state.currentMetalTemp];
    const waterTempHistory = [state.currentWaterTemp];
    const heatTransferredHistory = [state.currentHeatTransferred];

    let stepCount = 0;
    while (true) {
        state = step(state, dt, metalMass, metalSpecHeat);
        stepCount += 1;

        timeHistory.push(state.timeElapsed);
        metalTempHistory.push(state.currentMetalTemp);
        waterTempHistory.push(state.currentWaterTemp);
        heatTransferredHistory.push(state.currentHeatTransferred);

        const converged = Math.abs(state.currentMetalTemp - state.currentWaterTemp) <= STOP_TOLERANCE;
        if (converged || stepCount >= MAX_STEPS) break;
    }

    return {
        // calculated results (what the page displays)
        equilibriumTemp,
        maxHeatTransferred: getMaxHeatTransferred(equilibriumTemp),
        deltaTMetal: equilibriumTemp - INIT_TEMP_METAL,
        deltaTWater: equilibriumTemp - INIT_TEMP_WATER,
        inferredSpecificHeat: inferSpecificHeat(equilibriumTemp, metalMass),

        // simulated end state (for your testing record)
        finalMetalTemp: state.currentMetalTemp,
        finalWaterTemp: state.currentWaterTemp,
        steps: stepCount,
        hitStepLimit: stepCount >= MAX_STEPS,

        // data for the graph
        timeHistory,
        metalTempHistory,
        waterTempHistory,
        heatTransferredHistory
    };
}


// Lets Node load this file for testing; ignored in the browser.
if (typeof module !== 'undefined') {
    module.exports = {
        MASS_WATER, SPEC_HEAT_WATER, INIT_TEMP_WATER, INIT_TEMP_METAL, METALS,
        getEquilibriumTemp, getMaxHeatTransferred, inferSpecificHeat, closestMetal,
        computeDt, step, runSimulation
    };
}
