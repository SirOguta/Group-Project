import React, { useState, useEffect } from 'react';
import html2canvas from 'html2canvas';
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
  Customized,
} from 'recharts';

const WeightBalanceTable = ({
  basicEmpty,
  setBasicEmpty,
  pilotPax,
  setPilotPax,
  rearPax,
  setRearPax,
  fuel,
  setFuel,
  baggage1,
  setBaggage1,
  baggage2,
  setBaggage2,
  fuelBurn,
  setFuelBurn,
  totalWeight,
  takeoffCOG,
  landingWeight,
  landingCOG,
  totalMoment,
  landingMoment,
  saveToDatabase,
  aircraftConfig,
  pilotInfo,
}) => {
  const {
    aircraftType,
    maxFuel,
    maxBaggage1,
    maxBaggage2,
    hasRearPax,
    unitLabels,
    envelopeConfig,
    loadingGraphConfig,
    axisConfig,
  } = aircraftConfig;

  const isPositiveNumber = (val) => /^\d*\.?\d*$/.test(String(val).trim());

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
      const arm = isArmEditable ? parseFloat(updated.arm) || state.arm : state.arm;
      updated.moment = parseFloat(((weight * arm) / (aircraftType === 'C-172' ? 1000 : 1)).toFixed(2));
      setState(updated);
    }
  };

  const generateEnvelopePoints = () => {
    const points = [];
    const { minWeight, maxWeight } = envelopeConfig;
    const scaleFactor = aircraftType === 'C-172' ? 1000 : 1;
    const startWeight = aircraftType === 'C-172' ? 1500 : minWeight;

    if (aircraftType === 'C-172') {
      points.push({ weight: 1500, moment: (1500 * 35) / scaleFactor });
      points.push({ weight: 1950, moment: (1950 * 35) / scaleFactor });
      points.push({ weight: 2300, moment: (2300 * 38.5) / scaleFactor });
      points.push({ weight: 2300, moment: (2300 * 47.3) / scaleFactor });
      points.push({ weight: 1950, moment: (1950 * 47.3) / scaleFactor });
      points.push({ weight: 1500, moment: (1500 * 47.3) / scaleFactor });
      points.push({ weight: 1500, moment: (1500 * 35) / scaleFactor });

      points.push({ weight: 1500, moment: (1500 * 35.0) / scaleFactor });
      points.push({ weight: 1950, moment: (1950 * 35.0) / scaleFactor });
      points.push({ weight: 2000, moment: (2000 * 35.5) / scaleFactor });
      points.push({ weight: 2000, moment: (2000 * 40.5) / scaleFactor });
      points.push({ weight: 1950, moment: (1950 * 40.5) / scaleFactor });
      points.push({ weight: 1500, moment: (1500 * 40.5) / scaleFactor });
      points.push({ weight: 1500, moment: (1500 * 35.0) / scaleFactor });
    } else {
      points.push({ weight: startWeight, moment: (0.8 * startWeight) / scaleFactor });
      points.push({ weight: 610, moment: (0.8 * 610) / scaleFactor });
      points.push({ weight: 750, moment: (0.838 * 750) / scaleFactor });
      points.push({ weight: 750, moment: (0.952 * 750) / scaleFactor });
      points.push({ weight: 610, moment: (0.952 * 610) / scaleFactor });
      points.push({ weight: startWeight, moment: (0.952 * startWeight) / scaleFactor });
      points.push({ weight: startWeight, moment: (0.8 * startWeight) / scaleFactor });
    }

    return points;
  };

  const envelopePoints = generateEnvelopePoints();
  const normalEnvelopePoints = envelopePoints.slice(0, 7);
  const utilityEnvelopePoints = envelopePoints.slice(7, 14);

  const getAnchorPoints = () => {
    if (aircraftType !== 'C-172') return { normal: null, utility: null };
    return {
      normal: { weight: 2070, moment: 88 },
      utility: { weight: 1900, moment: 72 },
    };
  };

  const { normal: normalAnchor, utility: utilityAnchor } = getAnchorPoints();

  const drawEnvelopeArea = ({ xAxisMap, yAxisMap }) => {
    if (!xAxisMap || !yAxisMap) return null;
    const xScale = xAxisMap[Object.keys(xAxisMap)[0]].scale;
    const yScale = yAxisMap[Object.keys(yAxisMap)[0]].scale;

    return (
      <g>
        <polygon
          points={normalEnvelopePoints.map((p) => `${xScale(p.moment)},${yScale(p.weight)}`).join(' ')}
          fill="rgba(136, 132, 216, 0.3)"
          stroke="#8884d8"
          strokeWidth={2}
          strokeDasharray="5 5"
        />
        <polygon
          points={utilityEnvelopePoints.map((p) => `${xScale(p.moment)},${yScale(p.weight)}`).join(' ')}
          fill="rgba(255, 165, 0, 0.3)"
          stroke="#FFA500"
          strokeWidth={2}
          strokeDasharray="5 5"
        />
      </g>
    );
  };

  const drawLabels = ({ xAxisMap, yAxisMap }) => {
    if (aircraftType !== 'C-172' || !xAxisMap || !yAxisMap || !normalAnchor || !utilityAnchor) return null;
    const xScale = xAxisMap[Object.keys(xAxisMap)[0]].scale;
    const yScale = yAxisMap[Object.keys(yAxisMap)[0]].scale;

    const normalLabelX = xScale(normalAnchor.moment);
    const normalLabelY = yScale(normalAnchor.weight);
    const utilityLabelX = xScale(utilityAnchor.moment);
    const utilityLabelY = yScale(utilityAnchor.weight);

    return (
      <g>
        <text
          x={normalLabelX}
          y={normalLabelY}
          textAnchor="middle"
          fill="#333"
          style={{ fontSize: '0.8rem', fontWeight: 'bold', backgroundColor: 'rgba(255, 255, 255, 0.8)', padding: '2px' }}
        >
          NORMAL CATEGORY
        </text>
        <text
          x={utilityLabelX}
          y={utilityLabelY}
          textAnchor="middle"
          fill="#333"
          style={{ fontSize: '0.8rem', fontWeight: 'bold', backgroundColor: 'rgba(255, 255, 255, 0.8)', padding: '2px' }}
        >
          UTILITY CATEGORY
        </text>
      </g>
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

  function isPointInPolygonWithTolerance(point, polygon, tolerance = aircraftType === 'C-172' ? 2 : 1) {
    const adjustedPoint = {
      moment: parseFloat(point.moment.toFixed(2)),
      weight: parseFloat(point.weight.toFixed(2)),
    };
    if (isPointInPolygon(adjustedPoint, polygon)) return true;
    return polygon.some(
      (p) =>
        Math.abs(p.moment - adjustedPoint.moment) <= tolerance &&
        Math.abs(p.weight - adjustedPoint.weight) <= tolerance
    );
  }

  const scaleFactor = aircraftType === 'C-172' ? 1000 : 1;
  const takeoffPoint = {
    moment: totalMoment,
    weight: totalWeight,
    name: `Takeoff (${takeoffCOG})`,
  };
  const landingPoint = {
    moment: landingMoment,
    weight: landingWeight,
    name: `Landing (${landingCOG})`,
  };

  const isTakeoffOutOfEnvelope = !isPointInPolygonWithTolerance(takeoffPoint, envelopePoints);
  const isLandingOutOfEnvelope = !isPointInPolygonWithTolerance(landingPoint, envelopePoints);

  const weightData = [
    { name: 'Pilot & Pax', weight: parseFloat(pilotPax.weight) || 0, arm: pilotPax.arm },
    ...(hasRearPax ? [{ name: 'Rear Pax', weight: parseFloat(rearPax.weight) || 0, arm: rearPax.arm }] : []),
    { name: 'Fuel', weight: parseFloat(fuel.weight) || 0, arm: fuel.arm },
    { name: 'Baggage Area 1', weight: parseFloat(baggage1.weight) || 0, arm: baggage1.arm },
    ...(maxBaggage2 > 0 ? [{ name: 'Baggage Area 2', weight: parseFloat(baggage2.weight) || 0, arm: baggage2.arm }] : []),
  ];

  const moments = weightData.map(item => (item.weight * item.arm) / scaleFactor);

  // Stability Diagram Configuration
  const stabilityConfig = {
    'C-150': {
      aircraftLength: 2.0,
      datum: 0.0,
      xMin: -0.5,
      xMax: 2.5,
      yMin: -0.5,
      yMax: 0.5,
      xTicks: Array.from({ length: 31 }, (_, i) => -0.5 + i * 0.1),
      xTickFormatter: (value) => (Math.abs(value % 0.5) < 0.01 ? value.toFixed(1) : ''),
    },
    'C-172': {
      aircraftLength: 100,
      datum: 0,
      xMin: -20,
      xMax: 130,
      yMin: -10,
      yMax: 10,
      xTicks: Array.from({ length: 15 }, (_, i) => -20 + i * 10),
      xTickFormatter: (value) => (value % 20 === 0 ? value.toFixed(0) : ''),
    },
  };

  const currentStabilityConfig = stabilityConfig[aircraftType];

  const drawAircraftDiagram = ({ xAxisMap, yAxisMap }) => {
    if (!xAxisMap || !yAxisMap) return null;
    const xScale = xAxisMap[Object.keys(xAxisMap)[0]].scale;
    const yScale = yAxisMap[Object.keys(yAxisMap)[0]].scale;

    const aircraftLength = currentStabilityConfig.aircraftLength;
    const datum = currentStabilityConfig.datum;
    const cog = parseFloat(takeoffCOG);

    // Aircraft body (simplified as a rectangle)
    const aircraftStart = datum;
    const aircraftEnd = datum + aircraftLength;
    const aircraftY = 0;

    // Component positions
    const components = [
      { name: 'Pilot', arm: parseFloat(pilotPax.arm), weight: parseFloat(pilotPax.weight) || 0, color: '#10B981' },
      ...(hasRearPax ? [{ name: 'Rear Pax', arm: parseFloat(rearPax.arm), weight: parseFloat(rearPax.weight) || 0, color: '#6366F1' }] : []),
      { name: 'Fuel', arm: parseFloat(fuel.arm), weight: parseFloat(fuel.weight) || 0, color: '#F59E0B' },
      { name: 'Baggage 1', arm: parseFloat(baggage1.arm), weight: parseFloat(baggage1.weight) || 0, color: '#EF4444' },
      ...(maxBaggage2 > 0 ? [{ name: 'Baggage 2', arm: parseFloat(baggage2.arm), weight: parseFloat(baggage2.weight) || 0, color: '#F59E0B' }] : []),
    ];

    return (
      <g>
        {/* Aircraft body */}
        <rect
          x={xScale(aircraftStart)}
          y={yScale(aircraftY) - 10}
          width={xScale(aircraftEnd) - xScale(aircraftStart)}
          height={20}
          fill="#E5E7EB"
          stroke="#374151"
          strokeWidth={2}
        />
        {/* Datum line */}
        <line
          x1={xScale(datum)}
          y1={yScale(currentStabilityConfig.yMin)}
          x2={xScale(datum)}
          y2={yScale(currentStabilityConfig.yMax)}
          stroke="blue"
          strokeWidth={2}
          strokeDasharray="5 5"
        />
        <text
          x={xScale(datum)}
          y={yScale(currentStabilityConfig.yMax) + 20}
          textAnchor="middle"
          fill="blue"
          style={{ fontSize: '0.8rem', fontWeight: 'bold' }}
        >
          Datum
        </text>
        {/* C.O.G marker */}
        <circle
          cx={xScale(cog)}
          cy={yScale(aircraftY)}
          r={5}
          fill={isTakeoffOutOfEnvelope ? 'red' : 'brown'}
          stroke="#000"
          strokeWidth={1}
        />
        <text
          x={xScale(cog)}
          y={yScale(aircraftY) - 15}
          textAnchor="middle"
          fill={isTakeoffOutOfEnvelope ? 'red' : 'brown'}
          style={{ fontSize: '0.8rem', fontWeight: 'bold' }}
        >
          C.O.G ({cog})
        </text>
        {/* Component markers */}
        {components.map((comp, index) => (
          comp.weight > 0 && (
            <g key={index}>
              <circle
                cx={xScale(comp.arm)}
                cy={yScale(aircraftY) + 10}
                r={4}
                fill={comp.color}
                stroke="#000"
                strokeWidth={1}
              />
              <text
                x={xScale(comp.arm)}
                y={yScale(aircraftY) + 25}
                textAnchor="middle"
                fill={comp.color}
                style={{ fontSize: '0.7rem' }}
              >
                {comp.name} ({comp.arm})
              </text>
            </g>
          )
        ))}
      </g>
    );
  };

  return (
    <div id="weight-balance-section" className="bg-gray-50 min-h-screen font-sans">
      {/* Pilot Information Section */}
      <div className="mb-6">
        <h3 className="text-xl font-semibold mb-4 text-gray-700">Pilot and Flight Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Pilot Name</label>
            <input
              type="text"
              value={pilotInfo.pilotName}
              onChange={(e) => pilotInfo.setPilotInfo({ ...pilotInfo, pilotName: e.target.value })}
              className="border rounded px-2 py-1 w-full"
              placeholder="Enter pilot name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Route</label>
            <input
              type="text"
              value={pilotInfo.route}
              onChange={(e) => pilotInfo.setPilotInfo({ ...pilotInfo, route: e.target.value })}
              className="border rounded px-2 py-1 w-full"
              placeholder="Enter route (e.g., KJFK-KLAX)"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Date</label>
            <input
              type="date"
              value={pilotInfo.date}
              onChange={(e) => pilotInfo.setPilotInfo({ ...pilotInfo, date: e.target.value })}
              className="border rounded px-2 py-1 w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Aircraft Registration</label>
            <input
              type="text"
              value={pilotInfo.registration}
              onChange={(e) => pilotInfo.setPilotInfo({ ...pilotInfo, registration: e.target.value })}
              className="border rounded px-2 py-1 w-full"
              placeholder="Enter aircraft registration"
            />
          </div>
        </div>
      </div>
      <h2 className="text-3xl font-bold mb-8 text-center text-gray-700">
        Weight and Balance Sheet - {aircraftType} {pilotInfo.registration && `(${pilotInfo.registration})`}
      </h2>
      <table className="w-full border-collapse border border-gray-300 shadow-sm">
        <thead>
          <tr className="bg-indigo-100 text-indigo-700 text-left">
            <th className="border px-4 py-3">{aircraftType}</th>
            <th className="border px-4 py-3">{`WEIGHT (${unitLabels.weight})`}</th>
            <th className="border px-4 py-3">{`ARM (${unitLabels.arm})`}</th>
            <th className="border px-4 py-3">{`MOMENT (${unitLabels.moment})`}</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b hover:bg-gray-100">
            <td className="px-4 py-3 font-semibold">BASIC EMPTY WEIGHT</td>
            <td><input type="text" name="weight" value={basicEmpty.weight} onChange={(e) => handleInputChange(e, basicEmpty, setBasicEmpty)} className="border rounded px-2 py-1 w-full" /></td>
            <td><input type="number" name="arm" value={basicEmpty.arm} onChange={(e) => handleInputChange(e, basicEmpty, setBasicEmpty)} className="border rounded px-2 py-1 w-full" /></td>
            <td><input type="text" value={basicEmpty.moment.toFixed(2)} readOnly className="border rounded px-2 py-1 w-full bg-gray-100 cursor-not-allowed" /></td>
          </tr>
          <tr className="border-b hover:bg-gray-100">
            <td className="px-4 py-3 font-semibold">PILOT & PAX</td>
            <td><input type="text" name="weight" value={pilotPax.weight} onChange={(e) => handleInputChange(e, pilotPax, setPilotPax, false)} className="border rounded px-2 py-1 w-full" /></td>
            <td><input type="text" value={pilotPax.arm} readOnly className="border rounded px-2 py-1 w-full bg-gray-100 cursor-not-allowed" /></td>
            <td><input type="text" value={pilotPax.moment.toFixed(2)} readOnly className="border rounded px-2 py-1 w-full bg-gray-100 cursor-not-allowed" /></td>
          </tr>
          {hasRearPax && (
            <tr className="border-b hover:bg-gray-100">
              <td className="px-4 py-3 font-semibold">REAR PASSENGERS</td>
              <td><input type="text" name="weight" value={rearPax.weight} onChange={(e) => handleInputChange(e, rearPax, setRearPax, false)} className="border rounded px-2 py-1 w-full" /></td>
              <td><input type="text" value={rearPax.arm} readOnly className="border rounded px-2 py-1 w-full bg-gray-100 cursor-not-allowed" /></td>
              <td><input type="text" value={rearPax.moment.toFixed(2)} readOnly className="border rounded px-2 py-1 w-full bg-gray-100 cursor-not-allowed" /></td>
            </tr>
          )}
          <tr className="border-b hover:bg-gray-100">
            <td className="px-4 py-3 font-semibold">FUEL (MAX {maxFuel} {unitLabels.weight})</td>
            <td><input type="text" name="weight" value={fuel.weight} onChange={(e) => handleInputChange(e, fuel, setFuel, false, maxFuel)} className="border rounded px-2 py-1 w-full" title={`Max ${maxFuel} ${unitLabels.weight}`} /></td>
            <td><input type="text" value={fuel.arm} readOnly className="border rounded px-2 py-1 w-full bg-gray-100 cursor-not-allowed" /></td>
            <td><input type="text" value={fuel.moment.toFixed(2)} readOnly className="border rounded px-2 py-1 w-full bg-gray-100 cursor-not-allowed" /></td>
          </tr>
          <tr className="border-b hover:bg-gray-100">
            <td className="px-4 py-3 font-semibold">BAGGAGE AREA 1 (MAX {maxBaggage1} {unitLabels.weight})</td>
            <td><input type="text" name="weight" value={baggage1.weight} onChange={(e) => handleInputChange(e, baggage1, setBaggage1, false, maxBaggage1)} className="border rounded px-2 py-1 w-full" /></td>
            <td><input type="text" value={baggage1.arm} readOnly className="border rounded px-2 py-1 w-full bg-gray-100 cursor-not-allowed" /></td>
            <td><input type="text" value={baggage1.moment.toFixed(2)} readOnly className="border rounded px-2 py-1 w-full bg-gray-100 cursor-not-allowed" /></td>
          </tr>
          {maxBaggage2 > 0 && (
            <tr className="border-b hover:bg-gray-100">
              <td className="px-4 py-3 font-semibold">BAGGAGE AREA 2 (MAX {maxBaggage2} {unitLabels.weight})</td>
              <td><input type="text" name="weight" value={baggage2.weight} onChange={(e) => handleInputChange(e, baggage2, setBaggage2, false, maxBaggage2)} className="border rounded px-2 py-1 w-full" /></td>
              <td><input type="text" value={baggage2.arm} readOnly className="border rounded px-2 py-1 w-full bg-gray-100 cursor-not-allowed" /></td>
              <td><input type="text" value={baggage2.moment.toFixed(2)} readOnly className="border rounded px-2 py-1 w-full bg-gray-100 cursor-not-allowed" /></td>
            </tr>
          )}
          <tr className="bg-gray-200 font-bold">
            <td className="px-4 py-3">A.U.W. (MAX {envelopeConfig.maxWeight} {unitLabels.weight})</td>
            <td><input type="text" value={totalWeight.toFixed(2)} readOnly className="border rounded px-2 py-1 w-full bg-gray-100 cursor-not-allowed" /></td>
            <td><input type="text" value={`TAKEOFF C.O.G: ${takeoffCOG}`} readOnly className="border rounded px-2 py-1 w-full bg-gray-100 cursor-not-allowed font-semibold" /></td>
            <td><input type="text" value={totalMoment.toFixed(2)} readOnly className="border rounded px-2 py-1 w-full bg-gray-100 cursor-not-allowed" /></td>
          </tr>
          <tr className="border-t">
            <td className="px-4 py-3 font-semibold">EST FUEL BURN OFF {aircraftType === 'C-150' ? 14 : 48} {unitLabels.weight}/HR</td>
            <td><input type="text" name="weight" value={fuelBurn.weight} onChange={(e) => handleInputChange(e, fuelBurn, setFuelBurn, false, parseFloat(fuel.weight) || maxFuel)} className="border rounded px-2 py-1 w-full" /></td>
            <td><input type="text" value={fuelBurn.arm} readOnly className="border rounded px-2 py-1 w-full bg-gray-100 cursor-not-allowed" /></td>
            <td><input type="text" value={fuelBurn.moment.toFixed(2)} readOnly className="border rounded px-2 py-1 w-full bg-gray-100 cursor-not-allowed" /></td>
          </tr>
          <tr className="bg-gray-200 font-bold">
            <td className="px-4 py-3">LANDING WEIGHT</td>
            <td><input type="text" value={landingWeight.toFixed(2)} readOnly className="border rounded px-2 py-1 w-full bg-gray-100 cursor-not-allowed" /></td>
            <td><input type="text" value={`LANDING C.O.G: ${landingCOG}`} readOnly className="border rounded px-2 py-1 w-full bg-gray-100 cursor-not-allowed font-semibold" /></td>
            <td><input type="text" value={landingMoment.toFixed(2)} readOnly className="border rounded px-2 py-1 w-full bg-gray-100 cursor-not-allowed" /></td>
          </tr>
        </tbody>
      </table>

      <div className="mt-6 text-center">
        <button onClick={saveToDatabase} className="px-6 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition">
          Save Sheet
        </button>
      </div>

      <div className="mt-12">
        <h2 className="text-xl font-semibold mb-4 text-center">C.O.G MOMENT ENVELOPE</h2>
        <ResponsiveContainer width="95%" height={500} minWidth={800} className="cog-graph">
          <ComposedChart data={envelopePoints} margin={{ top: 20, right: 40, left: 40, bottom: 60 }}>
            <CartesianGrid stroke="rgba(0, 0, 0, 0.4)" strokeWidth={1} interval={4} />
            <CartesianGrid stroke="rgba(0, 0, 0, 0.1)" strokeWidth={0.5} interval={0} vertical={true} horizontal={true} />
            <XAxis
              type="number"
              dataKey="moment"
              label={{
                value: `LOADED AIRCRAFT MOMENT (${unitLabels.moment})`,
                position: 'insideBottom',
                offset: -10,
                style: { fill: '#333', fontSize: '0.9rem', fontWeight: '600' },
              }}
              domain={[envelopeConfig.momentMin, envelopeConfig.momentMax]}
              ticks={axisConfig.envelope.xTicks}
              tickFormatter={axisConfig.envelope.xTickFormatter}
              tick={{ fill: '#555', fontSize: '0.8rem', fontWeight: 'bold' }}
              height={50}
              allowDataOverflow={true}
            />
            <YAxis
              type="number"
              dataKey="weight"
              label={{
                value: `LOADED AIRCRAFT WEIGHT (${unitLabels.weight})`,
                angle: -90,
                position: 'insideLeft',
                offset: 7,
                style: { fill: '#333', fontSize: '0.9rem', fontWeight: '600' },
              }}
              domain={[envelopeConfig.minWeight, aircraftType === 'C-150' ? 800 : 2400]}
              ticks={axisConfig.envelope.yTicks}
              tickFormatter={axisConfig.envelope.yTickFormatter}
              tick={{ fill: '#555', fontSize: '0.8rem', fontWeight: 'bold' }}
              width={100}
              interval={0}
              allowDataOverflow={true}
            />
            <Tooltip
              formatter={(value, name) => [value.toFixed(1), name]}
            />
            <Legend 
              verticalAlign="bottom"
              height={36}
              wrapperStyle={{ paddingTop: 20 }}
            />
            <Customized component={drawEnvelopeArea} />
            <Customized component={drawLabels} />
            <Scatter data={[takeoffPoint]} name={`TAKEOFF C.O.G(${takeoffCOG})`} fill={isTakeoffOutOfEnvelope ? 'red' : 'brown'} shape="circle" r={8} />
            <Scatter data={[landingPoint]} name={`LANDING C.O.G(${landingCOG})`} fill={isLandingOutOfEnvelope ? 'red' : 'green'} shape="square" r={8} />
            <ReferenceLine
              x={takeoffPoint.moment}
              stroke="brown"
              strokeWidth={1.5}
              strokeDasharray="5 3"
            >
              <Label
                value={`${takeoffPoint.moment.toFixed(1)}`}
                position="top"
                dx={5}
                fill="brown"
                style={{ fontSize: '0.8rem', fontWeight: 600 }}
              />
            </ReferenceLine>
            <ReferenceLine
              y={takeoffPoint.weight}
              stroke="brown"
              strokeWidth={1.5}
              strokeDasharray="5 3"
            >
              <Label
                value={`${takeoffPoint.weight.toFixed(0)}`}
                position="left"
                fill="brown"
                style={{ fontSize: '0.8rem', fontWeight: 600 }}
              />
            </ReferenceLine>
            <ReferenceLine
              x={landingPoint.moment}
              stroke="green"
              strokeWidth={1.5}
              strokeDasharray="5 3"
            >
              <Label
                value={`${landingPoint.moment.toFixed(1)}`}
                position="top"
                dx={-5}
                fill="green"
                style={{ fontSize: '0.8rem', fontWeight: 600 }}
              />
            </ReferenceLine>
            <ReferenceLine
              y={landingPoint.weight}
              stroke="green"
              strokeWidth={1.5}
              strokeDasharray="5 3"
            >
              <Label
                value={`${landingPoint.weight.toFixed(0)}`}
                position="left"
                fill="green"
                style={{ fontSize: '0.8rem', fontWeight: 600 }}
              />
            </ReferenceLine>
            {aircraftType === 'C-172' && (
              <>
                <ReferenceLine
                  y={totalWeight}
                  stroke="orange"
                  strokeWidth={1.5}
                  strokeDasharray="5 3"
                >
                  <Label
                    value={`A.U.W: ${totalWeight.toFixed(0)}`}
                    position="left"
                    fill="orange"
                    style={{ fontSize: '0.8rem', fontWeight: 600 }}
                  />
                </ReferenceLine>
                <ReferenceLine
                  x={totalMoment / 1000}
                  stroke="orange"
                  strokeWidth={1.5}
                  strokeDasharray="5 3"
                >
                  <Label
                    value={`Moment/1000: ${(totalMoment / 1000).toFixed(1)}`}
                    position="top"
                    fill="orange"
                    style={{ fontSize: '0.8rem', fontWeight: 600 }}
                  />
                </ReferenceLine>
                <ReferenceLine
                  x={envelopeConfig.forwardLimit}
                  stroke="#8884d8"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                >
                  <Label
                    value={`Forward Limit: ${envelopeConfig.forwardLimit.toFixed(1)}`}
                    position="top"
                    fill="#8884d8"
                    style={{ fontSize: '0.8rem', fontWeight: 600 }}
                  />
                </ReferenceLine>
                <ReferenceLine
                  x={envelopeConfig.aftLimit}
                  stroke="#8884d8"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                >
                  <Label
                    value={`Aft Limit: ${envelopeConfig.aftLimit.toFixed(1)}`}
                    position="top"
                    fill="#8884d8"
                    style={{ fontSize: '0.8rem', fontWeight: 600 }}
                  />
                </ReferenceLine>
              </>
            )}
            {isTakeoffOutOfEnvelope && (
              <ReferenceLine
                x={takeoffPoint.moment}
                y={takeoffPoint.weight}
                stroke="red"
                strokeWidth={0}
                label={{
                  position: 'top',
                  value: '⚠️ Takeoff C.O.G OUT OF LIMIT',
                  fill: 'red',
                  fontSize: 12,
                  fontWeight: 'bold',
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
                  position: 'bottom',
                  value: '⚠️ Landing C.O.G OUT OF LIMIT',
                  fill: 'red',
                  fontSize: 12,
                  fontWeight: 'bold',
                }}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-16">
        <h2 className="text-xl font-semibold mb-4 text-center">LOADING GRAPH</h2>
        <ResponsiveContainer width="95%" height={500} className="loading-graph">
          <ComposedChart margin={{ top: 20, right: 40, bottom: 40, left: 60 }}>
            <CartesianGrid stroke="rgba(0, 0, 0, 0.4)" strokeWidth={1} />
            <XAxis
              type="number"
              dataKey="moment"
              label={{
                value: `LOAD MOMENT (${unitLabels.moment})`,
                position: 'insideBottom',
                offset: -10,
                style: { fill: '#333', fontSize: '0.9rem', fontWeight: '600' },
              }}
              domain={[0, loadingGraphConfig.maxMoment]}
              ticks={axisConfig.loading.xTicks}
              tickFormatter={axisConfig.loading.xTickFormatter}
              tick={{ fill: '#555', fontSize: '0.8rem', fontWeight: 'bold' }}
              interval={0}
              allowDataOverflow={true}
            />
            <YAxis
              type="number"
              dataKey="weight"
              label={{
                value: `LOAD WEIGHT (${unitLabels.weight})`,
                angle: -90,
                position: 'insideLeft',
                offset: 0,
                style: { fill: '#333', fontSize: '0.9rem', fontWeight: '600' },
              }}
              domain={[0, loadingGraphConfig.maxWeight]}
              ticks={axisConfig.loading.yTicks}
              tickFormatter={axisConfig.loading.yTickFormatter}
              tick={{ fill: '#555', fontSize: '0.8rem', fontWeight: 'bold' }}
              interval={0}
              allowDataOverflow={true}
            />
            <Tooltip />
            <Legend />
            <ReferenceLine
              segment={[{ x: (pilotPax.arm * loadingGraphConfig.pilotMaxWeight) / (aircraftType === 'C-172' ? 1000 : 1), y: loadingGraphConfig.pilotMaxWeight }, { x: 0, y: 0 }]}
              stroke="#10B981"
              strokeWidth={3}
            />
            {hasRearPax && (
              <ReferenceLine
                segment={[{ x: (rearPax.arm * loadingGraphConfig.rearPaxMaxWeight) / (aircraftType === 'C-172' ? 1000 : 1), y: loadingGraphConfig.rearPaxMaxWeight }, { x: 0, y: 0 }]}
                stroke="#6366F1"
                strokeWidth={3}
              />
            )}
            <ReferenceLine
              segment={[{ x: (fuel.arm * maxFuel) / (aircraftType === 'C-172' ? 1000 : 1), y: maxFuel }, { x: 0, y: 0 }]}
              stroke="#F59E0B"
              strokeWidth={3}
            />
            <ReferenceLine
              segment={[{ x: (baggage1.arm * maxBaggage1) / (aircraftType === 'C-172' ? 1000 : 1), y: maxBaggage1 }, { x: 0, y: 0 }]}
              stroke="#EF4444"
              strokeWidth={3}
            />
            {maxBaggage2 > 0 && (
              <ReferenceLine
                segment={[{ x: (baggage2.arm * maxBaggage2) / (aircraftType === 'C-172' ? 1000 : 1), y: maxBaggage2 }, { x: 0, y: 0 }]}
                stroke="#F59E0B"
                strokeWidth={3}
              />
            )}
            <ReferenceDot x={moments[0]} y={weightData[0].weight} r={5} fill="#10B981" stroke="#065F46" strokeWidth={2} />
            {hasRearPax && <ReferenceDot x={moments[1]} y={weightData[1].weight} r={5} fill="#6366F1" stroke="#3730A3" strokeWidth={2} />}
            <ReferenceDot x={moments[hasRearPax ? 2 : 1]} y={weightData[hasRearPax ? 2 : 1].weight} r={5} fill="#F59E0B" stroke="#B45309" strokeWidth={2} />
            <ReferenceDot x={moments[hasRearPax ? 3 : 2]} y={weightData[hasRearPax ? 3 : 2].weight} r={5} fill="#EF4444" stroke="#991B1B" strokeWidth={2} />
            {maxBaggage2 > 0 && <ReferenceDot x={moments[4]} y={weightData[4].weight} r={5} fill="#F59E0B" stroke="#B45309" strokeWidth={2} />}
          </ComposedChart>
        </ResponsiveContainer>
        <div className="flex flex-wrap gap-4 mt-4 justify-center text-sm text-gray-700">
          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#10B981' }} /><span>PILOT & PAX</span></div>
          {hasRearPax && <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#6366F1' }} /><span>REAR PAX</span></div>}
          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#F59E0B' }} /><span>FUEL</span></div>
          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#EF4444' }} /><span>BAGGAGE AREA 1</span></div>
          {maxBaggage2 > 0 && <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#F59E0B' }} /><span>BAGGAGE AREA 2</span></div>}
        </div>
      </div>

      <div className="mt-16">
        <h2 className="text-xl font-semibold mb-4 text-center">STABILITY DIAGRAM</h2>
        <ResponsiveContainer width="95%" height={200} className="stability-diagram">
          <ComposedChart margin={{ top: 20, right: 40, bottom: 40, left: 60 }}>
            <CartesianGrid stroke="rgba(0, 0, 0, 0.4)" strokeWidth={1} />
            <XAxis
              type="number"
              dataKey="x"
              label={{
                value: `DISTANCE FROM DATUM (${unitLabels.arm})`,
                position: 'insideBottom',
                offset: -10,
                style: { fill: '#333', fontSize: '0.9rem', fontWeight: '600' },
              }}
              domain={[currentStabilityConfig.xMin, currentStabilityConfig.xMax]}
              ticks={currentStabilityConfig.xTicks}
              tickFormatter={currentStabilityConfig.xTickFormatter}
              tick={{ fill: '#555', fontSize: '0.8rem', fontWeight: 'bold' }}
              interval={0}
              allowDataOverflow={true}
            />
            <YAxis
              type="number"
              dataKey="y"
              label={{
                value: 'AIRCRAFT',
                angle: -90,
                position: 'insideLeft',
                offset: 0,
                style: { fill: '#333', fontSize: '0.9rem', fontWeight: '600' },
              }}
              domain={[currentStabilityConfig.yMin, currentStabilityConfig.yMax]}
              hide={true}
              allowDataOverflow={true}
            />
            <Customized component={drawAircraftDiagram} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

const MinimumLegalFuel = ({ aircraftType }) => {
  const [fuelData, setFuelData] = useState({
    Destination: { hr: 0, min: 0, usg: 0 },
    Alternate: { hr: 0, min: 0, usg: 0 },
    '10% of D&A': { hr: 0, min: 0, usg: 0 },
    Reserve: { hr: 0, min: 45, usg: 0 },
    Extra: { hr: 0, min: 0, usg: 0 },
  });

  const [lastEdited, setLastEdited] = useState(null);

  const fuelRates = {
    'C-150': 5.75,
    'C-172': 11.78,
  };

  const maxGallons = {
    'C-150': 23,
    'C-172': 53,
  };

  const maxEnduranceHours = {
    'C-150': 4,
    'C-172': 4.5,
  };

  useEffect(() => {
    setFuelData(prev => ({
      ...prev,
      Reserve: {
        ...prev.Reserve,
        usg: calculateFuelUsage(0, 45, aircraftType === 'C-172'),
      },
    }));
  }, [aircraftType]);

  const calculateFuelUsage = (hours, minutes, isC172) => {
    const totalHours = (parseFloat(hours) || 0) + (parseFloat(minutes) || 0) / 60;
    const rate = isC172 ? fuelRates['C-172'] : fuelRates['C-150'];
    return Math.round(totalHours * rate * 100) / 100;
  };

  const handleInputChange = (category, field, value) => {
    if (value === '' || (/^\d*\.?\d*$/.test(value) && parseFloat(value) >= 0)) {
      const numericValue = field === 'min' ? Math.min(59, parseInt(value) || 0) : parseFloat(value) || 0;
      setFuelData(prev => {
        const updated = { ...prev, [category]: { ...prev[category], [field]: numericValue } };
        setLastEdited(category);

        if (['Destination', 'Alternate', 'Reserve', 'Extra'].includes(category)) {
          updated[category].usg = calculateFuelUsage(updated[category].hr, updated[category].min, aircraftType === 'C-172');
        }

        const daUsg = (parseFloat(updated.Destination.usg || 0) + parseFloat(updated.Alternate.usg || 0)) * 0.1;
        updated['10% of D&A'].usg = Math.round(daUsg * 100) / 100;
        const daTotalHours = daUsg / (aircraftType === 'C-172' ? fuelRates['C-172'] : fuelRates['C-150']);
        updated['10% of D&A'].hr = Math.floor(daTotalHours);
        updated['10% of D&A'].min = Math.round((daTotalHours % 1) * 60);

        let totalHours = 0;
        Object.values(updated).forEach(item => {
          totalHours += item.hr + (item.min / 60);
        });
        if (totalHours > maxEnduranceHours[aircraftType]) {
          const excessHours = totalHours - maxEnduranceHours[aircraftType];
          if (lastEdited) {
            const currentHours = updated[lastEdited].hr + (updated[lastEdited].min / 60);
            const newHours = Math.max(0, currentHours - excessHours);
            updated[lastEdited].hr = Math.floor(newHours);
            updated[lastEdited].min = Math.round((newHours % 1) * 60);
            updated[lastEdited].usg = calculateFuelUsage(updated[lastEdited].hr, updated[lastEdited].min, aircraftType === 'C-172');
            const newDaUsg = (parseFloat(updated.Destination.usg || 0) + parseFloat(updated.Alternate.usg || 0)) * 0.1;
            updated['10% of D&A'].usg = Math.round(newDaUsg * 100) / 100;
            const newDaTotalHours = newDaUsg / (aircraftType === 'C-172' ? fuelRates['C-172'] : fuelRates['C-150']);
            updated['10% of D&A'].hr = Math.floor(newDaTotalHours);
            updated['10% of D&A'].min = Math.round((newDaTotalHours % 1) * 60);
          }
        }

        const totalGallons = Object.values(updated).reduce((sum, item) => sum + parseFloat(item.usg || 0), 0);
        if (totalGallons > maxGallons[aircraftType]) {
          const excessGallons = totalGallons - maxGallons[aircraftType];
          if (lastEdited) {
            const newUsg = Math.max(0, updated[lastEdited].usg - excessGallons);
            updated[lastEdited].usg = Math.round(newUsg * 100) / 100;
            const totalHours = updated[lastEdited].usg / (aircraftType === 'C-172' ? fuelRates['C-172'] : fuelRates['C-150']);
            updated[lastEdited].hr = Math.floor(totalHours);
            updated[lastEdited].min = Math.round((totalHours % 1) * 60);
            const newDaUsg = (parseFloat(updated.Destination.usg || 0) + parseFloat(updated.Alternate.usg || 0)) * 0.1;
            updated['10% of D&A'].usg = Math.round(newDaUsg * 100) / 100;
            const newDaTotalHours = newDaUsg / (aircraftType === 'C-172' ? fuelRates['C-172'] : fuelRates['C-150']);
            updated['10% of D&A'].hr = Math.floor(newDaTotalHours);
            updated['10% of D&A'].min = Math.round((newDaTotalHours % 1) * 60);
          }
        }

        return updated;
      });
    }
  };

  const total = Object.values(fuelData).reduce(
    (acc, curr) => ({
      hr: acc.hr + (parseFloat(curr.hr) || 0),
      min: acc.min + (parseFloat(curr.min) || 0),
      usg: acc.usg + (parseFloat(curr.usg) || 0),
    }),
    { hr: 0, min: 0, usg: 0 }
  );

  const normalizedHr = total.hr + Math.floor(total.min / 60);
  const normalizedMin = total.min % 60;

  return (
    <div className="bg-gray-50 p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4 text-center">Minimum Legal Fuel - {aircraftType}</h2>
      <table className="w-full border-collapse border border-gray-300">
        <thead>
          <tr className="bg-indigo-100 text-indigo-700">
            <th className="border px-4 py-2">Category</th>
            <th className="border px-4 py-2">Hours</th>
            <th className="border px-4 py-2">Minutes</th>
            <th className="border px-4 py-2">Gallons</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(fuelData).map(([category, { hr, min, usg }]) => (
            <tr key={category} className="border-b hover:bg-gray-100">
              <td className="border px-4 py-2">{category}</td>
              <td className="border px-4 py-2">
                <input
                  type="number"
                  value={hr}
                  onChange={(e) => handleInputChange(category, 'hr', e.target.value)}
                  className="border rounded px-2 py-1 w-full"
                  min="0"
                />
              </td>
              <td className="border px-4 py-2">
                <input
                  type="number"
                  value={min}
                  onChange={(e) => handleInputChange(category, 'min', e.target.value)}
                  className="border rounded px-2 py-1 w-full"
                  min="0"
                  max="59"
                />
              </td>
              <td className="border px-4 py-2">{usg.toFixed(2)}</td>
            </tr>
          ))}
          <tr className="bg-gray-200 font-bold">
            <td className="border px-4 py-2">Total Endurance</td>
            <td className="border px-4 py-2">{Math.floor(normalizedHr)}</td>
            <td className="border px-4 py-2">{normalizedMin}</td>
            <td className="border px-4 py-2">{total.usg.toFixed(2)}</td>
          </tr>
        </tbody>
      </table>
      <p className="mt-4 text-sm text-gray-600">Max usage: {maxGallons[aircraftType]} gallons, Max endurance: {maxEnduranceHours[aircraftType]} hours</p>
    </div>
  );
};

const Homepage = () => {
  const [activeTab, setActiveTab] = useState('Sheet');
  const [activeAircraftTab, setActiveAircraftTab] = useState('C-150');
  const [userEmail, setUserEmail] = useState('');
  const [pilotInfo, setPilotInfo] = useState({
    pilotName: '',
    route: '',
    date: '',
    registration: '',
  });

  const aircraftConfigs = {
    'C-150': {
      aircraftType: 'C-150',
      maxFuel: 95,
      maxBaggage1: 54,
      maxBaggage2: 0,
      hasRearPax: false,
      unitLabels: { weight: 'KGS', arm: 'MTS.', moment: 'MTS.KG' },
      envelopeConfig: {
        minWeight: 500,
        maxWeight: 750,
        forwardLimit: 0.838,
        aftLimit: 0.952,
        momentMin: 400,
        momentMax: 750,
      },
      loadingGraphConfig: {
        pilotMaxWeight: 170,
        maxWeight: 180,
        maxMoment: 180,
      },
      axisConfig: {
        envelope: {
          xTicks: Array.from({ length: 36 }, (_, i) => 400 + i * 10),
          xTickFormatter: (value) => (value % 50 === 0 ? value.toFixed(0) : ''),
          yTicks: Array.from({ length: 61 }, (_, i) => 500 + i * 5),
          yTickFormatter: (value) => (value % 50 === 0 ? value.toFixed(0) : ''),
        },
        loading: {
          xTicks: Array.from({ length: 37 }, (_, i) => i * 5),
          xTickFormatter: (value) => (value % 20 === 0 ? value.toFixed(0) : ''),
          yTicks: Array.from({ length: 37 }, (_, i) => i * 5),
          yTickFormatter: (value) => (value % 20 === 0 ? value.toFixed(0) : ''),
        },
      },
      initialState: {
        basicEmpty: { weight: '', arm: '', moment: 0 },
        pilotPax: { weight: '', arm: 0.99, moment: 0 },
        rearPax: { weight: '0', arm: '0', moment: 0 },
        fuel: { weight: '', arm: 1.07, moment: 0 },
        baggage1: { weight: '', arm: 1.5, moment: 0 },
        baggage2: { weight: '0', arm: '0', moment: 0 },
        fuelBurn: { weight: '', arm: 1.07, moment: 0 },
      },
    },
    'C-172': {
      aircraftType: 'C-172',
      maxFuel: 240,
      maxBaggage1: 120,
      maxBaggage2: 50,
      hasRearPax: true,
      unitLabels: { weight: 'LBS', arm: 'INCHES', moment: 'LBS.INCHES/1000' },
      envelopeConfig: {
        minWeight: 1500,
        maxWeight: 2300,
        forwardLimit: 35,
        aftLimit: 47.3,
        momentMin: 50,
        momentMax: 120,
      },
      loadingGraphConfig: {
        pilotMaxWeight: 400,
        rearPaxMaxWeight: 340,
        maxWeight: 450,
        maxMoment: 35,
      },
      axisConfig: {
        envelope: {
          xTicks: Array.from({ length: 14 }, (_, i) => 50 + i * 5),
          xTickFormatter: (value) => value.toFixed(1),
          yTicks: Array.from({ length: 10 }, (_, i) => 1500 + i * 100),
          yTickFormatter: (value) => value.toFixed(0),
        },
        loading: {
          xTicks: Array.from({ length: 8 }, (_, i) => i * 5),
          xTickFormatter: (value) => value.toFixed(1),
          yTicks: Array.from({ length: 10 }, (_, i) => i * 50),
          yTickFormatter: (value) => (value % 50 === 0 ? value.toFixed(0) : ''),
        },
      },
      initialState: {
        basicEmpty: { weight: '1467', arm: '41.09', moment: (1467 * 41.09) / 1000 },
        pilotPax: { weight: '', arm: '37', moment: 0 },
        rearPax: { weight: '', arm: '73', moment: 0 },
        fuel: { weight: '', arm: '46', moment: 0 },
        baggage1: { weight: '', arm: '95', moment: 0 },
        baggage2: { weight: '', arm: '123', moment: 0 },
        fuelBurn: { weight: '', arm: '46', moment: 0 },
      },
    },
  };

  const [states, setStates] = useState({
    'C-150': aircraftConfigs['C-150'].initialState,
    'C-172': aircraftConfigs['C-172'].initialState,
  });

  const setStateForAircraft = (aircraftType, stateKey, value) => {
    setStates((prev) => ({
      ...prev,
      [aircraftType]: {
        ...prev[aircraftType],
        [stateKey]: value,
      },
    }));
  };

  const { basicEmpty, pilotPax, rearPax, fuel, baggage1, baggage2, fuelBurn } = states[activeAircraftTab];

  const totalWeight =
    (parseFloat(basicEmpty.weight) || 0) +
    (parseFloat(pilotPax.weight) || 0) +
    (parseFloat(rearPax.weight) || 0) +
    (parseFloat(fuel.weight) || 0) +
    (parseFloat(baggage1.weight) || 0) +
    (parseFloat(baggage2.weight) || 0);

  const totalMoment =
    (basicEmpty.moment || 0) +
    (pilotPax.moment || 0) +
    (rearPax.moment || 0) +
    (fuel.moment || 0) +
    (baggage1.moment || 0) +
    (baggage2.moment || 0);

  const takeoffCOG = totalWeight > 0 ? ((totalMoment / totalWeight) * (activeAircraftTab === 'C-172' ? 1000 : 1)).toFixed(2) : '0';

  const fuelBurnWeight = parseFloat(fuelBurn.weight) || 0;
  const fuelBurnMoment = ((fuelBurnWeight * fuel.arm) / (activeAircraftTab === 'C-172' ? 1000 : 1)).toFixed(2);

  const landingWeight = totalWeight - fuelBurnWeight;
  const landingMoment = totalMoment - fuelBurnMoment;
  const landingCOG = landingWeight > 0 ? ((landingMoment / landingWeight) * (activeAircraftTab === 'C-172' ? 1000 : 1)).toFixed(2) : '0';

  const saveToDatabase = async () => {
    const scaleFactor = activeAircraftTab === 'C-172' ? 1000 : 1;
    const sheetData = {
      date: pilotInfo.date || new Date().toISOString(),
      aircraftType: activeAircraftTab,
      pilotName: pilotInfo.pilotName,
      route: pilotInfo.route,
      registration: pilotInfo.registration,
      entries: [
        {
          description: 'BASIC EMPTY WEIGHT',
          weight: parseFloat(basicEmpty.weight) || 0,
          arm: parseFloat(basicEmpty.arm),
          moment: parseFloat(basicEmpty.moment) * scaleFactor,
        },
        {
          description: 'PILOT & PAX',
          weight: parseFloat(pilotPax.weight) || 0,
          arm: parseFloat(pilotPax.arm),
          moment: parseFloat(pilotPax.moment) * scaleFactor,
        },
        ...(aircraftConfigs[activeAircraftTab].hasRearPax ? [{
          description: 'REAR PAX',
          weight: parseFloat(rearPax.weight) || 0,
          arm: parseFloat(rearPax.arm),
          moment: parseFloat(rearPax.moment) * scaleFactor,
        }] : []),
        {
          description: 'FUEL',
          weight: parseFloat(fuel.weight) || 0,
          arm: parseFloat(fuel.arm),
          moment: parseFloat(fuel.moment) * scaleFactor,
        },
        {
          description: 'BAGGAGE AREA 1',
          weight: parseFloat(baggage1.weight) || 0,
          arm: parseFloat(baggage1.arm),
          moment: parseFloat(baggage1.moment) * scaleFactor,
        },
        ...(aircraftConfigs[activeAircraftTab].maxBaggage2 > 0 ? [{
          description: 'BAGGAGE AREA 2',
          weight: parseFloat(baggage2.weight) || 0,
          arm: parseFloat(baggage2.arm),
          moment: parseFloat(baggage2.moment) * scaleFactor,
        }] : []),
        {
          description: 'FUEL BURN',
          weight: parseFloat(fuelBurn.weight) || 0,
          arm: parseFloat(fuelBurn.arm),
          moment: parseFloat(fuelBurn.moment) * scaleFactor,
        },
      ],
      totalTakeoffWeight: totalWeight,
      takeoffCOG,
      takeoffMoment: totalMoment * scaleFactor,
      fuelBurnOff: parseFloat(fuelBurn.weight) || 0,
      landingWeight,
      landingCOG,
      landingMoment: landingMoment * scaleFactor,
    };

    try {
      console.log('Submitting to backend:', sheetData);
      const response = await axios.post('/api/weightbalance/save', sheetData);
      alert('Weight and Balance Sheet saved successfully!');
    } catch (error) {
      console.error('Error saving sheet:', error);
      alert('Failed to save sheet.');
    }
  };

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/auth/logout', {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      localStorage.removeItem('token');
      window.location.href = '/login';
    } catch (error) {
      console.error('Error during logout:', error);
      alert('Failed to logout. Please try again.');
    }
  };

  const captureGraphs = async () => {
    const graphImages = [];

    const section = document.getElementById('weight-balance-section');
    if (!section) {
      console.warn('weight-balance-section not found');
      return [null, null, null, null];
    }

    // Helper function to validate base64 PNG string
    const isValidBase64PNG = (dataUrl) => {
      return typeof dataUrl === 'string' && dataUrl.startsWith('data:image/png;base64,');
    };

    // Force Recharts to re-render
    window.dispatchEvent(new Event('resize'));

    // Wait for charts to render
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Log DOM structure for debugging
    console.log('DOM structure of weight-balance-section:', section.outerHTML.substring(0, 500) + '...');

    // Capture Pilot Information Section
    const pilotInfoSection = section.querySelector('div.mb-6');
    if (pilotInfoSection) {
      try {
        const canvas = await html2canvas(pilotInfoSection, {
          scale: 2,
          useCORS: true,
          logging: true,
          backgroundColor: '#fff',
        });
        const pilotInfoImage = canvas.toDataURL('image/png');
        if (isValidBase64PNG(pilotInfoImage)) {
          graphImages.push(pilotInfoImage);
          console.log(`Captured Pilot Info: ${pilotInfoImage.substring(0, 50)}...`);
        } else {
          console.warn('Invalid Pilot Info image format');
          graphImages.push(null);
        }
      } catch (err) {
        console.error('Error capturing Pilot Info:', err);
        graphImages.push(null);
      }
    } else {
      console.warn('Pilot Info section not found');
      graphImages.push(null);
    }

    // Capture C.O.G Moment Envelope
    const cogGraphSection = section.querySelector('.cog-graph .recharts-wrapper');
    if (cogGraphSection) {
      try {
        const style = window.getComputedStyle(cogGraphSection);
        console.log('C.O.G graph styles:', {
          display: style.display,
          visibility: style.visibility,
          width: cogGraphSection.offsetWidth,
          height: cogGraphSection.offsetHeight,
        });
        if (style.display === 'none' || style.visibility === 'hidden' || cogGraphSection.offsetWidth === 0) {
          console.warn('C.O.G graph is hidden, not visible, or has zero width');
          graphImages.push(null);
        } else {
          const canvas = await html2canvas(cogGraphSection, {
            scale: 2,
            useCORS: true,
            logging: true,
            backgroundColor: '#fff',
            width: cogGraphSection.offsetWidth,
            height: cogGraphSection.offsetHeight,
          });
          const cogGraphImage = canvas.toDataURL('image/png');
          if (isValidBase64PNG(cogGraphImage)) {
            graphImages.push(cogGraphImage);
            console.log(`Captured CoG graph: ${cogGraphImage.substring(0, 50)}...`);
          } else {
            console.warn('Invalid CoG graph image format');
            graphImages.push(null);
          }
        }
      } catch (err) {
        console.error('Error capturing CoG graph:', err);
        graphImages.push(null);
      }
    } else {
      console.warn('C.O.G graph .cog-graph .recharts-wrapper not found');
      graphImages.push(null);
    }

    // Capture Loading Graph (including legend)
    const loadingGraphSection = section.querySelector('.loading-graph');
    if (loadingGraphSection) {
      try {
        const style = window.getComputedStyle(loadingGraphSection);
        console.log('Loading graph styles:', {
          display: style.display,
          visibility: style.visibility,
          width: loadingGraphSection.offsetWidth,
          height: loadingGraphSection.offsetHeight,
        });
        if (style.display === 'none' || style.visibility === 'hidden' || loadingGraphSection.offsetWidth === 0) {
          console.warn('Loading graph is hidden, not visible, or has zero width');
          graphImages.push(null);
        } else {
          const canvas = await html2canvas(loadingGraphSection, {
            scale: 2,
            useCORS: true,
            logging: true,
            backgroundColor: '#fff',
            width: loadingGraphSection.offsetWidth,
            height: loadingGraphSection.offsetHeight,
          });
          const loadingGraphImage = canvas.toDataURL('image/png');
          if (isValidBase64PNG(loadingGraphImage)) {
            graphImages.push(loadingGraphImage);
            console.log(`Captured Loading graph: ${loadingGraphImage.substring(0, 50)}...`);
          } else {
            console.warn('Invalid Loading graph image format');
            graphImages.push(null);
          }
        }
      } catch (err) {
        console.error('Error capturing Loading graph:', err);
        graphImages.push(null);
      }
    } else {
      console.warn('Loading graph .loading-graph not found');
      graphImages.push(null);
    }

    // Capture Stability Diagram
    const stabilitySection = section.querySelector('.stability-diagram .recharts-wrapper');
    if (stabilitySection) {
      try {
        const style = window.getComputedStyle(stabilitySection);
        console.log('Stability diagram styles:', {
          display: style.display,
          visibility: style.visibility,
          width: stabilitySection.offsetWidth,
          height: stabilitySection.offsetHeight,
        });
        if (style.display === 'none' || style.visibility === 'hidden' || stabilitySection.offsetWidth === 0) {
          console.warn('Stability diagram is hidden, not visible, or has zero width');
          graphImages.push(null);
        } else {
          const canvas = await html2canvas(stabilitySection, {
            scale: 2,
            useCORS: true,
            logging: true,
            backgroundColor: '#fff',
            width: stabilitySection.offsetWidth,
            height: stabilitySection.offsetHeight,
          });
          const stabilityImage = canvas.toDataURL('image/png');
          if (isValidBase64PNG(stabilityImage)) {
            graphImages.push(stabilityImage);
            console.log(`Captured Stability diagram: ${stabilityImage.substring(0, 50)}...`);
          } else {
            console.warn('Invalid Stability diagram image format');
            graphImages.push(null);
          }
        }
      } catch (err) {
        console.error('Error capturing Stability diagram:', err);
        graphImages.push(null);
      }
    } else {
      console.warn('Stability diagram .stability-diagram .recharts-wrapper not found');
      graphImages.push(null);
    }

    console.log('Captured images:', {
      'Pilot Info': !!graphImages[0],
      'CoG': !!graphImages[1],
      'Loading': !!graphImages[2],
      'Stability': !!graphImages[3],
    });

    // Alert user if critical graph capture failed
    if (!graphImages[1] || !graphImages[3]) {
      console.error('Critical graph capture failed, notifying user');
      alert('Failed to capture C.O.G Moment Envelope or Stability Diagram. Please ensure the graphs are visible and try again.');
    }

    return graphImages;
  };

  const getCleanedHTML = () => {
    const original = document.getElementById("weight-balance-section");
    if (!original) return "";

    const clone = original.cloneNode(true);

    // Replace all <input> with <span> showing their current value
    const inputs = clone.querySelectorAll("input");
    inputs.forEach((input) => {
      const span = document.createElement("span");
      span.textContent = input.value || "";
      span.className = "inline-block min-h-[1.5rem] px-1 border border-gray-300 rounded";
      input.replaceWith(span);
    });

    return clone.outerHTML;
  };

  const handleGenerateAndSendPDF = async () => {
    if (!userEmail) {
      alert('Please enter an email address.');
      return;
    }

    if (!pilotInfo.pilotName || !pilotInfo.route || !pilotInfo.registration) {
      alert('Please fill in all pilot information fields (Pilot Name, Route, Registration).');
      return;
    }

    const htmlContent = getCleanedHTML();
    if (!htmlContent) {
      alert("Section not found or couldn't generate clean HTML.");
      return;
    }

    const graphImages = await captureGraphs();
    if (!graphImages[1] || !graphImages[3]) {
      // Alert already shown in captureGraphs
      return;
    }

    try {
      const response = await axios.post('/api/generate-pdf', {
        html: htmlContent,
        email: userEmail,
        aircraftType: activeAircraftTab,
        date: pilotInfo.date || new Date().toLocaleString('en-US', { timeZone: 'Africa/Nairobi' }),
        pilotName: pilotInfo.pilotName,
        route: pilotInfo.route,
        registration: pilotInfo.registration,
        graphImages,
      });

      if (response.data.success) {
        alert('PDF sent to your email!');
      } else {
        alert('Failed to send PDF.');
      }
    } catch (error) {
      console.error('Error sending PDF:', error);
      let errorMessage = 'An error occurred while sending the PDF.';
      if (error.response && error.response.data) {
        const text = new TextDecoder().decode(new Uint8Array(error.response.data));
        console.log('Backend error response:', text);
        errorMessage += ` ${text}`;
      }
      alert(errorMessage);
    }
  };

  const handleDownloadPDF = async () => {
    const email = userEmail || localStorage.getItem("email");
    if (!email) {
      alert("Email not found. Please enter an email or log in again.");
      return;
    }

    if (!pilotInfo.pilotName || !pilotInfo.route || !pilotInfo.registration) {
      alert('Please fill in all pilot information fields (Pilot Name, Route, Registration).');
      return;
    }

    await new Promise((r) => requestAnimationFrame(r));

    const cleanedHTML = getCleanedHTML();
    if (!cleanedHTML) {
      alert("Section not found or couldn't generate clean HTML.");
      return;
    }

    const graphImages = await captureGraphs();
    if (!graphImages[1] || !graphImages[3]) {
      // Alert already shown in captureGraphs
      return;
    }

    try {
          const response = await axios.post(
            "/api/generate-pdf",
            {
              html: cleanedHTML,
              aircraftType: activeAircraftTab,
              date: pilotInfo.date || new Date().toLocaleString("en-US", { timeZone: 'Africa/Nairobi' }),
              email,
              download: true,
              pilotName: pilotInfo.pilotName,
              route: pilotInfo.route,
              registration: pilotInfo.registration,
              graphImages,
            },
            {
              responseType: "arraybuffer",
              headers: {
                "Content-Type": "application/json",
              },
            }
          );
    
          const contentType = response.headers["content-type"] || "application/pdf";
          if (!response.data || response.data.byteLength === 0) {
            throw new Error("Empty PDF response data");
          }
    
          const blob = new Blob([response.data], { type: contentType });
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          const safeAircraftTab = activeAircraftTab.replace(/[^a-zA-Z0-9]/g, "-");
          const filename = `weight_and_balance_${safeAircraftTab}_${Date.now()}.pdf`;
          link.href = url;
          link.setAttribute("download", filename);
          document.body.appendChild(link);
          link.click();
          link.remove();
          URL.revokeObjectURL(url);
        } catch (error) {
          console.error("Download error:", error);
          let errorMessage = 'Failed to download PDF';
          if (error.response && error.response.data) {
            const text = new TextDecoder().decode(new Uint8Array(error.response.data));
            console.log('Backend error response:', text);
            errorMessage += `: ${text}`;
          } else {
            errorMessage += `: ${error.message}`;
          }
          alert(errorMessage);
        }
      };
    
    
    
      const TabButton = ({ label, isActive, onClick }) => (
        <button
          onClick={() => onClick(label)}
          className={`px-4 py-2 rounded-t-lg font-medium transition-colors ${
            isActive ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-800'
          }`}
        >
          {label}
        </button>
      );
    
      const AircraftTabButton = ({ label, isActive, onClick }) => (
        <button
          onClick={() => onClick(label)}
          className={`px-4 py-2 font-medium transition-colors ${
            isActive ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          {label}
        </button>
      );
    
    return (
        <div className="min-h-screen w-full bg-gray-100">
          <div className="min-h-screen">
            <header className="bg-white shadow-sm px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-8">
                  <div className="w-8 h-8 bg-gray-800 rounded-lg flex items-center justify-center">
                    <div className="grid grid-cols-2 gap-0.5">
                      <div className="w-1.5 h-1.5 bg-white rounded-sm"></div>
                      <div className="w-1.5 h-1.5 bg-white rounded-sm"></div>
                      <div className="w-1.5 h-1.5 bg-white rounded-sm"></div>
                      <div className="w-1.5 h-1.5 bg-white rounded-sm"></div>
                    </div>
                  </div>
                  <nav className="flex space-x-6">
                    <div className="space-x-6">
                      <a href="#" className="text-gray-900 font-medium hover:text-blue-600">Home</a>
                      <button onClick={handleLogout} className="text-gray-600 hover:text-blue-600">Logout</button>
                    </div>
                  </nav>
                </div>
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-gray-400 rounded-full flex items-center justify-center">
                    <div className="text-white font-semibold">M</div>
                  </div>
                </div>
              </div>
            </header>
    
            <main className="max-w-6xl mx-auto px-6 py-12">
              <div className="text-center mb-12">
                <h1 className="text-5xl font-bold text-gray-900 mb-4">Cessna Weight and Balance</h1>
                <p className="text-xl font-semibold text-gray-600">
                  Select your Cessna and enter load sheet data to calculate aircraft weight and balance.
                </p>
              </div>
              <div className="bg-white rounded-lg shadow-md">
                <div className="flex space-x-1 p-1 bg-gray-50 rounded-t-lg">
                  <TabButton label="Sheet" isActive={activeTab === 'Sheet'} onClick={setActiveTab} />
                  <TabButton label="Results" isActive={activeTab === 'Results'} onClick={setActiveTab} />
                  <TabButton label="Fuel" isActive={activeTab === 'Fuel'} onClick={setActiveTab} />
                </div>
                <div className="p-8">
                  {activeTab === 'Sheet' && (
                    <div className="text-center">
                      <h3 className="text-2xl font-bold text-center mb-8 text-gray-700">Weight and Balance Sheet</h3>
                      <div className="flex space-x-1 mb-6">
                        <AircraftTabButton label="C-150" isActive={activeAircraftTab === 'C-150'} onClick={setActiveAircraftTab} />
                        <AircraftTabButton label="C-172" isActive={activeAircraftTab === 'C-172'} onClick={setActiveAircraftTab} />
                      </div>
                      <WeightBalanceTable
                        basicEmpty={basicEmpty}
                        setBasicEmpty={(value) => setStateForAircraft(activeAircraftTab, 'basicEmpty', value)}
                        pilotPax={pilotPax}
                        setPilotPax={(value) => setStateForAircraft(activeAircraftTab, 'pilotPax', value)}
                        rearPax={rearPax}
                        setRearPax={(value) => setStateForAircraft(activeAircraftTab, 'rearPax', value)}
                        fuel={fuel}
                        setFuel={(value) => setStateForAircraft(activeAircraftTab, 'fuel', value)}
                        baggage1={baggage1}
                        setBaggage1={(value) => setStateForAircraft(activeAircraftTab, 'baggage1', value)}
                        baggage2={baggage2}
                        setBaggage2={(value) => setStateForAircraft(activeAircraftTab, 'baggage2', value)}
                        fuelBurn={fuelBurn}
                        setFuelBurn={(value) => setStateForAircraft(activeAircraftTab, 'fuelBurn', value)}
                        totalWeight={totalWeight}
                        takeoffCOG={takeoffCOG}
                        landingWeight={landingWeight}
                        landingCOG={landingCOG}
                        totalMoment={totalMoment}
                        landingMoment={landingMoment}
                        saveToDatabase={saveToDatabase}
                        aircraftConfig={aircraftConfigs[activeAircraftTab]}
                        pilotInfo={{ ...pilotInfo, setPilotInfo }}
                      />
                      <div className="mt-6 flex items-center justify-center space-x-2">
                        <input
                          type="email"
                          value={userEmail}
                          onChange={(e) => setUserEmail(e.target.value)}
                          placeholder="Enter your email"
                          className="border rounded px-2 py-1 w-full max-w-xs"
                        />
                        <button
                          onClick={(e) => { e.preventDefault(); handleGenerateAndSendPDF(); }}
                          className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                        >
                          Generate and Send PDF
                        </button>
                        <button
                          onClick={handleDownloadPDF}
                          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                          Download PDF
                        </button>
                      </div>
                    </div>
                  )}
                  {activeTab === 'Results' && (
                    <div className="text-center py-20">
                      <h3 className="text-lg font-semibold mb-4 text-gray-700">Results Summary</h3>
                      <div className="max-w-2xl mx-auto space-y-4">
                        <div className="bg-blue-50 p-4 rounded-lg">
                          <p className="text-sm text-gray-600">Pilot Name: <span className="font-semibold">{pilotInfo.pilotName || 'N/A'}</span></p>
                          <p className="text-sm text-gray-600">Route: <span className="font-semibold">{pilotInfo.route || 'N/A'}</span></p>
                          <p className="text-sm text-gray-600">Date: <span className="font-semibold">{pilotInfo.date || 'N/A'}</span></p>
                          <p className="text-sm text-gray-600">Aircraft Registration: <span className="font-semibold">{pilotInfo.registration || 'N/A'}</span></p>
                          <p className="text-sm text-gray-600">Gross Weight: <span className="font-semibold">{totalWeight.toFixed(2)} {aircraftConfigs[activeAircraftTab].unitLabels.weight}</span></p>
                          <p className="text-sm text-gray-600">Takeoff C.O.G: <span className="font-semibold">{takeoffCOG}</span></p>
                          <p className="text-sm text-gray-600">Landing Weight: <span className="font-semibold">{landingWeight.toFixed(2)} {aircraftConfigs[activeAircraftTab].unitLabels.weight}</span></p>
                          <p className="text-sm text-gray-600">Landing C.O.G: <span className="font-semibold">{landingCOG}</span></p>
                        </div>
                        {totalWeight === 0 ? (
                          <p className="text-gray-500">Complete the weight and balance form to see results here.</p>
                        ) : (
                          <p className="text-green-600 font-medium">Weight and balance calculations complete!</p>
                        )}
                      </div>
                    </div>
                  )}
                  {activeTab === 'Fuel' && (
                    <MinimumLegalFuel 
                      unitLabel={aircraftConfigs[activeAircraftTab].unitLabels.weight} 
                      aircraftType={activeAircraftTab} 
                    />
                  )}
                </div>
              </div>
            </main>
            <footer className="bg-white border-t mt-16">
              <div className="max-w-6xl mx-auto px-6 py-8">
                <div className="flex justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 bg-gray-800 rounded flex items-center">
                      <div className="flex grid grid-cols-2 gap-0.5">
                        <div className="w-1 h-1 bg-white rounded-sm"></div>
                        <div className="w-1 h-1 bg-white rounded-sm"></div>
                        <div className="w-1 h-1 bg-white rounded-sm"></div>
                        <div className="w-1 h-1 bg-white rounded-sm"></div>
                      </div>
                    </div>
                  </div>
                  <div className="flex space-x-16">
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3">Quick links</h4>
                      <ul className="space-y-2">
                        <li><a href="#" className="text-gray-600 hover:text-blue-600">Blog</a></li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3">Resources</h4>
                      <ul className="space-y-2">
                        <li><a href="#" className="text-gray-600 hover:text-blue-600">Documentation</a></li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </footer>
          </div>
        </div>
      );
    };
    
    
    export default Homepage;