const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  try {
    const { paymentMethodId, email, name } = JSON.parse(event.body);

    // Create or find customer
    const customers = await stripe.customers.list({ email, limit: 1 });
    let customer;
    if (customers.data.length > 0) {
      customer = customers.data[0];
    } else {
      customer = await stripe.customers.create({ email, name });
    }

    // Create PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: 14700, // $147.00 in cents
      currency: 'usd',
      customer: customer.id,
      payment_method: paymentMethodId,
      confirm: true,
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'never'
      },
      metadata: {
        product: 'Parenting Unlocked',
        customer_name: name,
        customer_email: email
      }
    });

    if (paymentIntent.status === 'requires_action') {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          requiresAction: true,
          clientSecret: paymentIntent.client_secret
        })
      };
    }

    if (paymentIntent.status === 'succeeded') {
      // Notify GHL workflow — creates contact + sends confirmation email
      const firstName = name.split(' ')[0];
      const lastName = name.split(' ').slice(1).join(' ') || '';
      try {
        await fetch('https://services.leadconnectorhq.com/hooks/Hk9YnLAZCME5Y2kjNRp4/webhook-trigger/b327d5c4-1e71-468f-ac8d-cad93d465da5', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            firstName,
            lastName,
            email,
            name,
            product: 'Parenting Unlocked',
            amount: '147'
          })
        });
      } catch (webhookErr) {
        console.error('GHL webhook error:', webhookErr);
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true })
      };
    }

    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Payment failed. Please try again.' })
    };

  } catch (err) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: err.message })
    };
  }
};
