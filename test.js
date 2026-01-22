async function getRates() {
  const res = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
  const data = await res.json();

  console.log('Base:', data.base);
  console.log('Date:', data.date);
  console.log('USD → NGN:', data.rates.NGN);
}

getRates();
