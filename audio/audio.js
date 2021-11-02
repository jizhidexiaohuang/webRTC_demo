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
    zg.stopPublishingStream(streamID);
    zg.destroyStream(localStream);
    zg.logoutRoom(roomID);
    const localVideo = document.getElementById(domId);
    // stream 为MediaStream对象，开发者可通过赋值给video或audio的srcObject属性进行渲染
    localVideo.srcObject = null;
    loginState = false;
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

let zg, zgNew, roomID, localStream,
    streamID = 'streamID-'+new Date().getTime();
    
zg = new ZegoExpressEngine(_config.appid,_config.server);
enumDevices(zg)

//创建流
async function createStream( publish = true ){
    if(!loginState){
        await login(zg,roomID);
    }

    // 调用 createStream 接口后，需要等待 ZEGO 服务器返回流媒体对象才能执行后续操作
    localStream = await zg.createStream({
        camera:{
            video:false
        }
    });
    console.log('=======')
    console.log('123123')
    console.log(localStream)
    console.log(localStream.getAudioTracks())
    console.log(localStream.getAudioTracks()[0].label)
    // 获取页面的 video 标签
    const localVideo = document.getElementById('previewVideo');
    // stream 为MediaStream对象，开发者可通过赋值给video或audio的srcObject属性进行渲染
    localVideo.srcObject = localStream;

    // localStream 为创建流获取的 MediaStream 对象
    if(publish){
        zg.startPublishingStream(streamID, localStream)
    }
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
//进入房间不推流
$('#openRoom').on('click',function(){
    roomID = $('#roomId').val();
    createStream(false)
})

//退出房间
$('#leaveRoom').on('click',function(){
    roomID = $('#roomId').val();
    logoutRoom(zg,roomID,streamID,'previewVideo');
})
