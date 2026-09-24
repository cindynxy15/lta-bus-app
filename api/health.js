/**
 * @file api/health.js
 * Health check endpoint reporting keyConfigured and upstream LTA response status.
 * Never prints the key or any part of it.
 */

export default async function handler(req, res) {
  const apiKey = process.env.LTA_ACCOUNT_KEY;
  const keyConfigured = Boolean(apiKey && apiKey.trim() !== '');

  if (!keyConfigured) {
    return res.status(200).json({
      keyConfigured: false,
      upstreamAnswered: false,
      upstreamStatus: null
    });
  }

  try {
    const response = await fetch('https://datamall2.mytransport.sg/ltaodataservice/v3/BusArrival?BusStopCode=04121', {
      method: 'GET',
      headers: {
        AccountKey: apiKey.trim()
      }
    });

    return res.status(200).json({
      keyConfigured: true,
      upstreamAnswered: true,
      upstreamStatus: response.status
    });
  } catch (err) {
    return res.status(200).json({
      keyConfigured: true,
      upstreamAnswered: false,
      upstreamStatus: null
    });
  }
}
