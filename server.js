var express = require('express');
var qr = require('qr-image');
const qrcode = require('qrcode-terminal');
const cls_wa_client = require('./waClient')
const bodyParser = require('body-parser');

const host = "0.0.0.0";
const port = 3000;

var app = express();
app.use(bodyParser.json());

var wa_clients = {};

app.get('/', function (req, res) {
    res.send("Service running");
});

app.get('/initialize/:id', function (req, res) {
    wa_id = req.params.id;
    var wa_client = wa_clients[wa_id];
    if (wa_client != null && wa_client != undefined){
        res.send({ status: wa_client.status});
        return;
    }

    wa_cls = new cls_wa_client(id=wa_id);
    wa_clients[wa_id] = wa_cls;

    res.send({status: wa_cls.status});
});

app.get('/status/:id', function (req, res) {
    wa_id = req.params.id;
    var wa_client = wa_clients[wa_id];
    if (wa_client == null || wa_client == undefined){
        res.send({ status: "APP_NOT_FOUND", message: "Application not found"});
        return;
    }

    if(wa_client.status == wa_client.STATUS_QR){
        console.log(wa_client.QR);
        qrcode.generate(wa_client.QR, { small: true });
        var qr_svg = qr.imageSync(wa_client.QR, { type: 'png' });
        
        res.send({ "status": wa_client.STATUS_QR, "qr_code": qr_svg.toString('base64')});
        return;
    }

    if(wa_client.status == wa_client.STATUS_QR){
        res.send({"status": wa_client.status, "reason": wa_client.DISCONNECT_REASON});
        return;
    }

    res.send({"status": wa_client.status});
});

app.post('/send-message/:id', async function (req, res) {
    wa_id = req.params.id;
    console.log(`sending-message with id ${wa_id}`);
    var wa_client = wa_clients[wa_id];
    if (wa_client == null || wa_client == undefined){
        res.send({ status: "APP_NOT_FOUND", message: "Application not found"});
        return;
    }
    
    if(wa_client.status != wa_client.STATUS_CONNECTED){
        res.send({ status: wa_client.status, message: "Application not connected"});
        return;
    }

    request_payload = req.body;

    mobile = request_payload.mobile.trim();
    if(mobile.length < 10){
        res.send({ status: "INVALID_REQ", message: "Invalid mobile number"});
        return;
    }
    if(mobile.length > 13){
        //don't allow if length more than 13
        res.send({ status: "INVALID_REQ", message: "Invalid mobile number"});
        return;
    }

    message_type = request_payload.type;
    if(!["text", "document"].includes(message_type)){
        res.send({ status: "INVALID_REQ", message: "Invalid message type"});
        return;
    }

    if(mobile.length == 10){
        //add 91 if length is 10
        mobile = `91${mobile}`;
    }

    var mobile_user = null;
    try {
        mobile_user = await wa_client.client.getNumberId(mobile);
    } catch (e) {
        console.error('Caught an error while getting wa id:', e.message);
    }
    
    if(mobile_user == null){
        res.send({ status: "INVALID_MOB", message: "Invalid mobile number"});
        return;
    }

    msg = null;
    // text message
    if(message_type == "text"){
        message = request_payload.message;
        if(message == null || message == undefined || message.trim() == ""){
            res.send({ status: "INVALID_REQ", message: "message cannot be blank"});
            return;    
        }

        msg = await wa_client.send_text(mobile_user._serialized, message.trim());
    }

    if(message_type == "document"){
        url = request_payload.url;
        caption = request_payload.caption;
        if(url == null || url == undefined || url.trim() == ""){
            res.send({ status: "INVALID_REQ", message: "message cannot be blank"});
            return;    
        }

        msg = await wa_client.send_document(mobile_user._serialized, url, caption);
    }
    
    if(msg == null || msg == undefined){
        res.send({ status: "ERROR", message: "message sending failed"});
        return;
    }
    
    res.send({ status: "SENT", message_id: msg.id.id, serialized_id: msg.id._serialized});
});

app.get('/logout/:id', async function (req, res) {
    wa_id = req.params.id;
    var wa_client = wa_clients[wa_id];
    if (wa_client == null || wa_client == undefined){
        res.send({ status: "APP_NOT_FOUND", message: "Application not found"});
        return;
    }

    if(wa_client.status != wa_client.STATUS_CONNECTED){
        res.send({ status: wa_client.status, message: "Application not connected"});
        return;
    }

    await wa_client.logout();
    res.send({ status: wa_client.status});
});

app.listen(port, host, function (){
    console.log(`application started with host:${host} port:${port}`);
});
