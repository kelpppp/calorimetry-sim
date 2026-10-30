// ============================================================
// content.js — ALL THE WORDS YOU WILL EDIT
// ============================================================
// Text for the Walkthrough column, the Explanation card and the
// "About the model" dialog. No logic here, so you can fill in the physics
// without touching script.js.
//
// Everything marked [PLACEHOLDER] is dummy text for you to replace.
// The <span class="placeholder"> tag gives dummy text a yellow highlight so you
// can spot what's left to write (delete the span when you replace the text).
//
// Each guide step has:
//   id            — used by script.js. DON'T rename these.
//   title         — heading in the Walkthrough (text, or function(ctx) returning text)
//   focus         — which panel(s) get a blue outline during this step: one name or a list
//                   (controls | stage | runinfo | graph | log | inference | trend)
//   body(ctx)     — HTML for the WALKTHROUGH (short instructions)
//   explanation(ctx) — HTML for the EXPLANATION card (the physics)
//   nextLabel(ctx)— text on the Next button
//
// ctx has: mode ('mass' | 'metal'), runNumber (1..5), targetRuns (5),
//          complete (true after all runs), runs (finished runs), lastRun (most recent run),
//          phase ('idle' | 'placing' | 'placed' | 'running' | 'done' | 'resetting'),
//          skipInfer (true from trial 2 on when the metal is the same every trial, because
//                     its specific heat was already inferred in trial 1)
// ============================================================

const PH = (text) => `<span class="placeholder">[PLACEHOLDER] ${text}</span>`;

const GUIDE_STEPS = [
    {
        id: 'inputs',
        title: 'Step 1: Choose inputs',
        focus: 'controls',
        body: (ctx) => ctx.mode === 'mass'
            ? `<ul>
                   <li>Choose a metal from the dropdown menu. This will stay constant through all ${ctx.targetRuns} trials.</li>
                   <li>Set the metal mass with the slider. This will be changed with each trial.</li>
               </ul>`
            : `<ul>
                   <li>Set the metal mass with the slider. This will stay constant through all ${ctx.targetRuns} trials.</li>
                   <li>Choose a metal from the dropdown menu. This will be changed with each trial.</li>
               </ul>`,
        explanation: (ctx) => ctx.mode === 'mass'
            ? `<p>For this investigation, you’ve chosen to explore how changing the metal mass affects the final equilibrium temperature reached by the metal-water system in the insulated calorimeter. So, choose a metal once (for all ${ctx.targetRuns} trials) and choose a different mass for every trial.</p>`
            : `<p>For this investigation, you’ve chosen to explore how changing the type of metal affects the final equilibrium temperature reached by the metal-water system in the insulated calorimeter. So, choose a mass once (for all ${ctx.targetRuns} trials) and choose a different metal for every trial.</p>`,
        nextLabel: () => 'Next'
    },
    {
        id: 'place',
        title: 'Step 2: The system',
        focus: ['stage', 'runinfo'],      // a list highlights several panels at once
        body: () => `
            <ul>
                <li>The metal has been placed into the calorimeter, and the lid has been closed.</li>
                <li>Your chosen input and the constants for this trial are now listed under <strong>Variables</strong>.</li>
                <li>Read the physics explanation below. Click “START” to begin the process. </li>
            </ul>`,
        explanation: () => `
            <p>The calorimeter in this simulation is an isolated system, in which the total internal energy remains constant. In other words, no energy nor matter is exchanged between the metal-water system and the surroundings.</p>
            <p>The metal-water system excludes the calorimeter container. Any heat transferred to the material of the calorimeter container is considered negligible.</p>
            <p><i>Note: See “About the model” for more information on the assumptions and limitations of this simulation.</i></p>`,
        nextLabel: () => 'Next'
    },
    {
        id: 'run',
        title: 'Step 3: Run the experiment',
        focus: 'graph',
        body: (ctx) => `
            <ul>
            ${ctx.phase === 'done'
                ? `<li>The process is finished.</li>
                    <li>The temperature-time graph is drawn to show the temperature of the metal and water over time.</li>
                    <li>Read the physics explanation below. Click "NEXT" to move on.</li>`
                : `<li>The heat transfer process has begun.</li>`}
            </ul>`,
        explanation: () => `
            <p>When two objects at different temperatures are placed in thermal contact with each other, heat flows spontaneously from the hotter object to the cooler object until thermal equilibrium is reached (i.e. objects are at the same temperature). In this calorimetry setup, the hotter metal (initially at 100°C) decreases in temperature as heat is transferred from it; the cooler water (initially at 20°C) increases in temperature as heat is transferred to it. After a period of time, the two substances reach the same equilibrium temperature.</p>
            <p>This process is shown in the temperature-time graph. The metal’s curve decreases over time while the water’s curve increases over time, with both curves levelling off at the same final temperature. </p>
            <p><i>Note: The temperature-time graph is drawn using simulated seconds on the x-axis and does not reflect the time taken for heat transfer in real life. See “About the model” for more information. </i></p>`,
        nextLabel: () => 'Next'     // Next stays disabled until the 5-second run has finished
    },
    {
        id: 'result',
        title: 'Step 4: The result',
        focus: 'runinfo',
        body: () => `
            <ul>
                <li>The final equilibrium temperature is now shown under <b>Output</b>.</li>
                <li>The data for this trial is recorded in the data table.</li>
                <li>Read the physics explanation below. Click "NEXT" to move on.</li>
            </ul>`,
        explanation: () => `
            <p>As predicted by the model and shown by the temperature-time graph, both substances reached the same final temperature of <strong>${ctx.lastRun.Tf.toFixed(2)} °C</strong>. As we know from applying the Law of Conservation to an ideal calorimeter (an isolated system), both substances experienced the same magnitude of heat transfer, <strong>${ctx.lastRun.Q.toFixed(1)} J</strong>.</p>
            <p>However, the final equilibrium temperature is much closer to the initial temperature of the water than the initial temperature of the metal. By calculation, the metal underwent a temperature change of <strong>${Math.abs(r.dTm).toFixed(2)} °C</strong>, while the water experienced a temperature change of only <strong>${r.dTw.toFixed(2)} °C</strong>. This result is also evident in the temperature-time graph: the asymmetry of the curves shows that the water underwent a smaller temperature change than the metal.</p>
            <p>What explains these observations? When no phase change is involved, as in this simulation, the temperature change caused by an amount of heat transferred Q is related to the mass m and specific heat capacity c of the substance through the equation <strong>Q = mcΔT</strong>. The specific heat capacity of a substance is the amount of energy required to raise the temperature of 1.00 kg of its mass by 1.00 °C. Therefore, in this calorimetry setup, the water experienced a smaller temperature change than the metal for the same magnitude of heat transfer because of its significantly higher specific heat capacity of ${SPEC_HEAT_WATER} J/(kg·°C).</p>`,
        nextLabel: (ctx) => ctx.skipInfer ? 'Next' : 'Next'
    },
    {
        id: 'infer',
        title: 'Step 5: Infer specific heat',
        focus: 'inference',
        body: () => `
            <ul>
                <li>The experiment for trial [number] is now finished.</li>
                <li>The data obtained, to specific heat capacity of the chosen metal can be calculated.</li>
                <li>Read the steps below and click ‘NEXT’ to move on.</li>
            </ul>`,
        explanation: (ctx) => ctx.lastRun ? buildInferenceHTML(ctx.lastRun) : '',
        nextLabel: () => 'Next'
    },
    {
        id: 'trend',
        title: (ctx) => ctx && ctx.complete ? 'Investigation complete' : (ctx && ctx.skipInfer ? 'Step 5: Trends' : 'Step 6: Trends'),
        focus: 'trend',
        body: (ctx) => ctx.complete
            ? `<p>You have finished all ${ctx.targetRuns} trials.</p>
               <p>Click <strong>New investigation</strong> to vary the other input.</p>`
            : `<p>The data table and trend graph update after every trial (the trend graph appears from trial 2).</p>
               <p>Click <strong>Next trial</strong> to set up trial ${ctx.runNumber + 1}.</p>`,
        explanation: (ctx) => ctx.complete
            ? `<p>${PH('Explain what the trend graph and data table show about the relationship. Hold the answer to your investigation questions here.')}</p>`
            : `<p>${PH('Explain how to read the trend graph and what to look for as more trials are added.')}</p>`,
        nextLabel: (ctx) => ctx.complete ? 'New investigation' : 'Next trial'
    }
];

// Shown in the Walkthrough when the step-by-step guide is turned off.
const REFERENCE = {
    title: 'Instructions',
    body: (ctx) => `
        <p><strong>How to use</strong></p>
        <ul>
            <li>Click <em>New investigation</em> and choose which input to vary.</li>
            <li>Pick the inputs and click <em>START</em>. Repeat for ${ctx.targetRuns} trials.</li>
            <li><em>Reset run</em> clears the current trial; <em>New investigation</em> clears everything.</li>
            <li>See <em>About the model</em> for the system, assumptions and limitations.</li>
        </ul>`,
    // Explanation card before a trial has finished (guide off)
    explanation: () => `<p>Run a trial to see how the specific heat can be inferred from the final temperature.</p>`,
    // Explanation card after trials 2-5 when the metal is the same every trial (guide off)
    sameMetal: () => `<p>The metal is the same in every trial of this investigation, so its specific heat only needs to be inferred once (in trial 1).</p>`
};

// "About the model" dialog (opened from the top bar).
// Drafted from the system / assumptions / limitations in your proposal — edit freely.
const ABOUT_MODEL = {
    body: () => `
        <h2>About the model</h2>

        <h3>System and energy transfers</h3>
        <p>The system is the metal sample and the water inside the calorimeter. Heat flows from the hotter metal to the cooler water until both reach the same temperature. The calorimeter container is not part of the system, and no work is done.</p>

        <h3>Governing equations</h3>
        <ul>
            <li><strong>Q = mcΔT</strong> — heat transferred to or from a substance with no phase change.</li>
            <li><strong>Q<sub>lost</sub> + Q<sub>gained</sub> = 0</strong> — conservation of energy in an isolated system.</li>
        </ul>
        <p>${PH('Show how these combine to give the final temperature T_f and the inferred specific heat.')}</p>

        <h3>Assumptions</h3>
        <ul>
            <li>No phase change occurs: the water stays between 0 °C and 100 °C.</li>
            <li>No work is done, and the system is fully isolated (no heat exchanged with the surroundings).</li>
            <li>The calorimeter container absorbs a negligible amount of heat.</li>
        </ul>

        <h3>Limitations</h3>
        <ul>
            <li>Because the container's heat absorption is ignored, the model predicts a final temperature higher than a real calorimeter would measure.</li>
            <li>The time axis is simulated: the heat-flow rate constant is a model choice, so it changes how fast the curves settle but never the final temperature.</li>
            <li>${PH('Add any other limitations and their effect on results.')}</li>
        </ul>`
};

// ---- small helpers for writing equations as HTML (no math library needed) ----
const eq   = (html, extra = '') => `<div class="eq ${extra}">${html}</div>`;  // centred equation line
const nw   = (html) => `<span class="nw">${html}</span>`;                // keeps one factor together on a line
const frac = (top, bottom) =>                                           // stacked fraction
    `<span class="frac"><span>${top}</span><span>${bottom}</span></span>`;

// Explanation shown at step 5 (or right after a trial when the guide is off).
// `run` has: run, metalName, mass, c (true specific heat – don't show it), Tf, dTm, dTw, Q, cInferred
function buildInferenceHTML(run) {
    const matchKey = closestMetal(run.cInferred);
    return `
        <p>Through calorimetry, the heat transferred during a process can be calculated from the measured temperature change of a substance using <i>Q</i> = <i>mc</i>Δ<i>T</i>, and then used to infer the substance’s specific heat capacity.</p>

        <p>Since the calorimeter is assumed to be an isolated system, its internal energy remains constant. The net heat transfer is therefore zero: all heat released by the metal is absorbed by the water. Mathematically:</p>
        ${eq(`<i>Q</i><sub>metal</sub> + <i>Q</i><sub>water</sub> = 0`)}

        <p>As previously mentioned, the heat transferred for each substance is <i>Q</i> = <i>mc</i>Δ<i>T</i>. Therefore,</p>
        ${eq(`<i>m</i><sub>metal</sub><i>c</i><sub>metal</sub>Δ<i>T</i><sub>metal</sub> + <i>m</i><sub>water</sub><i>c</i><sub>water</sub>Δ<i>T</i><sub>water</sub> = 0`)}

        <p>The temperature change Δ<i>T</i> of a substance is the difference between the final equilibrium temperature and its initial temperature:</p>
        ${eq(`Δ<i>T</i> = <i>T</i><sub>f</sub> − <i>T</i><sub>i</sub>`)}

        <p>Isolating for the specific heat capacity of the metal:</p>
        ${eq(`<i>c</i><sub>metal</sub> = − ${frac(
            `<i>m</i><sub>water</sub><i>c</i><sub>water</sub>Δ<i>T</i><sub>water</sub>`,
            `<i>m</i><sub>metal</sub>Δ<i>T</i><sub>metal</sub>`)}`)}

        <p>Plugging in the known values (constants, experimental inputs, and the measured output):</p>
        ${eq(`${nw(`<i>c</i><sub>metal</sub> = −`)}${frac(
            `${nw(`(${MASS_WATER.toFixed(2)} kg)`)} ${nw(`(${SPEC_HEAT_WATER} J/(kg·°C))`)} ${nw(`(${run.Tf.toFixed(2)} °C − ${INIT_TEMP_WATER} °C)`)}`,
            `${nw(`(${run.mass.toFixed(2)} kg)`)} ${nw(`(${run.Tf.toFixed(2)} °C − ${INIT_TEMP_METAL} °C)`)}`)}`, 'eq-flex')}
        ${eq(`<i>c</i><sub>metal</sub> = <strong>${run.cInferred.toFixed(1)} J/(kg·°C)</strong>`)}

        <p><strong>Closest metal:</strong> ${METALS[matchKey].name}
           (${METALS[matchKey].specificHeat} J/(kg·°C))</p>`;
}