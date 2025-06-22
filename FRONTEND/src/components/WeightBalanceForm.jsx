import React, { useState } from 'react';
import axios from 'axios';
import {
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Scatter,
  ReferenceLine,
  ReferenceDot,
  Label,
  Legend,
  Customized
} from 'recharts';

const isPositiveNumber = (val) => /^\d*\.?\d*$/.test(String(val).trim());



const WeightBalanceTable = () => {
  const [basicEmpty, setBasicEmpty] = useState({ weight: '', arm: '', moment: 0 });
  const [pilotPax, setPilotPax] = useState({ weight: '', arm: 0.99, moment: 0 });
  const [fuel, setFuel] = useState({ weight: '', arm: 1.07, moment: 0 });
  const [baggage, setBaggage] = useState({ weight: '', arm: 1.5, moment: 0 });
  const [fuelBurn, setFuelBurn] = useState({ weight: '', arm: 1.07, moment: 0 });

  const MAX_FUEL = 95;
  const MAX_BAGGAGE = 54;

  const calculateMoment = (weight, arm) => parseFloat((weight * arm).toFixed(2));

  const handleInputChange = (e, state, setState, isArmEditable = true, maxLimit = null) => {
    const { name, value } = e.target;
    if (value === '' || isPositiveNumber(value)) {
      let numericValue = parseFloat(value);
      if (maxLimit !== null && numericValue > maxLimit) {
        numericValue = maxLimit;
      }
      const updated = {
        ...state,
        [name]: value === '' ? '' : numericValue.toString(),
      };
      const weight = parseFloat(updated.weight) || 0;
      const arm = isArmEditable ? parseFloat(updated.arm) || 0 : state.arm;
      updated.moment = calculateMoment(weight, arm);
      setState(updated);
    }
  };

  const totalWeight =
    (parseFloat(basicEmpty.weight) || 0) +
    (parseFloat(pilotPax.weight) || 0) +
    (parseFloat(fuel.weight) || 0) +
    (parseFloat(baggage.weight) || 0);

  const totalMoment =
    (basicEmpty.moment || 0) + (pilotPax.moment || 0) + (fuel.moment || 0) + (baggage.moment || 0);

  const takeoffCOG = totalWeight > 0 ? (totalMoment / totalWeight).toFixed(2) : '0';

  const fuelBurnWeight = parseFloat(fuelBurn.weight) || 0;
  const fuelBurnMoment = calculateMoment(fuelBurnWeight, fuelBurn.arm);
  const landingWeight = totalWeight - fuelBurnWeight;
  const landingMoment = totalMoment - fuelBurnMoment;
  const landingCOG = landingWeight > 0 ? (landingMoment / landingWeight).toFixed(2) : '0';


  const takeoffPoint = { moment: totalMoment, weight: totalWeight, name: `Takeoff (${takeoffCOG})` };
  const landingPoint = { moment: landingMoment, weight: landingWeight, name: `Landing (${landingCOG})` };


const generateEnvelopePoints = () => {
  const points = [];
  const step = 1;

  // Lower edge — forward limit line
  for (let weight = 504; weight <= 750; weight += step) {
    const moment = 0.838 * weight;
    points.push({ weight, moment });
  }

  // Upper edge — aft limit line (reverse order)
  for (let weight = 750; weight >= 504; weight -= step) {
    const moment = 0.952 * weight;
    points.push({ weight, moment });
  }

  // Ensure polygon closes (repeat first point)
  points.push({ weight: 504, moment: 0.838 * 504 });

  return points;
};


const envelopePoints = generateEnvelopePoints();


const drawEnvelopeArea = ({ xAxisMap, yAxisMap }) => {
  if (!xAxisMap || !yAxisMap) return null;

  const xScale = xAxisMap[Object.keys(xAxisMap)[0]].scale;
  const yScale = yAxisMap[Object.keys(yAxisMap)[0]].scale;

  const points = envelopePoints
    .map(p => `${xScale(p.moment)},${yScale(p.weight)}`)
    .join(' ');

  return (
    <polygon
      points={points}
      fill="rgba(136, 132, 216, 0.3)"
      stroke="#8884d8"
      strokeWidth={2}
    />
  );
};

function isPointInPolygon(point, polygon) {
  let { moment, weight } = point;
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].moment, yi = polygon[i].weight;
    const xj = polygon[j].moment, yj = polygon[j].weight;

    const intersect =
      yi > weight !== yj > weight &&
      moment < ((xj - xi) * (weight - yi)) / (yj - yi) + xi;

    if (intersect) inside = !inside;
  }

  return inside;
}



function isPointInPolygonWithTolerance(point, polygon, tolerance = 1) {
  const adjustedPoint = {
    moment: parseFloat(point.moment.toFixed(2)),
    weight: parseFloat(point.weight.toFixed(2))
  };

  // First try strict polygon check
  if (isPointInPolygon(adjustedPoint, polygon)) return true;

  // Then allow small tolerance at the edges
  return polygon.some(p =>
    Math.abs(p.moment - adjustedPoint.moment) <= tolerance &&
    Math.abs(p.weight - adjustedPoint.weight) <= tolerance
  );
}




const isTakeoffOutOfEnvelope = !isPointInPolygonWithTolerance(takeoffPoint, envelopePoints);
const isLandingOutOfEnvelope = !isPointInPolygonWithTolerance(landingPoint, envelopePoints);

const weightData = [
  { name: "Pilot & Pax", weight: parseFloat(pilotPax.weight) || 0, arm: pilotPax.arm },
  { name: "Fuel", weight: parseFloat(fuel.weight) || 0, arm: fuel.arm },
  { name: "Baggage", weight: parseFloat(baggage.weight) || 0, arm: baggage.arm }
];

const pilotRow = weightData.find(row => row.name === "Pilot & Pax");
const fuelRow = weightData.find(row => row.name === "Fuel");
const baggageRow = weightData.find(row => row.name === "Baggage");

const pilotWeight = pilotRow?.weight || 0;
const pilotMoment = pilotWeight * (pilotRow?.arm || 0);

const fuelWeight = fuelRow?.weight || 0;
const fuelMoment = fuelWeight * (fuelRow?.arm || 0);

const baggageWeight = baggageRow?.weight || 0;
const baggageMoment = baggageWeight * (baggageRow?.arm || 0);

const majorTicks = [0, 20, 40, 60, 80, 100, 120, 140, 160, 180];
const minorTicks = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100, 105, 110, 115, 120, 125, 130, 135, 140, 145, 150, 155, 160, 165, 170, 175, 180];

const saveToDatabase = async () => {
  const sheetData = {
    date: new Date().toISOString(),
    aircraftType: 'C-150',
    entries: [
      {
        description: 'BASIC EMPTY WEIGHT',
        weight: parseFloat(basicEmpty.weight),
        arm: parseFloat(basicEmpty.arm),
        moment: parseFloat(basicEmpty.moment),
      },
      {
        description: 'PILOT & PAX',
        weight: parseFloat(pilotPax.weight),
        arm: parseFloat(pilotPax.arm),
        moment: parseFloat(pilotPax.moment),
      },
      {
        description: 'FUEL',
        weight: parseFloat(fuel.weight),
        arm: parseFloat(fuel.arm),
        moment: parseFloat(fuel.moment),
      },
      {
        description: 'BAGGAGE',
        weight: parseFloat(baggage.weight),
        arm: parseFloat(baggage.arm),
        moment: parseFloat(baggage.moment),
      },
      {
        description: 'FUEL BURN',
        weight: parseFloat(fuelBurn.weight),
        arm: parseFloat(fuelBurn.arm),
        moment: parseFloat(fuelBurn.moment),
      },
    ],
    totalTakeoffWeight: totalWeight,
    takeoffCOG: takeoffCOG,
    takeoffMoment: totalMoment,
    fuelBurnOff: parseFloat(fuelBurn.weight),
    landingWeight: landingWeight, // must calculate this
    landingCOG: landingCOG,
    landingMoment: landingMoment,
  };

  try {
    console.log("Submitting to backend:", sheetData);
    const response = await axios.post('/api/weightbalance/save', sheetData);
    alert('Weight and Balance Sheet saved successfully!');
  } catch (error) {
    console.error('Error saving sheet:', error);
    alert('Failed to save sheet.');
  }
};


  return (
    <div className="p-6 md:p-10 bg-gray-50 min-h-screen font-sans max-w-5xl mx-auto">
      <h2 className="text-3xl font-bold mb-8 text-center text-gray-700">Weight and Balance Sheet</h2>
      <table className="w-full border-collapse border border-gray-300 shadow-sm">
        <thead>
          <tr className="bg-indigo-100 text-indigo-700 text-left">
            <th className="border border-gray-300 px-4 py-3">C-150</th>
            <th className="border border-gray-300 px-4 py-3">WEIGHT (KGS)</th>
            <th className="border border-gray-300 px-4 py-3">ARM (MTS.)</th>
            <th className="border border-gray-300 px-4 py-3">MOMENT (MTS.KG)</th>
          </tr>
        </thead>
        <tbody>
          {/* BASIC EMPTY WEIGHT */}
          <tr className="border-b border-gray-200 hover:bg-gray-100">
            <td className="px-4 py-3 font-semibold">BASIC EMPTY WEIGHT</td>
            <td className="px-4 py-2">
              <input
                type="text"
                name="weight"
                value={basicEmpty.weight}
                onChange={(e) => handleInputChange(e, basicEmpty, setBasicEmpty)}
                className="border border-gray-300 rounded px-2 py-1 w-full focus:outline-none focus:ring-2 focus:ring-indigo-500"
                aria-label="Basic Empty Weight"
              />
            </td>
            <td className="px-4 py-2">
              <input
                type="number"
                name="arm"
                value={basicEmpty.arm}
                onChange={(e) => handleInputChange(e, basicEmpty, setBasicEmpty)}
                className="border border-gray-300 rounded px-2 py-1 w-full focus:outline-none focus:ring-2 focus:ring-indigo-500"
                aria-label="Basic Empty Arm"
              />
            </td>
            <td className="px-4 py-2">
              <input
                type="text"
                value={basicEmpty.moment.toFixed(2)}
                readOnly
                className="border border-gray-300 rounded px-2 py-1 w-full bg-gray-100 cursor-not-allowed"
                aria-label="Basic Empty Moment"
              />
            </td>
          </tr>

          {/* PILOT & PAX */}
          <tr className="border-b border-gray-200 hover:bg-gray-100">
            <td className="px-4 py-3 font-semibold">PILOT & PAX</td>
            <td className="px-4 py-2">
              <input
                type="text"
                name="weight"
                value={pilotPax.weight}
                onChange={(e) => handleInputChange(e, pilotPax, setPilotPax, false)}
                className="border border-gray-300 rounded px-2 py-1 w-full focus:outline-none focus:ring-2 focus:ring-indigo-500"
                aria-label="Pilot and Passenger Weight"
              />
            </td>
            <td className="px-4 py-2">
              <input
                type="text"
                value={pilotPax.arm}
                readOnly
                className="border border-gray-300 rounded px-2 py-1 w-full bg-gray-100 cursor-not-allowed"
                aria-label="Pilot and Passenger Arm"
              />
            </td>
            <td className="px-4 py-2">
              <input
                type="text"
                value={pilotPax.moment.toFixed(2)}
                readOnly
                className="border border-gray-300 rounded px-2 py-1 w-full bg-gray-100 cursor-not-allowed"
                aria-label="Pilot and Passenger Moment"
              />
            </td>
          </tr>

          {/* FUEL */}
          <tr className="border-b border-gray-200 hover:bg-gray-100">
            <td className="px-4 py-3 font-semibold">
              FUEL (MAX {MAX_FUEL} KGS)
            </td>
            <td className="px-4 py-2">
              <input
                type="text"
                name="weight"
                value={fuel.weight}
                onChange={(e) => handleInputChange(e, fuel, setFuel, false, MAX_FUEL)}
                className="border border-gray-300 rounded px-2 py-1 w-full focus:outline-none focus:ring-2 focus:ring-indigo-500"
                aria-label="Fuel Weight"
                title={`Max ${MAX_FUEL} KGS`}
              />
            </td>
            <td className="px-4 py-2">
              <input
                type="text"
                value={fuel.arm}
                readOnly
                className="border border-gray-300 rounded px-2 py-1 w-full bg-gray-100 cursor-not-allowed"
                aria-label="Fuel Arm"
              />
            </td>
            <td className="px-4 py-2">
              <input
                type="text"
                value={fuel.moment.toFixed(2)}
                readOnly
                className="border border-gray-300 rounded px-2 py-1 w-full bg-gray-100 cursor-not-allowed"
                aria-label="Fuel Moment"
              />
            </td>
          </tr>

          {/* BAGGAGE */}
          <tr className="border-b border-gray-200 hover:bg-gray-100">
            <td className="px-4 py-3 font-semibold">
              BAGGAGE (MAX {MAX_BAGGAGE} KGS)
            </td>
            <td className="px-4 py-2">
              <input
                type="text"
                name="weight"
                value={baggage.weight}
                onChange={(e) => handleInputChange(e, baggage, setBaggage, false, MAX_BAGGAGE)}
                className="border border-gray-300 rounded px-2 py-1 w-full focus:outline-none focus:ring-2 focus:ring-indigo-500"
                aria-label="Baggage Weight"
                title={`Max ${MAX_BAGGAGE} KGS`}
              />
            </td>
            <td className="px-4 py-2">
              <input
                type="text"
                value={baggage.arm}
                readOnly
                className="border border-gray-300 rounded px-2 py-1 w-full bg-gray-100 cursor-not-allowed"
                aria-label="Baggage Arm"
              />
            </td>
            <td className="px-4 py-2">
              <input
                type="text"
                value={baggage.moment.toFixed(2)}
                readOnly
                className="border border-gray-300 rounded px-2 py-1 w-full bg-gray-100 cursor-not-allowed"
                aria-label="Baggage Moment"
              />
            </td>
          </tr>

          {/* A.U.W. */}
          <tr className="bg-gray-200 font-bold">
            <td className="px-4 py-3">A.U.W. (MAX 750 KGS.)</td>
            <td className="px-4 py-2">
              <input
                type="text"
                value={totalWeight.toFixed(2)}
                readOnly
                className="border border-gray-300 rounded px-2 py-1 w-full bg-gray-100 cursor-not-allowed"
                aria-label="A.U.W. Weight"
              />
            </td>
            <td className="px-4 py-2">
              <input
                type="text"
                value={`TAKE OFF C.O.G: ${takeoffCOG}`}
                readOnly
                className="border border-gray-300 rounded px-2 py-1 w-full bg-gray-100 cursor-not-allowed font-semibold"
                aria-label="Takeoff Center of Gravity"
              />
            </td>
            <td className="px-4 py-2">
              <input
                type="text"
                value={totalMoment.toFixed(2)}
                readOnly
                className="border border-gray-300 rounded px-2 py-1 w-full bg-gray-100 cursor-not-allowed"
                aria-label="Total Moment"
              />
            </td>
          </tr>

          {/* FUEL BURN */}
          <tr className="border-t border-gray-300">
            <td className="px-4 py-3 font-semibold">EST FUEL BURN OFF 14KGS/HR</td>
            <td className="px-4 py-2">
              <input
                type="text"
                name="weight"
                value={fuelBurn.weight}
                onChange={(e) => handleInputChange(e, fuelBurn, setFuelBurn, false, parseFloat(fuel.weight) || MAX_FUEL)}
                className="border border-gray-300 rounded px-2 py-1 w-full focus:outline-none focus:ring-2 focus:ring-indigo-500"
                aria-label="Fuel Burn Weight"
              />
            </td>
            <td className="px-4 py-2">
              <input
                type="text"
                value={fuelBurn.arm}
                readOnly
                className="border border-gray-300 rounded px-2 py-1 w-full bg-gray-100 cursor-not-allowed"
                aria-label="Fuel Burn Arm"
              />
            </td>
            <td className="px-4 py-2">
              <input
                type="text"
                value={fuelBurn.moment.toFixed(2)}
                readOnly
                className="border border-gray-300 rounded px-2 py-1 w-full bg-gray-100 cursor-not-allowed"
                aria-label="Fuel Burn Moment"
              />
            </td>
          </tr>

          {/* LANDING */}
          <tr className="bg-gray-200 font-bold">
            <td className="px-4 py-3">LANDING WEIGHT</td>
            <td className="px-4 py-2">
              <input
                type="text"
                value={landingWeight.toFixed(2)}
                readOnly
                className="border border-gray-300 rounded px-2 py-1 w-full bg-gray-100 cursor-not-allowed"
                aria-label="Landing Weight"
              />
            </td>
            <td className="px-4 py-2">
              <input
                type="text"
                value={`LANDING C.O.G: ${landingCOG}`}
                readOnly
                className="border border-gray-300 rounded px-2 py-1 w-full bg-gray-100 cursor-not-allowed font-semibold"
                aria-label="Landing Center of Gravity"
              />
            </td>
            <td className="px-4 py-2">
              <input
                type="text"
                value={landingMoment.toFixed(2)}
                readOnly
                className="border border-gray-300 rounded px-2 py-1 w-full bg-gray-100 cursor-not-allowed"
                aria-label="Landing Moment"
              />
            </td>
          </tr>
        </tbody>
      </table>
      <div className="mt-6 text-center">
  <button
    onClick={saveToDatabase}
    className="px-6 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition"
  >
    Save Sheet
  </button>
</div>

{/* C.O.G MOMENT ENVELOPE CHART */}
<div className="mt-12">
<h2 className="text-xl font-semibold mb-4 text-center">C.O.G MOMENT ENVELOPE</h2>
<ResponsiveContainer width="95%" height={500}>
<ComposedChart data={envelopePoints} margin={{ top: 20, right: 20, left: 40, bottom: 40 }}>
<CartesianGrid
  stroke="rgba(0, 0, 0, 0.4)"
  strokeWidth={1}
  interval={4} // major grid (every 50, if 10-step assumed)
/>
<CartesianGrid
  stroke="rgba(0, 0, 0, 0.1)"
  strokeWidth={0.5}
  interval={0} // minor grid (every 10)
  vertical={true}
  horizontal={true}
/>
<XAxis
  type="number"
  dataKey="moment"  
  label={{
    value: 'LOADED AIRCRAFT MOMENT (M.KG)',
    position: 'insideBottom',
    offset: 0,
    style: {
      fill: '#333',
      fontSize: '0.9rem',
      fontWeight: '600',
    }
  }}
  domain={[() => 400, () => 750]}
  ticks={[400, 410, 420, 430, 440, 450, 460, 470, 480, 490, 500, 510, 520, 530, 540, 550, 560, 570, 580, 590, 600, 610, 620, 630, 640, 650, 660, 670, 680, 690, 700,710,720,730,740,750]}
  tickCount={31} 
  tick={{
    fill: '#555',
    fontSize: '1.5 rem',
    fontWeight: 'bold'
  }}
  tickFormatter={(value) => value % 50 === 0 ? value.toFixed(0) : ''}
  height={40}
/>

<YAxis
  type="number"
  dataKey="weight"
  label={{
    value: "LOADED AIRCRAFT WEIGHT (KG)",
    angle: -90,
    position: "insideLeft",
    offset: 7,  
    style: {
      fill: "#333",
      fontSize: "0.9rem",
      fontWeight: "600",
    },
  }}
  domain={[() => 500, () => 750]}  
  ticks={[
    500, 510, 520, 530, 540, 550, 560, 570, 580, 590,
    600, 610, 620, 630, 640, 650, 660, 670, 680, 690,
    700, 710, 720, 730, 740, 750,
  ]}  
  tickFormatter={(value) => (value % 50 === 0 ? value.toFixed(0) : " ")}  // Label only 500,550,600...
  tick={{
    fill: "#555",
    fontSize: "0.9rem",  
    fontWeight: "bold",
  }}
  width={80}
  interval={0}  
/>

<Tooltip />
 <Legend />
    
  <Customized component={drawEnvelopeArea} />



          <Scatter data={[takeoffPoint]} name={`TAKEOFF C.O.G(${takeoffCOG})`} fill={isTakeoffOutOfEnvelope ? 'red' : 'brown'} shape="circle" r={8} />
          <Scatter data={[landingPoint]} name={`LANDING C.O.G(${landingCOG})`} fill={isLandingOutOfEnvelope ? 'red' : 'green'} shape="square" r={8} />

          {/* Reference Lines for Takeoff */}
          <ReferenceLine x={takeoffPoint.moment} stroke="brown" strokeWidth={1.5} strokeDasharray="5 3">
            <Label value={`${takeoffPoint.moment}`} position="top" dx={5} fill="brown" style={{ fontSize: '0.8rem', fontWeight: 600 }} />
          </ReferenceLine>
          <ReferenceLine y={takeoffPoint.weight} stroke="brown" strokeWidth={1.5} strokeDasharray="5 3">
            <Label value={`${takeoffPoint.weight}`} position="left" fill="brown"  style={{ fontSize: '0.8rem', fontWeight: 600 }} />
          </ReferenceLine>

          {/* Reference Lines for Landing */}
          <ReferenceLine x={landingPoint.moment} stroke="green" strokeWidth={1.5} strokeDasharray="5 3">
            <Label value={`${landingPoint.moment}`} position="top" dx={-5} fill="green" style={{ fontSize: '0.8rem', fontWeight: 600 }} />
          </ReferenceLine>
          <ReferenceLine y={landingPoint.weight} stroke="green" strokeWidth={1.5} strokeDasharray="5 3">
            <Label value={`${landingPoint.weight}`} position="left" fill="green" style={{ fontSize: '0.8rem', fontWeight: 600 }} />
          </ReferenceLine>

          {/* Out of Limit Warnings */}
{isTakeoffOutOfEnvelope && (
  <ReferenceLine
    x={takeoffPoint.moment}
    y={takeoffPoint.weight}
    stroke="red"
    strokeWidth={0}
    label={{
      position: "top",
      value: "⚠️ Takeoff C.O.G OUT OF LIMIT",
      fill: "red",
      fontSize: 12,
      fontWeight: "bold",
    }}
  />
)}
{isLandingOutOfEnvelope && (
  <ReferenceLine
    x={landingPoint.moment}
    y={landingPoint.weight}
    stroke="red"
    strokeWidth={0}
    label={{
      position: "bottom",
      value: "⚠️ Landing C.O.G OUT OF LIMIT",
      fill: "red",
      fontSize: 12,
      fontWeight: "bold",
    }}
  />
)}

        </ComposedChart>
      </ResponsiveContainer>



{/* Loading Graph: Weight vs Moment with Diagonal Lines */}
<div className="mt-16">
  <h2 className="text-xl font-semibold mb-4 text-center">LOADING GRAPH</h2>
  <ResponsiveContainer width="95%" height={500}>
    <ComposedChart
      margin={{ top: 20, right: 40, bottom: 40, left: 60 }}
    >
<CartesianGrid
  stroke="rgba(0, 0, 0, 0.4)" // Major grid color
  strokeWidth={1}
/>
 <XAxis
  type="number"
  dataKey="moment"
  label={{
    value: 'LOAD MOMENT (M.KG)',
    position: 'insideBottom',
    offset: -10,
    style: { fill: '#333', fontSize: '0.9rem', fontWeight: '600' },
  }}
  domain={[0, 180]}
  ticks={minorTicks} // Use minorTicks for finer grid
  tickFormatter={(value) => (value % 20 === 0 ? value : '')} // Label only major ticks
  interval={0} // Ensure all ticks are rendered
/>

<YAxis
  type="number"
  dataKey="weight"
  label={{
    value: 'LOAD WEIGHT (KG)',
    angle: -90,
    position: 'insideLeft',
    offset: 0,
    style: { fill: '#333', fontSize: '0.9rem', fontWeight: '600' },
  }}
  domain={[0, 180]}
  ticks={minorTicks} // Use minorTicks for finer grid
  tickFormatter={(value) => (value % 20 === 0 ? value : '')} // Label only major ticks
  interval={0} // Ensure all ticks are rendered
/>
      <Tooltip />
      <Legend />

{/* Pilot & Pax (Steepest Angle ~55°) */}
  <ReferenceLine
    segment={[
      { x: 0, y: 0 },
      { x: 170, y: 170 },
    ]}
    stroke="#10B981"
    strokeWidth={3}
  />

  {/* Fuel Line */}
  <ReferenceLine
    segment={[
      { x: 0, y: 0 },
      { x: 101.65, y: 95 },
    ]}
    stroke="#F59E0B"
    strokeWidth={3}
  />

  {/* Baggage Line */}
  <ReferenceLine
    segment={[
      { x: 0, y: 0 },
      { x: 81, y: 54 },
    ]}
    stroke="#EF4444"
    strokeWidth={3}
  />

{/* === DYNAMIC CURRENT LOADING VECTORS === */}
     <ReferenceLine
    segment={[{ x: 0, y: 0 }, { x: pilotMoment, y: pilotWeight }]}
    stroke="#00000000"
    strokeWidth={3}
  />
  <ReferenceDot
    x={pilotMoment}
    y={pilotWeight}
    r={5}
    fill="#10B981"
    stroke="#065F46"
    strokeWidth={2}
  />

  {/* Fuel */}
  <ReferenceLine
    segment={[{ x: 0, y: 0 }, { x: fuelMoment, y: fuelWeight }]}
    stroke="#00000000"
    strokeWidth={3}
  />
  <ReferenceDot
    x={fuelMoment}
    y={fuelWeight}
    r={5}
    fill="#F59E0B"
    stroke="#B45309"
    strokeWidth={2}
  />

  {/* Baggage */}
  <ReferenceLine
    segment={[{ x: 0, y: 0 }, { x: baggageMoment, y: baggageWeight }]}
    stroke="#00000000"
    strokeWidth={3}
  />
  <ReferenceDot
    x={baggageMoment}
    y={baggageWeight}
    r={5}
    fill="#EF4444"
    stroke="#991B1B"
    strokeWidth={2}
  />

    </ComposedChart>
  </ResponsiveContainer>

  <div className="flex flex-wrap gap-4 mt-4 justify-center text-sm text-gray-700">
  <div className="flex items-center gap-2">
    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#10B981' }} />
    <span>PILOT & PAX</span>
  </div>
  <div className="flex items-center gap-2">
    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#F59E0B' }} />
    <span>FUEL</span>
  </div>
  <div className="flex items-center gap-2">
    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#EF4444' }} />
    <span>BAGGAGE</span>
  </div>

</div>

</div>
     

</div>
</div>
  );
};

export default WeightBalanceTable;
