var appID = 1739272706, // 必填，应用id，请从 即构管理控制台-https://console.zego.im/acount/register 或邮件中获取
    appSigin = '5033b4dd1eff10a98f74ec79da8545fdf8dc42d5164d28a2220e7b395d7757d0', // appSigin为即构给客户分配的秘钥，请勿泄漏；（测试环境下是生成token的密码，必填，正式环境需要放到服务端）
    _config = {
        appid: appID * 1,
        server: 'wss://webliveroom-test.zego.im/ws',//必填，接入服务器地址，请从 即构管理控制台-https://console.zego.im/acount/register 或邮件中获取
    };
var tokenUrl = 'https://wsliveroom-alpha.zego.im:8282/token';
var userID = new Date().getTime() + '';
var userName = 'u' + new Date().getTime();
var loginState = false;  //登录状态

// 获取token 登录房间
async function login(zg,roomID){
    const token = await $.get(tokenUrl,{
        app_id:_config.appid,
        id_name:userID
    })
    const result = await zg.loginRoom(roomID, token, {userID, userName}, {userUpdate: true});
    loginState = result;
    return result;
}
//退出
function logoutRoom(zg,roomID,streamID,domId){
    if(localStream){
        zg.stopPublishingStream(streamID);
        zg.destroyStream(localStream);
    }
    if(screenStream){
        zg.stopPublishingStream(screenStreamId);
        zg.destroyStream(screenStream);
        console.log('销毁屏幕流')
    }
    zg.logoutRoom(roomID);
    const localVideo = document.getElementById(domId);
    // stream 为MediaStream对象，开发者可通过赋值给video或audio的srcObject属性进行渲染
    localVideo.srcObject = null;
    loginState = false;
    localStream = null;
}
//获取设备信息
async function enumDevices(zg) {
    const audioInputList = [],
          videoInputList = [];
    const deviceInfo = await zg.enumDevices();

    deviceInfo &&
        deviceInfo.microphones.map((item, index) => {
            if (!item.deviceName) {
                item.deviceName = 'microphone' + index;
            }
            audioInputList.push(' <option value="' + item.deviceID + '">' + item.deviceName + '</option>');
            console.log('microphone: ' + item.deviceName);
            return item;
        });

    deviceInfo &&
        deviceInfo.cameras.map((item, index) => {
            if (!item.deviceName) {
                item.deviceName = 'camera' + index;
            }
            videoInputList.push(' <option value="' + item.deviceID + '">' + item.deviceName + '</option>');
            console.log('camera: ' + item.deviceName);
            return item;
        });

    audioInputList.push('<option value="0">禁止</option>');
    videoInputList.push('<option value="0">禁止</option>');

    $('#audioList').html(audioInputList.join(''));
    $('#videoList').html(videoInputList.join(''));
}

let zg, roomID, streamList = [],
    streamID = 'localStreamID_' + new Date().getTime(), localStream, 
    thirdStreamID = 'thirdStreamID_' + new Date().getTime(), 
    screenStreamId = 'screenStreamId_' + new Date().getTime(), screenStream,
    taskID = 'taskID_' + new Date().getTime(), 
    mixStreamID = 'mixwebrtc_' + new Date().getTime();

zg = new ZegoExpressEngine(_config.appid,_config.server);
enumDevices(zg)

//创建本地流
async function createStream(){
    if(!loginState){
        await login(zg,roomID);
    }
    // 调用 createStream 接口后，需要等待 ZEGO 服务器返回流媒体对象才能执行后续操作
    localStream = await zg.createStream();
    // 获取页面的 video 标签
    const localVideo = document.getElementById('previewVideo');
    // stream 为MediaStream对象，开发者可通过赋值给video或audio的srcObject属性进行渲染
    localVideo.srcObject = localStream;
    //推流
    zg.startPublishingStream(streamID, localStream);
}
// 流推成功的回调
zg.on('publisherStateUpdate', resulte => {
    console.log(resulte)
    console.log('===========')
    
    if(resulte.state === 'PUBLISHING'){
        let len = streamList.length;
        streamList.push(
            {
                streamID: resulte.streamID,
                layout: {
                    top: 240 * len,
                    left: 0,
                    bottom: 240 * (len + 1),
                    right: 320,
                }
            }
        )
        console.log(streamList)
    }
});

//进入房间推流
$('#createRoom').on('click',function(){
    roomID = $('#roomId').val();
    if(roomID==''){
        alert('请填写roomID')
    }else{
        createStream()
    }
})
//推第三方流
$('#thirdStream').on('click',async() => {
    const thirdStream = await zg.createStream({
        custom: {
            source: $('#externerVideo')[0]
        }
    });
    zg.startPublishingStream(thirdStreamID, thirdStream);
})
//推一个共享屏幕流
$('#screenStream').on('click',async () => {
    screenStream = await zg.createStream({
        screen:{
            audio: true,
            videoQuality: 4,
            bitrate: 2000,
            frameRate: 10,
            width: 1000,
            height: 800
        }
    });
    
    zg.startPublishingStream(screenStreamId, screenStream);
    console.log(screenStream)
})
//开始混流
$('#mixStream').on('click',async() => {
    const res = await zg.startMixerTask({
        taskID,
        inputList: streamList,
        outputList: [
            mixStreamID
        ],
        outputConfig: {
            outputBitrate: 300,
            outputFPS: 15,
            outputWidth: 320,
            outputHeight: 720,
        },
    });
    if(res.errorCode == 0) {
        const result = JSON.parse(res.extendedData).mixerOutputList;
        const flvUrl = result[0].flvURL.replace('http', 'https');
        console.log(flvUrl)
        mixVideo = $('#mixVideo')[0];
        if (flvjs.isSupported()) {
            flvPlayer = flvjs.createPlayer({
                type: 'flv',
                url: flvUrl,
            });
            flvPlayer.attachMediaElement(mixVideo);
            flvPlayer.load();
        }
        mixVideo.muted = false;
        $(mixVideo).show();
        $('#stopMixStream').attr('disabled', false)
    }
})

//停止混流
$('#stopMixStream').on('click',async() => {
    try {
        await zg.stopMixerTask(taskID);
        alert('停止混流成功。。。');
        if (flvPlayer) {
            flvPlayer.destroy();
            flvPlayer = null;
        }
        console.log('stopMixStream success: ');
        $('#stopMixStream').attr('disabled', true);
        $('#mixVideo').css('display', 'none');
    } catch (err) {
        alert('停止混流失败。。。');
        console.log('stopMixStream err: ', err);
    }
})

//退出房间
$('#leaveRoom').on('click',function(){
    roomID = $('#roomId').val();
    logoutRoom(zg,roomID,streamID,'previewVideo');
})