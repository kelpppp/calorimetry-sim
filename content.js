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
        explanation: (ctx) => {
            const r = ctx.lastRun;          // values from the trial that just finished
            return `
            <p>As predicted by the model and shown by the temperature-time graph, both substances reached the same final temperature of <strong>${ctx.lastRun.Tf.toFixed(2)} °C</strong>. As we know from applying the Law of Conservation to an ideal calorimeter (an isolated system), both substances experienced the same magnitude of heat transfer, <strong>${ctx.lastRun.Q.toFixed(1)} J</strong>.</p>
            <p>However, the final equilibrium temperature is much closer to the initial temperature of the water than the initial temperature of the metal. By calculation, the metal underwent a temperature change of <strong>${Math.abs(r.dTm).toFixed(2)} °C</strong>, while the water experienced a temperature change of only <strong>${r.dTw.toFixed(2)} °C</strong>. This result is also evident in the temperature-time graph: the asymmetry of the curves shows that the water underwent a smaller temperature change than the metal.</p>
            <p>What explains these observations? When no phase change is involved, as in this simulation, the temperature change caused by an amount of heat transferred Q is related to the mass m and specific heat capacity c of the substance through the equation <strong>Q = mcΔT</strong>. The specific heat capacity of a substance is the amount of energy required to raise the temperature of 1.00 kg of its mass by 1.00 °C. Therefore, in this calorimetry setup, the water experienced a smaller temperature change than the metal for the same magnitude of heat transfer because of its significantly higher specific heat capacity of ${SPEC_HEAT_WATER} J/(kg·°C).</p>`;
        },
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
        body: (ctx) => `
            <ul>
                <li>The data table and trend graph update after every trial.</li>
                <li>${ctx.mode === 'mass'
                    ? 'The trend graph compares the final equilibrium temperatures for different mass inputs across each trial.'
                    : 'The trend graph compares the final equilibrium temperature for different metal types across each trial.'}</li>
                <li>${ctx.complete
                    ? `You have finished all ${ctx.targetRuns} trials. Click <strong>NEW INVESTIGATION</strong> to vary the other input.`
                    : `Click <strong>NEXT TRIAL</strong> to set up trial ${ctx.runNumber + 1}.`}</li>
            </ul>`,
        explanation: () => '',          // no explanation for this step (the Explanation card hides itself)
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

        <p>This simulation models a calorimetry experiment to investigate how the mass and specific heat capacity of a heated metal influence heat transfer, temperature change, and the final thermal equilibrium temperature when the metal is placed in contact with cooler water in an insulated system.</p>

        <h3>Calorimetry</h3>
        <p>Calorimetry is an experimental technique used to measure heat transfer during a chemical or physical process. By measuring the final equilibrium temperature of a system, the specific heat capacity of an unknown substance can be determined.</p>
        <p>Calorimetry relies on thermal equilibrium and the Law of Conservation of Energy. When two objects at different temperatures come into thermal contact, heat flows from the hotter object to the cooler one until they reach the same temperature. In an ideal insulated calorimeter, no energy is exchanged with the surroundings, so the heat released by one substance is absorbed by the other.</p>

        <h3>Specific heat capacity</h3>
        <p>Specific heat capacity is the amount of thermal energy required to raise the temperature of a unit mass of a substance by one degree Celsius. It is measured in SI units of J/(kg·°C).</p>
        <ul>
            <li>For materials with a high specific heat capacity, more thermal energy is required to cause a temperature change, meaning they heat up and cool down more slowly.</li>
            <li>For materials with a low specific heat capacity, less thermal energy is required to cause a temperature change, meaning they heat up and cool down more quickly.</li>
        </ul>
        <p>Water has a high specific heat capacity of 4186 J/(kg·°C). In contrast, many metals heat up and cool down quickly because less energy is required to change their temperature. For example, gold has a specific heat capacity of 129 J/(kg·°C).</p>

        <h3>Simulation overview</h3>
        <p>In this simulation, a metal initially heated to 100 °C is placed in thermal contact with 0.20 kg of water at 20 °C inside an insulated calorimeter. You will conduct two separate investigations, each consisting of five trials.</p>
        <ul>
            <li>In each investigation, you will vary either the mass or the type of metal while keeping the other input constant. You will explore how these changes affect the final equilibrium temperature and heat transfer.</li>
            <li>After completing the trials, you will receive a data table and a graph of your results, with explanations connecting the simulated data to the underlying physics.</li>
            <li>For each trial, the simulation predicts the final equilibrium temperature of the metal and water based on your inputs. A step-by-step walkthrough demonstrates how to use this temperature to calculate the metal's specific heat capacity.</li>
        </ul>

        <h3>System</h3>
        <p>The system consists of the metal sample and the water inside the calorimeter. Heat flows from the hotter metal to the cooler water until both substances reach the same final equilibrium temperature. The calorimeter container is excluded from the system, and no work is done by or on the system during heat transfer. The system is assumed to be fully isolated, so its total internal energy remains constant and no heat is exchanged with the surroundings.</p>

        
        <h3>Governing equations and concepts</h3>

        <p>The model uses the following equations to calculate heat transfer and predict the final equilibrium temperature.</p>

        
        <h3>Governing equations and concepts</h3>

        <p>The model uses the following equations to calculate heat transfer and predict the final equilibrium temperature.</p>

        <ul>
            <li>
                <strong>Q = mcΔT:</strong> Relates the amount of thermal energy transferred to or from a substance when its temperature changes without a phase change.
                <ul>
                    <li><strong>Q:</strong> Thermal energy transferred (J)</li>
                    <li><strong>m:</strong> Mass of the substance (kg)</li>
                    <li><strong>c:</strong> Specific heat capacity of the material (J/(kg·°C)); the energy required to raise the temperature of 1 kg of the substance by 1 °C</li>
                    <li><strong>ΔT:</strong> Change in temperature (°C), calculated as the final temperature minus the initial temperature</li>
                </ul>
            </li>
            <li>
                <strong>Q<sub>gained</sub> + Q<sub>lost</sub> = 0</strong>, or <strong>Q<sub>gained</sub> = −Q<sub>lost</sub>:</strong> Expresses the Law of Conservation of Energy for an isolated system in which no work is done.
                <ul>
                    <li><strong>Q<sub>lost</sub>:</strong> Thermal energy released by the hotter substance. Its temperature decreases, so Q is negative.</li>
                    <li><strong>Q<sub>gained</sub>:</strong> Thermal energy absorbed by the cooler substance. Its temperature increases, so Q is positive.</li>
                </ul>
            </li>
            <li>
                <strong>T<sub>f</sub> =
                    (m<sub>m</sub>c<sub>m</sub>T<sub>m,i</sub> + m<sub>w</sub>c<sub>w</sub>T<sub>w,i</sub>)
                    / (m<sub>m</sub>c<sub>m</sub> + m<sub>w</sub>c<sub>w</sub>):
                </strong> Equation used by the model to predict the final equilibrium temperature, obtained by combining the equations above and rearranging for the final temperature.
                <ul>
                    <li>Here, the subscripts m and w represent the metal and water, respectively; i denotes the initial temperature, and T<sub>f</sub> is the final equilibrium temperature.</li>
                </ul>
            </li>
        </ul>
        
        <h3>Assumptions and limitations</h3>

        <ol>
            <li>
                <strong>No phase change:</strong> During a phase change, heat transfer can occur without a temperature change because thermal energy is used to overcome intermolecular forces rather than increase temperature. If ice replaced liquid water in the calorimeter, the calculation would need to account for the energy required to melt the ice. This scenario is not explored in the simulation, which assumes that the initial and final temperatures of the water remain between 0 °C and 100 °C.
            </li>
            <li>
                <strong>No work is done, and the system is fully isolated:</strong> According to the Law of Conservation of Energy, the total internal energy of an isolated system remains constant. The First Law of Thermodynamics states that a system's internal energy can change through heat transfer and work. This simulation assumes that no mechanical work is done on or by the system and that no heat is exchanged with the external environment. Accordingly, all heat released by the hotter substance is assumed to be absorbed by the cooler substance as they reach thermal equilibrium.
            </li>
            <li>
                <strong>The calorimeter container:</strong> In a real calorimeter, heat is transferred between the metal, water, and calorimeter container, which also has mass and is in thermal contact with the substances. The simulation assumes that heat transfer to the container is negligible. As a result, the model may predict a higher final equilibrium temperature than a real calorimeter would measure.
            </li>
            <li>
                <strong>Simulated time axis:</strong> The time axis on the temperature-time graph is simulated. The heat-flow rate constant used to model heat transfer over time is a model choice rather than a value based on actual measurements of thermal conductivity. This allows the temperature-change graph to be displayed within a reasonable amount of time.
            </li>
        </ol>`
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
        ${eq(`<i>Q</i><sub>water</sub> = −<i>Q</i><sub>metal</sub>`)}

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