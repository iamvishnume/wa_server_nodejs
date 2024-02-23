var express = require('express');
const { Client, RemoteAuth, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

var app = express();
var wa_clients = [];

class clss_wa_client {
    constructor(){
        this.DISCONNECTED = "DISCONNECTED";
        this.CONNECTED = "CONNECTED";
        this.QR = "QR";
        this.PENDING = "PENDING"
        
        this.id = wa_clients.length;
        this.status = this.PENDING;

        console.log(`new seq ${this.id}`);

        this.client = new Client({
            authStrategy: new LocalAuth({ clientId: `wa_${this.id}` })
        });

        this.client.on('qr', (qr) => {
            // Generate and scan this code with your phone
            this.status = this.QR;
            console.log('QR RECEIVED', qr);
            qrcode.generate(qr, { small: true });
        });
        
        this.client.on('ready', () => {
            this.status = this.CONNECTED;
            console.log('Client is ready!');
        });

        this.client.on('disconnected', (reason) => {
            this.status = this.DISCONNECTED;
            console.log('disconnect');
            console.log(reason);
        });

        this.client.initialize();
        // console.log(this.client);
    }

    get clientInfo(){
        console.log(this.client);
    }
}

app.get('/', function (req, res) {
    res.send("Welocme to GeeksforGeeks!");
});

app.get('/', function (req, res) {
    res.send("Welocme to GeeksforGeeks!");
});

app.get('/init-new', function (req, res) {
    wa_cls = new clss_wa_client();
    wa_clients.push(wa_cls);

    res.send(`wa client ${wa_cls.id} initialized`);
});

app.get('/check-status', async function (req, res) {
    seq = wa_clients.length - 1;
    console.log(`checking status of ${seq}`);
    cl = wa_clients[seq];
    console.log(cl.client);
    console.log(`current status: ${cl.status}`)
    state = await cl.client.getState();
    cl.client.status = state;
    console.log(`orginal status: ${state}`);

    res.send(state || `N.A`);
});

app.get('/test-message', async function (req, res) {
    seq = wa_clients.length - 1;
    console.log(`checking status of ${seq}`);
    cl = wa_clients[seq];
    console.log(cl.client);
    msg = await cl.client.sendMessage("919567764045@c.us", 'test');
    console.log(msg);

    res.send(`done`);
});

app.listen(5009);
