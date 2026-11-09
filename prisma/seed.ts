import "dotenv/config";
import { hash } from "bcryptjs";
import { db } from "../src/lib/db";
import { passwordSchema, emailSchema } from "../src/lib/domain/validation";
import { questionInclude, snapshotQuestion } from "../src/lib/services/testing";
import type { Prisma } from "../src/generated/prisma/client";
if (process.env.DEMO_SEED !== "true")
  throw new Error(
    "Set DEMO_SEED=true explicitly to seed illustrative content. Never run the demonstration seed against a live content bank.",
  );
const sourceUrl =
  "https://cdnbbsr.s3waas.gov.in/s37bc1ec1d9c3426357e69acd5bf320061/uploads/2026/02/202602231394640855.pdf";
const version = await db.syllabusVersion.upsert({
  where: { name: "Illustrative NEET 2026 — development" },
  create: {
    id: "demo-syllabus-2026",
    name: "Illustrative NEET 2026 — development",
    year: 2026,
    active: true,
    demo: true,
    sourceUrl,
  },
  update: { sourceUrl },
});
// This is a deliberately small original teaching set, NOT a complete syllabus or validated mock bank.
const chapterData = [
  {
    id: "mole",
    subject: "Chemistry",
    classLevel: 11,
    name: "Some Basic Concepts of Chemistry",
    topics: [
      "Mole concept",
      "Molar mass",
      "Percentage composition",
      "Stoichiometry",
      "Limiting reagent",
    ],
  },
  {
    id: "atom",
    subject: "Chemistry",
    classLevel: 11,
    name: "Structure of Atom",
    topics: [
      "Atomic models",
      "Electromagnetic radiation",
      "Bohr's model",
      "Quantum numbers",
      "Electronic configuration",
    ],
  },
  {
    id: "units",
    subject: "Physics",
    classLevel: 11,
    name: "Units and Measurements",
    topics: [
      "SI units",
      "Dimensional analysis",
      "Significant figures",
      "Measurement errors",
    ],
  },
  {
    id: "motion",
    subject: "Physics",
    classLevel: 11,
    name: "Motion in a Straight Line",
    topics: [
      "Displacement and velocity",
      "Acceleration",
      "Kinematic equations",
    ],
  },
  {
    id: "cell",
    subject: "Biology",
    classLevel: 11,
    name: "Cell: The Unit of Life",
    topics: [
      "Cell theory",
      "Cell organelles",
      "Prokaryotic cells",
      "Cell membrane",
    ],
  },
  {
    id: "physiology",
    subject: "Biology",
    classLevel: 11,
    name: "Breathing and Exchange of Gases",
    topics: ["Respiratory organs", "Gas transport"],
  },
  {
    id: "solutions",
    subject: "Chemistry",
    classLevel: 12,
    name: "Solutions",
    topics: ["Concentration units", "Colligative properties"],
  },
  {
    id: "electricity",
    subject: "Physics",
    classLevel: 12,
    name: "Current Electricity",
    topics: ["Ohm's law", "Resistors in series and parallel"],
  },
  {
    id: "genetics",
    subject: "Biology",
    classLevel: 12,
    name: "Principles of Inheritance and Variation",
    topics: ["Mendelian inheritance", "Monohybrid crosses"],
  },
];
const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-$/g, "");
for (const [i, name] of ["Physics", "Chemistry", "Biology"].entries())
  await db.subject.upsert({
    where: { id: `demo-${slug(name)}` },
    create: {
      id: `demo-${slug(name)}`,
      name,
      slug: slug(name),
      order: i,
      syllabusId: version.id,
    },
    update: {},
  });
for (const [i, c] of chapterData.entries()) {
  await db.chapter.upsert({
    where: { id: `demo-${c.id}` },
    create: {
      id: `demo-${c.id}`,
      name: c.name,
      slug: slug(c.name),
      classLevel: c.classLevel,
      subjectId: `demo-${slug(c.subject)}`,
      order: i,
      classification:
        c.subject === "Biology"
          ? c.id === "physiology"
            ? "ZOOLOGY"
            : "BOTANY"
          : null,
    },
    update: {},
  });
  for (const [j, name] of c.topics.entries())
    await db.topic.upsert({
      where: { id: `demo-${c.id}-${j}` },
      create: {
        id: `demo-${c.id}-${j}`,
        name,
        slug: slug(name),
        chapterId: `demo-${c.id}`,
        order: j,
      },
      update: {},
    });
}
type Row = [
  string,
  number,
  string,
  string[],
  string,
  ("EASY" | "MEDIUM" | "HARD")?,
  number[]?,
];
const rows: Row[] = [
  [
    "mole",
    0,
    "How many moles are present in 18 g of water? Use a molar mass of 18 g/mol.",
    ["1 mol", "2 mol", "0.5 mol", "18 mol"],
    "Amount in moles equals mass divided by molar mass: 18/18 = 1 mol.",
    "EASY",
  ],
  [
    "mole",
    0,
    "One mole of any substance contains approximately how many specified entities?",
    [
      "$6.022 \\times 10^{23}$",
      "$3.011 \\times 10^{23}$",
      "$6.022 \\times 10^{22}$",
      "$1.000 \\times 10^{23}$",
    ],
    "The Avogadro constant is exactly 6.02214076 × 10²³ per mole; 6.022 × 10²³ is its common approximation.",
    "EASY",
  ],
  [
    "mole",
    0,
    "How many moles of molecules are present in 44 g of carbon dioxide? Use C = 12 and O = 16 g/mol.",
    ["1 mol", "0.5 mol", "2 mol", "4 mol"],
    "The molar mass of carbon dioxide is 12 + 2 × 16 = 44 g/mol, so 44 g corresponds to 1 mol.",
    "EASY",
  ],
  [
    "mole",
    1,
    "Using H = 1 and O = 16 g/mol, what is the molar mass of hydrogen peroxide, H₂O₂?",
    ["34 g/mol", "18 g/mol", "32 g/mol", "36 g/mol"],
    "Two hydrogen atoms contribute 2 and two oxygen atoms contribute 32, giving 34 g/mol.",
    "EASY",
  ],
  [
    "mole",
    1,
    "Using Ca = 40, C = 12, and O = 16 g/mol, what is the molar mass of CaCO₃?",
    ["100 g/mol", "84 g/mol", "68 g/mol", "116 g/mol"],
    "Add the atomic contributions: 40 + 12 + 3 × 16 = 100 g/mol.",
    "EASY",
  ],
  [
    "mole",
    2,
    "What is the mass percentage of oxygen in water? Use H = 1 and O = 16 g/mol.",
    ["88.9%", "11.1%", "50%", "66.7%"],
    "Oxygen contributes 16 of the 18 mass units in water. Its percentage is (16/18) × 100 ≈ 88.9%.",
    "EASY",
  ],
  [
    "mole",
    2,
    "What is the percentage by mass of carbon in CO₂? Use C = 12 and O = 16 g/mol.",
    ["27.3%", "72.7%", "33.3%", "50%"],
    "Carbon contributes 12 of 44 g per mole. (12/44) × 100 ≈ 27.3%.",
    "MEDIUM",
  ],
  [
    "mole",
    3,
    "For 2H₂ + O₂ → 2H₂O, how many moles of water form from 3 mol of H₂ with excess O₂?",
    ["3 mol", "1.5 mol", "6 mol", "2 mol"],
    "The balanced equation gives a 1:1 mole ratio between hydrogen and water. Thus 3 mol H₂ yields 3 mol H₂O.",
    "EASY",
  ],
  [
    "mole",
    3,
    "For N₂ + 3H₂ → 2NH₃, how many moles of NH₃ form from 2 mol N₂ with excess hydrogen?",
    ["4 mol", "2 mol", "6 mol", "1 mol"],
    "Each mole of N₂ produces 2 mol NH₃. Two moles therefore produce 4 mol NH₃.",
    "EASY",
  ],
  [
    "mole",
    4,
    "In 2H₂ + O₂ → 2H₂O, a mixture has 2 mol H₂ and 2 mol O₂. Which reactant limits water formation?",
    ["H₂", "O₂", "Both are exactly consumed", "Neither can react"],
    "Two moles of H₂ require only 1 mol O₂. Hydrogen is consumed first and is the limiting reactant.",
    "EASY",
  ],
  [
    "mole",
    4,
    "For N₂ + 3H₂ → 2NH₃, 2 mol N₂ and 3 mol H₂ are mixed. What is the maximum NH₃ yield?",
    ["2 mol", "4 mol", "6 mol", "3 mol"],
    "Hydrogen limits the reaction. Three moles H₂ react with 1 mol N₂ to give 2 mol NH₃.",
    "MEDIUM",
  ],
  [
    "mole",
    0,
    "What mass of water corresponds to 0.5 mol? Use a molar mass of 18 g/mol.",
    ["9 g", "18 g", "36 g", "0.5 g"],
    "Mass equals amount × molar mass, so 0.5 × 18 = 9 g.",
    "EASY",
  ],
  [
    "mole",
    3,
    "Calcium carbonate decomposes as CaCO₃ → CaO + CO₂. What CO₂ mass forms from 25 g pure CaCO₃? Use molar masses 100 and 44 g/mol respectively.",
    ["11 g", "22 g", "44 g", "5.5 g"],
    "25 g is 0.25 mol CaCO₃. The 1:1 ratio produces 0.25 mol CO₂, with mass 0.25 × 44 = 11 g.",
    "MEDIUM",
  ],
  [
    "mole",
    4,
    "A mixture of 4 mol H₂ and 1.5 mol O₂ reacts to form water. How many moles of H₂ remain?",
    ["1 mol", "0.5 mol", "2 mol", "0 mol"],
    "The 1.5 mol O₂ consumes 3 mol H₂. From the initial 4 mol H₂, 1 mol remains.",
    "HARD",
  ],
  [
    "atom",
    0,
    "Rutherford’s scattering experiment provided evidence for which feature of the atom?",
    [
      "A small, dense, positively charged nucleus",
      "Electrons embedded in a uniform positive sphere",
      "Equal mass spread throughout the atom",
      "A nucleus containing only electrons",
    ],
    "Rare large-angle deflections indicated that positive charge and most atomic mass are concentrated in a tiny nucleus.",
    "EASY",
  ],
  [
    "atom",
    0,
    "Which atomic model described electrons embedded in a sphere of positive charge?",
    [
      "Thomson’s model",
      "Rutherford’s nuclear model",
      "Bohr’s model",
      "Quantum mechanical orbital model",
    ],
    "Thomson proposed the plum-pudding model with negative electrons embedded in diffuse positive charge.",
    "EASY",
  ],
  [
    "atom",
    0,
    "Why did most alpha particles pass through thin gold foil with little deflection?",
    [
      "Most of the atom is empty space",
      "All alpha particles were neutral",
      "The nucleus occupied the entire atom",
      "Electrons stopped the alpha particles",
    ],
    "Most trajectories missed the very small nucleus, showing that the atom’s volume is largely empty space.",
    "EASY",
  ],
  [
    "atom",
    0,
    "In Rutherford’s experiment, large-angle scattering was mainly caused by interaction with what?",
    [
      "The concentrated positive nuclear charge",
      "A uniform electron cloud of equal mass",
      "Neutrons emitted from the foil",
      "The magnetic field of the source",
    ],
    "A close encounter with the concentrated positive charge of the nucleus strongly repelled a positive alpha particle.",
    "EASY",
  ],
  [
    "atom",
    1,
    "Which relation connects the speed, frequency, and wavelength of light in vacuum?",
    [
      "$c = \\nu\\lambda$",
      "$c = \\nu/\\lambda$",
      "$c = \\lambda/\\nu$",
      "$c = \\nu + \\lambda$",
    ],
    "A wave advances one wavelength each period. Wave speed is frequency multiplied by wavelength.",
    "EASY",
  ],
  [
    "atom",
    1,
    "If the frequency of a photon doubles, what happens to its energy?",
    [
      "It doubles",
      "It halves",
      "It remains unchanged",
      "It becomes four times as large",
    ],
    "The photon energy relation E = hν shows direct proportionality between energy and frequency.",
    "EASY",
  ],
  [
    "atom",
    1,
    "Which electromagnetic radiation has the longest wavelength among these choices?",
    ["Radio waves", "Visible light", "X-rays", "Gamma rays"],
    "Radio waves have longer wavelengths than visible light, X-rays, and gamma rays.",
    "EASY",
  ],
  [
    "atom",
    2,
    "In the Bohr model of hydrogen, which principal level is the ground state?",
    ["n = 1", "n = 0", "n = 2", "n = ∞"],
    "The lowest allowed Bohr orbit has principal quantum number n = 1 and the minimum energy.",
    "EASY",
  ],
  [
    "atom",
    2,
    "A hydrogen atom’s electron moves from n = 3 to n = 2. What occurs?",
    [
      "A photon is emitted",
      "A photon must be absorbed",
      "The nucleus changes charge",
      "The electron’s mass doubles",
    ],
    "Moving to a lower energy level releases the energy difference as an emitted photon.",
    "EASY",
  ],
  [
    "atom",
    2,
    "For a hydrogen atom, how does the radius of the n = 2 Bohr orbit compare with the n = 1 orbit?",
    [
      "It is four times as large",
      "It is twice as large",
      "It is half as large",
      "It is the same",
    ],
    "Bohr orbit radii scale as n² for hydrogen. The ratio is 2²/1² = 4.",
    "EASY",
  ],
  [
    "atom",
    2,
    "Using Eₙ = −13.6/n² eV, what is the energy of hydrogen at n = 2?",
    ["−3.4 eV", "−6.8 eV", "−13.6 eV", "+3.4 eV"],
    "Substitute n = 2: E₂ = −13.6/4 = −3.4 eV. A negative value indicates a bound state.",
    "MEDIUM",
  ],
  [
    "atom",
    3,
    "What are the allowed azimuthal quantum number values for n = 3?",
    ["0, 1, 2", "1, 2, 3", "0, 1, 2, 3", "Only 3"],
    "For a given n, the azimuthal quantum number l runs from 0 through n − 1.",
    "EASY",
  ],
  [
    "atom",
    3,
    "How many orbitals are present in a p subshell?",
    ["3", "1", "5", "7"],
    "For l = 1, the magnetic quantum number takes −1, 0, and +1, giving three orbitals.",
    "EASY",
  ],
  [
    "atom",
    4,
    "What is the ground-state electronic configuration of a neutral carbon atom (Z = 6)?",
    ["1s² 2s² 2p²", "1s² 2s² 2p⁶", "1s² 2s¹ 2p³", "1s² 2p⁴"],
    "Six electrons fill the 1s and 2s subshells with two electrons each; the remaining two enter 2p.",
    "EASY",
  ],
  [
    "atom",
    4,
    "What is the maximum number of electrons in one orbital?",
    [
      "2 with opposite spins",
      "2 with identical spins",
      "6 with any spins",
      "1 in every circumstance",
    ],
    "The Pauli exclusion principle permits at most two electrons in the same spatial orbital, with opposite spin quantum numbers.",
    "EASY",
  ],
  [
    "atom",
    2,
    "A hydrogen electron occupies the n = 3 shell. Across all subshells, how many spatial orbitals does this shell contain?",
    ["9", "3", "6", "18"],
    "A shell contains n² spatial orbitals. At n = 3 this is 9. This question also requires quantum-number concepts and must be excluded when those concepts are unselected.",
    "MEDIUM",
    [3],
  ],
  [
    "units",
    0,
    "What is the SI base unit of electric current?",
    ["Ampere", "Coulomb", "Volt", "Ohm"],
    "The ampere is an SI base unit. Coulomb, volt, and ohm are derived units.",
    "EASY",
  ],
  [
    "units",
    0,
    "Which quantity is measured in kelvin?",
    [
      "Thermodynamic temperature",
      "Heat energy",
      "Electric potential",
      "Luminous flux",
    ],
    "Kelvin is the SI base unit of thermodynamic temperature.",
    "EASY",
  ],
  [
    "units",
    1,
    "What are the dimensions of force?",
    ["$MLT^{-2}$", "$ML^2T^{-2}$", "$ML^{-1}T^{-2}$", "$LT^{-1}$"],
    "From force = mass × acceleration, dimensions are M × LT⁻² = MLT⁻².",
    "EASY",
  ],
  [
    "units",
    1,
    "Which pair has the same physical dimensions?",
    [
      "Work and torque",
      "Force and energy",
      "Pressure and force",
      "Speed and acceleration",
    ],
    "Both work and torque have dimensions ML²T⁻², though they represent different physical quantities.",
    "MEDIUM",
  ],
  [
    "units",
    2,
    "How many significant figures are in the measured value 0.00450?",
    ["3", "2", "5", "6"],
    "Leading zeros do not count; 4, 5, and the final zero after the decimal are significant.",
    "EASY",
  ],
  [
    "units",
    2,
    "Which is the appropriate two-significant-figure representation of 3.1416?",
    ["3.1", "3.14", "3.0", "3.142"],
    "Keep the first two significant digits. The next digit is 4, so 3.1 does not round upward.",
    "EASY",
  ],
  [
    "units",
    3,
    "A length is measured as 20.0 ± 0.2 cm. What is the percentage uncertainty?",
    ["1%", "10%", "0.1%", "2%"],
    "Relative uncertainty is 0.2/20.0 = 0.01; multiplying by 100 gives 1%.",
    "EASY",
  ],
  [
    "units",
    3,
    "For z = xy, x has 2% uncertainty and y has 3% uncertainty. What is the maximum first-order percentage uncertainty in z?",
    ["5%", "1%", "6%", "2.5%"],
    "For a product, the maximum first-order relative uncertainties add: 2% + 3% = 5%.",
    "MEDIUM",
  ],
  [
    "motion",
    0,
    "A runner completes one lap of a circular track and returns to the starting point. What is the displacement?",
    ["Zero", "The track circumference", "The diameter", "The radius"],
    "Displacement depends only on final and initial positions, which coincide after one full lap.",
    "EASY",
  ],
  [
    "motion",
    0,
    "Which quantity can be negative in one-dimensional motion?",
    ["Velocity", "Distance traveled", "Speed", "Elapsed time"],
    "Velocity includes direction and can be negative relative to a chosen positive axis. Distance and speed are nonnegative.",
    "EASY",
  ],
  [
    "motion",
    1,
    "A car’s velocity increases uniformly from 5 m/s to 15 m/s in 5 s. What is its acceleration?",
    ["2 m/s²", "3 m/s²", "4 m/s²", "5 m/s²"],
    "Acceleration is change in velocity divided by time: (15 − 5)/5 = 2 m/s².",
    "EASY",
  ],
  [
    "motion",
    1,
    "If velocity is constant, the acceleration is what?",
    ["Zero", "Equal to the velocity", "Always positive", "Always negative"],
    "Acceleration measures the rate of change of velocity. An unchanging velocity has zero acceleration.",
    "EASY",
  ],
  [
    "motion",
    2,
    "A body starts from rest with constant acceleration 2 m/s². How far does it move in 3 s?",
    ["9 m", "6 m", "18 m", "3 m"],
    "Using s = ut + ½at² with u = 0 gives s = ½ × 2 × 9 = 9 m.",
    "MEDIUM",
  ],
  [
    "motion",
    2,
    "A body has initial speed 10 m/s and constant acceleration −2 m/s² along its direction of motion. How far does it travel before stopping?",
    ["25 m", "50 m", "10 m", "100 m"],
    "Apply v² = u² + 2as with final v = 0: 0 = 100 − 4s, so s = 25 m.",
    "HARD",
  ],
  [
    "cell",
    0,
    "Which statement is part of cell theory?",
    [
      "Cells are the basic structural and functional units of living organisms",
      "All cells have chloroplasts",
      "All cells contain a membrane-bound nucleus",
      "Cells arise only from nonliving matter",
    ],
    "Cell theory identifies the cell as the fundamental structural and functional unit of living organisms.",
    "EASY",
  ],
  [
    "cell",
    0,
    "The principle ‘Omnis cellula-e cellula’ states what?",
    [
      "Cells arise from pre-existing cells",
      "Cells form spontaneously from minerals",
      "Only animals possess cells",
      "Every cell contains a cell wall",
    ],
    "Virchow’s principle states that new cells arise from existing cells.",
    "EASY",
  ],
  [
    "cell",
    1,
    "Which organelle is the principal site of aerobic ATP production in a typical eukaryotic cell?",
    ["Mitochondrion", "Golgi apparatus", "Lysosome", "Nucleolus"],
    "Mitochondria contain the machinery for the citric acid cycle and oxidative phosphorylation, central to aerobic ATP production.",
    "EASY",
  ],
  [
    "cell",
    1,
    "Which cellular structures are directly responsible for protein synthesis?",
    ["Ribosomes", "Lysosomes", "Centrioles", "Vacuoles"],
    "Ribosomes translate messenger RNA and assemble amino acids into polypeptides.",
    "EASY",
  ],
  [
    "cell",
    2,
    "Which feature is characteristic of prokaryotic cells?",
    [
      "Absence of a membrane-bound nucleus",
      "Presence of mitochondria",
      "Presence of an endoplasmic reticulum",
      "DNA enclosed in a nuclear envelope",
    ],
    "Prokaryotic genetic material is in a nucleoid region, not enclosed in a nuclear membrane.",
    "EASY",
  ],
  [
    "cell",
    2,
    "The usual cytoplasmic ribosome type in bacteria is which?",
    ["70S", "80S", "60S", "40S"],
    "Bacterial cytoplasmic ribosomes are 70S, comprising 50S and 30S subunits. S values reflect sedimentation, not additive mass.",
    "EASY",
  ],
  [
    "cell",
    3,
    "The fluid mosaic model describes which structure?",
    [
      "The plasma membrane",
      "The chromosome",
      "The cell wall alone",
      "The nucleolus",
    ],
    "The model describes proteins associated with and embedded in a dynamic lipid bilayer of the plasma membrane.",
    "EASY",
  ],
  [
    "cell",
    3,
    "Which part of a phospholipid typically faces the aqueous surroundings of a membrane?",
    [
      "The hydrophilic head",
      "The hydrophobic fatty acid tails",
      "Only the terminal methyl groups",
      "No part contacts water",
    ],
    "Polar hydrophilic heads face the water on both sides, while hydrophobic tails are sheltered in the bilayer interior.",
    "EASY",
  ],
  [
    "physiology",
    0,
    "In human lungs, most gas exchange takes place across which structures?",
    ["Alveoli", "Tracheal cartilage", "Nasal hairs", "The epiglottis"],
    "Alveoli offer a large, thin, moist surface closely associated with capillaries, enabling gas exchange.",
    "EASY",
  ],
  [
    "physiology",
    0,
    "During normal inspiration, what happens to the diaphragm?",
    [
      "It contracts and flattens",
      "It relaxes and becomes more dome-shaped",
      "It closes the trachea",
      "It prevents chest expansion",
    ],
    "Contraction flattens the diaphragm, increasing thoracic volume and helping draw air into the lungs.",
    "EASY",
  ],
  [
    "physiology",
    1,
    "Most oxygen transported in human blood is bound to what?",
    ["Haemoglobin", "Albumin", "Bicarbonate ions", "Plasma glucose"],
    "Most oxygen is reversibly bound to haemoglobin in red blood cells, with a smaller amount dissolved in plasma.",
    "EASY",
  ],
  [
    "physiology",
    1,
    "Most carbon dioxide in human blood is transported mainly in which form?",
    [
      "Bicarbonate ions",
      "Free carbon atoms",
      "Oxyhaemoglobin",
      "Dissolved oxygen",
    ],
    "Most carbon dioxide is converted to bicarbonate, chiefly through reactions facilitated within red blood cells.",
    "EASY",
  ],
  [
    "solutions",
    0,
    "Molarity is defined as which quantity?",
    [
      "Moles of solute per litre of solution",
      "Moles of solute per kilogram of solvent",
      "Grams of solute per mole of solvent",
      "Litres of solvent per gram of solute",
    ],
    "Molarity uses the total solution volume in litres as its denominator; molality uses solvent mass.",
    "EASY",
  ],
  [
    "solutions",
    0,
    "What is the molarity of a solution containing 0.20 mol of solute in 0.50 L of solution?",
    ["0.40 mol/L", "0.10 mol/L", "2.5 mol/L", "0.70 mol/L"],
    "Molarity = amount / solution volume = 0.20/0.50 = 0.40 mol/L.",
    "EASY",
  ],
  [
    "solutions",
    1,
    "For ideal dilute solutions, colligative properties primarily depend on what?",
    [
      "The number of dissolved solute particles",
      "Only the solute’s colour",
      "Only the chemical identity of the solute",
      "The shape of the container",
    ],
    "Colligative properties depend on solute-particle concentration rather than chemical identity under the stated ideal dilute assumptions.",
    "EASY",
  ],
  [
    "solutions",
    1,
    "A nonvolatile nonelectrolyte has molality 0.50 mol/kg in a solvent with Kf = 2.0 K kg/mol. What is the ideal freezing-point depression?",
    ["1.0 K", "4.0 K", "0.25 K", "2.5 K"],
    "For a nonelectrolyte with van’t Hoff factor 1, ΔTf = Kf m = 2.0 × 0.50 = 1.0 K.",
    "MEDIUM",
  ],
  [
    "electricity",
    0,
    "A resistor carries 2 A under a 6 V potential difference. What is its resistance?",
    ["3 Ω", "12 Ω", "8 Ω", "0.33 Ω"],
    "Ohm’s law gives R = V/I = 6/2 = 3 Ω.",
    "EASY",
  ],
  [
    "electricity",
    0,
    "For an ohmic conductor at constant temperature, current is proportional to what?",
    [
      "Potential difference",
      "The square of resistance",
      "Elapsed time only",
      "The reciprocal of potential difference",
    ],
    "Ohm’s law V = IR at fixed resistance means I is directly proportional to V.",
    "EASY",
  ],
  [
    "electricity",
    1,
    "Two 4 Ω resistors connected in series have what equivalent resistance?",
    ["8 Ω", "2 Ω", "4 Ω", "16 Ω"],
    "Resistances in series add directly: 4 + 4 = 8 Ω.",
    "EASY",
  ],
  [
    "electricity",
    1,
    "Two 6 Ω resistors connected in parallel have what equivalent resistance?",
    ["3 Ω", "12 Ω", "6 Ω", "36 Ω"],
    "For two identical resistors in parallel, equivalent resistance is half either resistance: 6/2 = 3 Ω.",
    "MEDIUM",
  ],
  [
    "genetics",
    0,
    "Which Mendelian principle describes separation of allele pairs during gamete formation?",
    [
      "Law of segregation",
      "Chromosome linkage",
      "Incomplete dominance",
      "Codominance",
    ],
    "The law of segregation states that allele pairs separate during gamete formation, so a gamete receives one allele of the pair.",
    "EASY",
  ],
  [
    "genetics",
    0,
    "An individual with two identical alleles at a gene locus is described as what?",
    [
      "Homozygous",
      "Heterozygous",
      "Hemizygous in every case",
      "Polyploid in every case",
    ],
    "Homozygous means carrying two identical alleles at the specified diploid locus.",
    "EASY",
  ],
  [
    "genetics",
    1,
    "For Aa × Aa with complete dominance, what is the expected recessive phenotype fraction?",
    ["1/4", "1/2", "3/4", "All offspring"],
    "The expected genotype ratio is 1 AA : 2 Aa : 1 aa. Only aa displays the recessive phenotype under complete dominance.",
    "EASY",
  ],
  [
    "genetics",
    1,
    "For a test cross Aa × aa, what is the expected genotype ratio?",
    ["1 Aa : 1 aa", "3 Aa : 1 aa", "All AA", "All Aa"],
    "Aa produces A and a gametes equally, whereas aa produces only a gametes. Half the expected offspring are Aa and half aa.",
    "MEDIUM",
  ],
];
for (const [i, row] of rows.entries()) {
  const [
      chapter,
      topic,
      text,
      choices,
      explanation,
      difficulty = "EASY",
      prerequisites = [],
    ] = row,
    id = `demo-question-${String(i + 1).padStart(3, "0")}`;
  if (await db.question.findUnique({ where: { id } })) continue; // Never overwrite editorial changes or historical keys on re-seed.
  const shift = i % 4,
    options = [...choices.slice(shift), ...choices.slice(0, shift)],
    correctOption = (4 - shift) % 4;
  const q = await db.question.create({
    data: {
      id,
      chapterId: `demo-${chapter}`,
      text,
      explanation,
      correctOption,
      difficulty,
      source: "Original illustrative teaching question — development seed",
      license: "ORIGINAL",
      status: "APPROVED",
      tags: ["demo", "original"],
      options: {
        create: options.map((text, position) => ({ text, position })),
      },
      topics: {
        create: [
          { topicId: `demo-${chapter}-${topic}`, required: false },
          ...prerequisites.map((t) => ({
            topicId: `demo-${chapter}-${t}`,
            required: true,
          })),
        ],
      },
    },
    include: questionInclude,
  });
  await db.questionVersion.create({
    data: {
      questionId: q.id,
      version: 1,
      snapshot: snapshotQuestion(q) as unknown as Prisma.InputJsonValue,
    },
  });
}
if (!(await db.examBlueprint.findFirst({ where: { syllabusId: version.id } })))
  await db.examBlueprint.create({
    data: {
      name: "NEET UG 2026 reference pattern",
      syllabusId: version.id,
      totalQuestions: 180,
      durationMinutes: 180,
      sections: {
        create: [
          { subjectId: "demo-physics", count: 45 },
          { subjectId: "demo-chemistry", count: 45 },
          { subjectId: "demo-biology", count: 90 },
        ],
      },
    },
  });
await db.platformSettings.upsert({
  where: { key: "revisionIntervals" },
  create: { key: "revisionIntervals", value: [0, 3, 7, 14] },
  update: {},
});
for (const kind of ["STUDENT", "ADMIN"] as const) {
  const emailValue = process.env[`SEED_${kind}_EMAIL`],
    password = process.env[`SEED_${kind}_PASSWORD`];
  if (!emailValue || !password) continue;
  const email = emailSchema.parse(emailValue);
  passwordSchema.parse(password);
  if (!(await db.user.findUnique({ where: { email } })))
    await db.user.create({
      data: {
        email,
        name: kind === "STUDENT" ? "Demo Learner" : "Demo Administrator",
        role: kind,
        passwordHash: await hash(password, 12),
        profile: {
          create: { displayName: kind === "STUDENT" ? "CuriousLearner" : null },
        },
      },
    });
}
console.log(
  `Seeded ${rows.length} original demonstration MCQs, ${chapterData.length} chapters, and ${chapterData.reduce((n, c) => n + c.topics.length, 0)} topics. Full mocks must reject insufficient coverage. No student scores were fabricated.`,
);
await db.$disconnect();
