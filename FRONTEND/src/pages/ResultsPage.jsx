import React from 'react';
import { useLocation, Link } from 'react-router-dom';

const ResultsPage = () => {
  const location = useLocation();
  const { calculationHistory } = location.state || { calculationHistory: [] };

  if (calculationHistory.length === 0) {
    return (
      <div className="p-6 md:p-10 bg-gray-50 min-h-screen font-sans max-w-2xl mx-auto text-center">
        <h2 className="text-3xl font-bold mb-8 text-gray-700">Weight and Balance Results</h2>
        <p className="text-gray-600 mb-4">No calculations found. Please go back and perform a calculation.</p>
        <Link
          to="/"
          className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
        >
          Go to Calculator
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 bg-gray-50 min-h-screen font-sans max-w-5xl mx-auto">
      <h2 className="text-3xl font-bold mb-8 text-center text-gray-700">Weight and Balance Results</h2>

      <div className="space-y-8">
        {calculationHistory.map((calc, index) => (
          <div key={index} className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <h3 className="text-xl font-semibold mb-4 text-gray-800">
              Calculation {index + 1}
              <span className="text-sm font-normal text-gray-500 ml-3">
                (Timestamp: {new Date(calc.timestamp).toLocaleString()})
              </span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-700">
              <div>
                <p>
                  <span className="font-medium">Basic Empty Weight:</span>{' '}
                  {parseFloat(calc.basicEmpty.weight).toFixed(2)} KGS, Arm: {parseFloat(calc.basicEmpty.arm).toFixed(2)} MTS, Moment: {calc.basicEmpty.moment.toFixed(2)} MTS.KG
                </p>
                <p>
                  <span className="font-medium">Pilot & Pax Weight:</span>{' '}
                  {parseFloat(calc.pilotPax.weight).toFixed(2)} KGS, Arm: {parseFloat(calc.pilotPax.arm).toFixed(2)} MTS, Moment: {calc.pilotPax.moment.toFixed(2)} MTS.KG
                </p>
                <p>
                  <span className="font-medium">Fuel Weight:</span>{' '}
                  {parseFloat(calc.fuel.weight).toFixed(2)} KGS, Arm: {parseFloat(calc.fuel.arm).toFixed(2)} MTS, Moment: {calc.fuel.moment.toFixed(2)} MTS.KG
                </p>
                <p>
                  <span className="font-medium">Baggage Weight:</span>{' '}
                  {parseFloat(calc.baggage.weight).toFixed(2)} KGS, Arm: {parseFloat(calc.baggage.arm).toFixed(2)} MTS, Moment: {calc.baggage.moment.toFixed(2)} MTS.KG
                </p>
              </div>

              <div>
                <p className="font-bold">Takeoff Weight: {calc.totalWeight.toFixed(2)} KGS</p>
                <p className="font-bold">Takeoff Moment: {calc.totalMoment.toFixed(2)} MTS.KG</p>
                <p className="font-bold">Takeoff C.O.G: {parseFloat(calc.takeoffCOG).toFixed(2)}</p>
                <p>
                  <span className="font-medium">Fuel Burn:</span> {parseFloat(calc.fuelBurn.weight).toFixed(2)} KGS, Moment: {calc.fuelBurn.moment.toFixed(2)} MTS.KG
                </p>
                <p className="font-bold">Landing Weight: {calc.landingWeight.toFixed(2)} KGS</p>
                <p className="font-bold">Landing Moment: {calc.landingMoment.toFixed(2)} MTS.KG</p>
                <p className="font-bold">Landing C.O.G: {parseFloat(calc.landingCOG).toFixed(2)}</p>

                <p className={`font-bold ${calc.isTakeoffOutOfEnvelope ? 'text-red-600' : 'text-green-600'}`}>
                  Takeoff Status: {calc.isTakeoffOutOfEnvelope ? 'OUT OF ENVELOPE' : 'Within Envelope'}
                </p>
                <p className={`font-bold ${calc.isLandingOutOfEnvelope ? 'text-red-600' : 'text-green-600'}`}>
                  Landing Status: {calc.isLandingOutOfEnvelope ? 'OUT OF ENVELOPE' : 'Within Envelope'}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 text-center">
        <Link
          to="/"
          className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
        >
          Go Back to Calculator
        </Link>
      </div>
    </div>
  );
};

export default ResultsPage;
