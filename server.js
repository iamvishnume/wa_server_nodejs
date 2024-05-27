var express = require('express');
var qr = require('qr-image');
const qrcode = require('qrcode-terminal');
const cls_wa_client = require('./waClient')
const bodyParser = require('body-parser');
const axios = require('axios');


const host = "0.0.0.0";
const port = 3000;
const wa_manage_url = "http://localhost:5003"

var app = express();
app.use(bodyParser.json());

var wa_clients = {};

app.get('/', function (req, res) {
    res.send("Service running");
});

function create_response(b_status = true, s_status_message = "Success", a_response_data = null){
    return {
        status: b_status,
        status_message: s_status_message,
        data: a_response_data
    }
}

async function axios_get(path){
    url = `${wa_manage_url}${path}`;
    try {
        // The following line will wait until the axios request is completed
        const response = await axios.get(url);
        // console.log('Data:', response.data);
        return {status: true, response: response.data};
    } catch (error) {
        console.error('Error:', error);
        return {status: false, error: error};
    }
}

function get_client(wa_id, auto_create = false){
    var wa_client = wa_clients[wa_id];
    if (wa_client != null && wa_client != undefined && wa_client.status != wa_client.STATUS_DISCONNECTED){
        return {client: wa_client, type: "E"};
    }

    if(!auto_create){
        return {client: null, type: "-"};
    }

    wa_client = new cls_wa_client(id=wa_id);
    wa_clients[wa_id] = wa_client;
    return {client: wa_client, type: "N"};
}

app.get('/initialize/:id', function (req, res) {
    wa_id = req.params.id;
    try{
        var wa_client_request = get_client(id=wa_id, true);
        var wa_client = wa_client_request.client;

        res.send(create_response(true, "Success", {status: wa_client.status}))
    }
    catch(err){
        res.send(create_response(false, err.message))
    }

    // var wa_client = wa_clients[wa_id];
    // if (wa_client != null && wa_client != undefined && wa_client.status != wa_client.STATUS_DISCONNECTED){
    //     res.send({ status: wa_client.status});
    //     return;
    // }

    // try{
    //     wa_cls = start_client(id=wa_id);
    //     res.send(create_response(true, "Success", {status: wa_cls.status}))
    // }
    // catch(err){
    //     res.send(create_response(false, err.message))
    // }
});

app.get('/status/:id', function (req, res) {
    wa_id = req.params.id;
    var wa_client = wa_clients[wa_id];
    if (wa_client == null || wa_client == undefined){
        res.send({ status: "APP_NOT_FOUND", message: "Application not found"});
        return;
    }

    client_info = wa_client.client_info();
    if (client_info == undefined){
        client_info = null;
    }
    if(wa_client.status == wa_client.STATUS_QR){
        // console.log(wa_client.QR);
        // qrcode.generate(wa_client.QR, { small: true });
        var qr_svg = qr.imageSync(wa_client.QR, { type: 'png' });
        
        res.send({ status: wa_client.STATUS_QR, 
            info: client_info,
            qr_code: qr_svg.toString('base64')});
        return;
    }

    if(wa_client.status == wa_client.STATUS_DISCONNECTED){
        res.send({status: wa_client.status, reason: wa_client.DISCONNECT_REASON,
            info: client_info
        });
        return;
    }
    
    res.send({"status": wa_client.status, info: client_info});
});

app.post('/send-message/:id', async function (req, res) {
    wa_id = req.params.id;
    console.log(`sending-message with id ${wa_id}`);
    
    wa_client = get_client(wa_id, false).client;
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
        res.send({ status: "INVALID_NUMBER", message: "Invalid mobile number"});
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
    await wa_client.destroy();
    delete wa_clients[wa_id];
    res.send({ status: wa_client.status});
});

app.get('/restart/:id', async function (req, res) {
    wa_id = req.params.id;
    var wa_client = wa_clients[wa_id];
    if (wa_client == null || wa_client == undefined){
        res.send({ status: "APP_NOT_FOUND", message: "Application not found"});
        return;
    }
    if(wa_client.status == wa_client.STATUS_CONNECTED){
        await wa_client.destroy()
    }

    delete wa_clients[wa_id];
    var wa_client_request = get_client(id=wa_id);
    var wa_client = wa_client_request.client;

    res.send({status: wa_client.status});
});

async function startup_run_wa_clients(){
    console.log("starting wa clients");
    client_list = await axios_get("/wa-connect/backend/wa-client/list");
    if(!client_list.status){
        console.log("Failed to call wa manager api");
        console.log(client_list.error);
        return;
    }
    client_list = client_list.response;
    if(!client_list.status){
        console.log("Failed to call wa manager api");
        console.log(client_list.status_message);
        return;
    }

    client_list = client_list.data;
    console.log(client_list);
    client_list.forEach(client => {
        console.log(client);
        get_client(client.client_id, true);
    });
}

app.listen(port, host, function (){
    console.log(`application started with host:${host} port:${port}`);
    startup_run_wa_clients();
});
