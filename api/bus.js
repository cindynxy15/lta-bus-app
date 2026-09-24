/**
 * @file api/bus.js
 * Serverless function for LTA DataMall bus arrivals.
 * Works both on Vercel and Express server.ts.
 */

export default async function handler(req, res) {
  const apiKey = process.env.LTA_ACCOUNT_KEY;

  // BEFORE the fetch, if that variable is missing or empty, return 503
  if (!apiKey || apiKey.trim() === '') {
    return res.status(503).json({
      error: 'LTA_ACCOUNT_KEY is not set. Add it in Vercel and redeploy.'
    });
  }

  const busStopCode = (req.query?.BusStopCode || req.query?.busStopCode || '04121').toString().trim() || '04121';

  try {
    const url = `https://datamall2.mytransport.sg/ltaodataservice/v3/BusArrival?BusStopCode=${encodeURIComponent(busStopCode)}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        AccountKey: apiKey.trim()
      }
    });

    // AFTER the fetch, check response.ok before reading the body.
    // LTA returns an empty body on 401, so calling response.json() on a failed reply throws.
    if (!response.ok) {
      return res.status(response.status).json({
        upstreamStatus: response.status,
        error: `Upstream LTA error (${response.status}): ${response.statusText || 'Request failed'}`
      });
    }

    // Set Cache-Control header as LTA refreshes every 20 seconds
    res.setHeader('Cache-Control', 's-maxage=20, stale-while-revalidate=40');

    const data = await response.json();
    const now = Date.now();

    // Treat an empty Services array as "no buses running", not as an error
    const rawServices = Array.isArray(data?.Services) ? data.Services : [];

    const calculateMinutes = (estimatedArrival) => {
      // Treat an empty EstimatedArrival as no bus and omit it from the list
      if (!estimatedArrival || typeof estimatedArrival !== 'string' || estimatedArrival.trim() === '') {
        return null;
      }
      const arrivalTime = new Date(estimatedArrival).getTime();
      if (isNaN(arrivalTime)) {
        return null;
      }
      const diffMs = arrivalTime - now;
      // Round down to whole minutes as LTA's guide asks
      const minutes = Math.floor(diffMs / 60000);
      const clamped = Math.max(0, minutes);
      return isNaN(clamped) ? null : clamped;
    };

    const simplifiedList = rawServices.map((svc) => {
      const minutes = [];
      const m1 = calculateMinutes(svc?.NextBus?.EstimatedArrival);
      if (m1 !== null && !isNaN(m1)) {
        minutes.push(m1);
      }
      const m2 = calculateMinutes(svc?.NextBus2?.EstimatedArrival);
      if (m2 !== null && !isNaN(m2)) {
        minutes.push(m2);
      }

      return {
        ServiceNo: svc?.ServiceNo || '',
        nextBuses: minutes
      };
    });

    return res.status(200).json({
      BusStopCode: busStopCode,
      Services: simplifiedList
    });
  } catch (err) {
    return res.status(502).json({
      error: 'Failed to communicate with LTA DataMall service.'
    });
  }
}
