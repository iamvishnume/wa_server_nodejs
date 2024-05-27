const { Client, RemoteAuth, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const axios = require('axios');

// const wa_manage_url = "http://localhost:5003";
const wa_manage_url = "https://1c2.in";

class cls_wa_client {
    constructor(id) {
        this.STATUS_DISCONNECTED = "DISCONNECTED";
        this.STATUS_CONNECTED = "CONNECTED";
        this.STATUS_QR = "QR";
        this.STATUS_PENDING = "STARTING";
        this.STATUS_DELETED = "DELETED";

        this.DISCONNECT_REASON = null;

        this.id = id;
        this.status = this.STATUS_PENDING;

        console.log(`starting wa ${this.id}`);

        this.client = new Client({
            authStrategy: new LocalAuth({ clientId: `wa_${this.id}` }),
            puppeteer: {
                args: ['--no-sandbox', '--disable-setuid-sandbox'],
            },
            webVersionCache: {
                type: "remote",
                remotePath:
                    "https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html",
            }
        });

        this.client.on('qr', (qr) => {
            // Generate and scan this code with your phone
            this.status = this.STATUS_QR;
            console.log('QR RECEIVED');
            this.QR = qr;
            this.update_status();
        });

        this.client.on('ready', () => {
            this.status = this.STATUS_CONNECTED;
            console.log('Client is ready!');
            this.update_status();
        });

        this.client.on('disconnected', (reason) => {
            this.status = this.STATUS_DISCONNECTED;
            console.log('disconnect');
            this.DISCONNECT_REASON = reason;
            this.update_status();
        });

        this.client.on('authenticated', (session) => {
            console.log('Authenticated');
        });

        this.client.on('auth_failure', (msg) => {
            console.error('Authentication failure:', msg);
        });

        this.update_status();
        this.client.initialize();
        // console.log(this.client);
    }

    client_info() {
        var _client_info = this.client.info;
        if (_client_info == undefined) {
            return null;
        }
        _client_info = {
            name: _client_info.pushname,
            user: _client_info.wid.user,
            server: _client_info.wid.server,
            serialized: _client_info.wid._serialized
        }

        return _client_info;
    }

    async send_text(recipient, message) {
        return await this.client.sendMessage(recipient, message.trim());
    }

    async send_document(recipient, url, caption = null) {
        var media = await MessageMedia.fromUrl(url);
        return await this.client.sendMessage(recipient, media, { caption: caption });
    }

    async logout() {
        await this.client.logout();
        this.status = this.STATUS_DELETED;
        this.update_status();

        return true;
    }

    async destroy() {
        await this.client.destroy();
    }

    async update_status(){
        const payload = {
            client_id: this.id,
            status: this.status
        };

        this.axios_post("/wa-connect/backend/wa-client/update-status", payload)
    }

    async axios_post(path, payload){
        url = `${wa_manage_url}${path}`;
        try {
            // The following line will wait until the axios request is completed
            const response = await axios.post(url, payload);
            // console.log('Data:', response.data);
            return {status: true, response: response.data};
        } catch (error) {
            console.error('Error:', error);
            return {status: false, error: error};
        }
    }
}

module.exports = cls_wa_client;
