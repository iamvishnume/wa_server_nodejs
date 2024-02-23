const { Client, RemoteAuth, LocalAuth, MessageMedia } = require('whatsapp-web.js');

class cls_wa_client {
    constructor(id){
        this.STATUS_DISCONNECTED = "DISCONNECTED";
        this.STATUS_CONNECTED = "CONNECTED";
        this.STATUS_QR = "QR";
        this.STATUS_PENDING = "STARTING";
        this.STATUS_LOGGEDOUT = "LOGGEDOUT";

        this.DISCONNECT_REASON = null;
        
        this.id = id;
        this.status = this.STATUS_PENDING;

        console.log(`starting wa ${this.id}`);

        this.client = new Client({
            authStrategy: new LocalAuth({ clientId: `wa_${this.id}` }),
            puppeteer: {
                args: ['--no-sandbox', '--disable-setuid-sandbox'],
            }
        });

        this.client.on('qr', (qr) => {
            // Generate and scan this code with your phone
            this.status = this.STATUS_QR;
            console.log('QR RECEIVED');
            this.QR = qr;
        });
        
        this.client.on('ready', () => {
            this.status = this.STATUS_CONNECTED;
            console.log('Client is ready!');
        });

        this.client.on('disconnected', (reason) => {
            this.status = this.STATUS_DISCONNECTED;
            console.log('disconnect');
            this.DISCONNECT_REASON = reason;
        });

        this.client.initialize();
        // console.log(this.client);
    }

    get clientInfo(){
        console.log(this.client);
    }

    async send_text(recipient, message) {
        return await this.client.sendMessage(recipient, message.trim());
    }

    async send_document(recipient, url, caption = null){
        var media = await MessageMedia.fromUrl(url);
        return await this.client.sendMessage(recipient, media, { caption: caption });
    }

    async logout(){
        await this.client.logout();
        this.status = this.STATUS_LOGGEDOUT;
        return;
    }
}

module.exports = cls_wa_client;
