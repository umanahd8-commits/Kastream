const https = require('https');

function checkUrl(url) {
  return new Promise((resolve, reject) => {
    const req = https.request(
      url,
      {
        method: 'GET',
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Encoding': 'identity',
        },
      },
      res => {
        const status = res.statusCode || 0;
        const location = res.headers.location || '';
        res.resume();
        resolve({ status, location });
      }
    );

    req.on('error', reject);
    req.end();
  });
}

async function run() {
  try {
    console.log('Testing TikTok profile URL');
    const tiktokUrl = 'https://www.tiktok.com/@fiazzypaul?_r=1&_t=ZS-940JMlFGEU5';
    const tt = await checkUrl(tiktokUrl);
    console.log('TikTok status:', tt.status, 'location:', tt.location || '-');

    console.log('\nTesting Telegram username');
    const telegramUrl = 'https://t.me/fiazzy555';
    const tg = await checkUrl(telegramUrl);
    console.log('Telegram status:', tg.status, 'location:', tg.location || '-');

    console.log('\nTesting WhatsApp number');
    const waUrl = 'https://wa.me/2349133961422';
    const wa = await checkUrl(waUrl);
    console.log('WhatsApp status:', wa.status, 'location:', wa.location || '-');
  } catch (err) {
    console.error('Error while testing URLs:', err.message || err);
  }
}

run();
