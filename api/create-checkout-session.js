const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

// CORS so your site can call this easily
function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*'); // lock to your domain later
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { amount, name, email, success_url, cancel_url } = req.body || {};
    const cents = Math.max(100, Math.round(Number(amount || 0) * 100)); // min $1

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: { name: 'Donation: BHS DECA × Family Promise' },
          unit_amount: cents
        },
        quantity: 1
      }],
      customer_email: email || undefined,
      success_url,
      cancel_url,
      metadata: { donor_name: name || 'Anonymous' }
    });

    res.status(200).json({ url: session.url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Stripe error' });
  }
};
