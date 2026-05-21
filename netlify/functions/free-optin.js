exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  try {
    const { firstName, email } = JSON.parse(event.body);

    if (!firstName || !email) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'firstName and email are required' })
      };
    }

    // Send to GHL workflow
    await fetch('https://services.leadconnectorhq.com/hooks/Hk9YnLAZCME5Y2kjNRp4/webhook-trigger/47c145bf-5f54-47b2-9f79-29245c31c846', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firstName,
        email,
        source: 'Exit Intent Popup',
        product: 'Sleep Foundation Free'
      })
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true })
    };

  } catch (err) {
    console.error('Free optin error:', err);
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: err.message })
    };
  }
};
