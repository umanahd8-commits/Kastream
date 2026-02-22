# Kastream EC2 Deployment Guide (Express.js + HTTPS)

This guide documents the exact steps used to deploy the Express.js
server to AWS EC2, configure DNS, and enable HTTPS with SSL.

------------------------------------------------------------------------

## 1️⃣ Connect to EC2

From your local machine:

``` bash
ssh -i "favourdev.pem" ubuntu@ec2-44-201-235-33.compute-1.amazonaws.com
```

------------------------------------------------------------------------

## 2️⃣ Upload Project Files

If uploading from local machine:

``` bash
scp -i "favourdev.pem" -r Kastream.zip ubuntu@YOUR_EC2_IP:~
```

Then on the server:

``` bash
unzip Kastream.zip
ls
```

If files extract directly into the home directory, no need to `cd` into
a folder.

------------------------------------------------------------------------

## 3️⃣ Install Node.js (if not installed)

``` bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
node -v
npm -v
```

------------------------------------------------------------------------

## 4️⃣ Install Dependencies

Inside your project directory:

``` bash
npm install
```

------------------------------------------------------------------------

## 5️⃣ Open Required Ports

Allow HTTP and HTTPS:

``` bash
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow 3000
```

Also ensure EC2 Security Group allows: - Port 80 (HTTP) - Port 443
(HTTPS)

------------------------------------------------------------------------

## 6️⃣ DNS Configuration (protege.com.ng)

In your domain DNS settings:

### A Records

  Type   Name   Value
  ------ ------ --------------------
  A      @      YOUR_EC2_PUBLIC_IP
  A      www    YOUR_EC2_PUBLIC_IP

Wait for DNS propagation (can take a few minutes to a few hours).

------------------------------------------------------------------------

## 7️⃣ Install Certbot for SSL

``` bash
sudo apt update
sudo apt install certbot
```

Generate certificate:

``` bash
sudo certbot certonly --standalone -d protege.com.ng -d www.protege.com.ng
```

Certificates will be stored in:

    /etc/letsencrypt/live/protege.com.ng/

------------------------------------------------------------------------

## 8️⃣ Ensure Your Express SSL Paths Match

Your server checks:

``` js
if (fs.existsSync(SSL_KEY) && fs.existsSync(SSL_CERT)) {
  startHttps();
}
```

Set your SSL paths in your server config to:

``` js
const SSL_KEY = "/etc/letsencrypt/live/protege.com.ng/privkey.pem";
const SSL_CERT = "/etc/letsencrypt/live/protege.com.ng/fullchain.pem";
```

------------------------------------------------------------------------

## 9️⃣ Run the Server

``` bash
node server.js
```

Or use PM2 for production:

``` bash
sudo npm install -g pm2
pm2 start server.js
pm2 save
pm2 startup
```

------------------------------------------------------------------------

## 🔟 Auto Renew SSL

Test renewal:

``` bash
sudo certbot renew --dry-run
```

Certbot auto-renews via cron.

------------------------------------------------------------------------

# How It Works

Your Express server logic:

-   If running on Windows or FORCE_DEV=1 → starts dev server
    (localhost).
-   On Linux (EC2):
    -   Starts HTTP redirect server (port 80).
    -   Checks if SSL cert files exist.
    -   If present → starts HTTPS server (port 443).

This allows: - Local development automatically. - Production HTTPS
automatically when certificates exist.

------------------------------------------------------------------------

# Final Result

-   Domain → points to EC2 IP (A record)
-   HTTP → redirects to HTTPS
-   HTTPS → served directly by Express
-   SSL → handled via Let's Encrypt
-   Server → managed with PM2

------------------------------------------------------------------------

Deployment Complete ✅
