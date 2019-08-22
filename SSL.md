# How to enable SSL

## Get SSL certificate

If you don't have your own SSL certificate, you can get one from [Let's Encrypt](https://letsencrypt.org) for free. The only problem is that you have to renew it every 3 months.

Run the following code on your manager machine:

```bash
sudo su
apt-get -y install certbot

# disable http proxy
docker service scale http-api-reverse-proxy-stack=0

# run and respond to all the questions
certbot certonly --standalone

# enable http proxy
docker service scale http-api-reverse-proxy-stack=1

# archive your certificates
tar cvfz certificates.tgz /etc/letsencrypt/ && chown ubuntu certificates.tgz
```

Run the following code on the machine from which you run Nebula:

```bash
# copy certificates
scp ubuntu@$NODE_IP:~/certificates.tgz .

# extract the file
tar zxvf certificates.tgz
```

## Modify `node.json`

Add following lines to `node.json`:

```json
{
    "sslCertificatePath": "$PATH_TO_DIR/etc/letsencrypt/live/node1.demonet.orbs.com/cert.pem",
    "sslPrivateKeyPath": "$PATH_TO_DIR/etc/letsencrypt/live/node1.demonet.orbs.com/privkey.pem"
}
```

## Redeploy the node

Run `nebula destroy` and `nebula create` just like you did the first time you deployed the node.
