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


tips

2️⃣ Clean up before adding new clusters

Stop all old PM2 processes:

pm2 delete all

Check PM2 list:

pm2 list

Should be empty. No “kastream” or “start” left.

3️⃣ Start proper PM2 cluster

Now, spawn your app in cluster mode with 2 instances (or max to match CPUs):

cd ~/Kastream/server
pm2 start start.js --name kastream -i max

--name kastream → gives all cluster processes a single friendly name.

-i max → spawns 2 processes (1 per CPU) on your 2 vCPU EC2.

PM2 will automatically load-balance incoming requests between these cluster instances.

✅ PM2 cluster mode uses Node’s cluster module, which automatically shares the same port among workers. You don’t need to do anything manually — requests are distributed safely between processes.

4️⃣ Verify cluster setup
pm2 list
pm2 logs kastream

You should see 2 processes under kastream, both online, sharing the same port (3000). Logs will show multiple MongoDB Connected messages — that’s normal because each worker establishes its own DB connection.

5️⃣ Optional: scale later

Want 4 processes (maybe after upgrading EC2 to 4 vCPU)?

pm2 scale kastream 4

PM2 will spawn or kill extra cluster processes automatically.

6️⃣ Key tips

Do not run multiple pm2 start commands without --name — it creates duplicate entries.

Cluster mode automatically balances traffic — you don’t need a load balancer inside Node. Nginx in front is fine and still handles SSL.

MongoDB connections: Each worker makes its own connection. With 2 workers, total DB connections ≈ 2 × your pool size. This is safe as long as your DB can handle it.

💡 TL;DR

Delete all old PM2 processes.

Start your app with cluster mode and a single name:

pm2 delete all
pm2 start start.js --name kastream -i max

PM2 will handle traffic distribution automatically.

Multiple MongoDB connections are normal.


cluster restarts

1️⃣ Restart the whole cluster
pm2 restart kastream

kastream is the name of your app (the one you set with --name kastream).

PM2 will restart all cluster workers one by one, so traffic is minimally affected.

2️⃣ Restart a specific worker (optional)

List all processes first:

pm2 list

Each worker has an id (0, 1, etc.). Restart a specific worker:

pm2 restart <id>

Example:

pm2 restart 0

Only worker 0 restarts; worker 1 keeps serving requests.

3️⃣ Soft reload for zero-downtime (recommended for clusters)
pm2 reload kastream

reload tells PM2 to reload workers one by one instead of killing them all at once.
Ensures no downtime for users — cluster keeps running while workers restart.

Summary
Command	Effect
pm2 restart kastream	Restart all workers (quick, may have tiny downtime)
pm2 reload kastream	Zero-downtime reload; preferred in production
pm2 restart <id>	Restart one specific worker only