var appID = 1425366424, // 必填，应用id，请从 即构管理控制台-https://console.zego.im/acount/register 或邮件中获取
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
    zg.stopPublishingStream(streamID);
    if(localStream){
        zg.destroyStream(localStream);
    }
    zg.logoutRoom(roomID);
    const localVideo = document.getElementById(domId);
    const cdnPlayVideo = document.getElementById('cdnPlayVideo')
    // stream 为MediaStream对象，开发者可通过赋值给video或audio的srcObject属性进行渲染
    localVideo.srcObject = null;
    cdnPlayVideo.src = '';
    $(cdnPlayVideo).hide()
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


let zg, roomID ,streamID = 'screamID_' + new Date().getTime(), localStream;

zg = new ZegoExpressEngine(_config.appid,_config.server);
enumDevices(zg)

//创建流
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

    // 开始推流
    zg.startPublishingStream(streamID, localStream)
}

//进入房间推流
$('#createRoom').on('click',function(){
    roomID = $('#roomId').val();
    if(roomID==''){
        alert('请填写roomID')
    }else{
        createStream()
    }
})
//增加转推cdn
$('#cdnAddPush').on('click',async () => {
    const result = await zg.addPublishCdnUrl(
        streamID,
        'rtmp://publish-qcloud-test.zego.im/live/'+ streamID
    )
    if (result.errorCode == 0) {
        console.warn('add push target success');
        ($('#cdnDelPush')[0]).disabled = false;
        ($('#cdnPlay')[0]).disabled = false;
    } else {
        console.warn('add push target fail ' + result.errorCode);
    }
})

//删除转推cdn
$('#cdnDelPush').on('click',async() => {
    const result = await zg.removePublishCdnUrl(
        streamID,
        'https://play-qcloud-test.zego.im/live/'+ streamID
    )
    if (result.errorCode == 0) {
        console.warn('add push target success');
        ($('#cdnDelPush')[0]).disabled = true;
        ($('#cdnPlay')[0]).disabled = true;
    } else {
        console.warn('add push target fail ' + result.errorCode);
    }
})
//播放cdn
let cdnFlvPlayer = null;
$('#cdnPlay').on('click',async () => {
    const cdnVideoElement = document.getElementById('cdnPlayVideo');

    let cdnStreamID = $('#streamID').val() || streamID;
    if(flvjs.isSupported()){
        if(cdnFlvPlayer !== null){
            cdnFlvPlayer.pused()
            cdnFlvPlayer.unload()
            cdnFlvPlayer.detachMediaElement();
            cdnFlvPlayer.destroy();
            cdnFlvPlayer = null;
        }
        cdnFlvPlayer = flvjs.createPlayer(
            {
                type:'flv',
                isLive:true,
                url:`https://play-qcloud-test.zego.im/live/${cdnStreamID}.flv`,
                hasAudio:true,
                hasVideo:true
            }
        )
    
        cdnFlvPlayer.on(flvjs.Events.LOADING_COMPLETE,function(){
            cdnFlvPlayer.play()
        })
        cdnFlvPlayer.attachMediaElement(cdnVideoElement);
        cdnFlvPlayer.load();
        cdnVideoElement.muted = false;
        cdnVideoElement.controls = true;
    }
    
})
//退出房间
$('#leaveRoom').on('click',function(){
    roomID = $('#roomId').val();
    logoutRoom(zg,roomID,streamID,'previewVideo');
})
