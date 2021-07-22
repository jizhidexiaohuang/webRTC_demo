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
    if(localStream){
        zg.destroyStream(localStream);
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

let zg, zgNew, roomID ,audioStreamID = 'streamID_' + new Date().getTime(), localStream;

zg = new ZegoExpressEngine(_config.appid,_config.server);
enumDevices(zg)

//创建流
async function createStream(){
    if(!loginState){
        await login(zg,roomID);
    }
    //获取第三方流
    localStream = await zg.createStream({
        custom: {
            source: $('#station')[0]
        }
    })
    //推流
    zg.startPublishingStream(audioStreamID, localStream)
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

//开始混音
$('#mixAudio').on('click',async() => {
    const result = zg.startMixingAudio(audioStreamID,[
        $('#applaud')[0]
    ])
    console.log(result)//true
    if(result){
        //混音成功
        $('#stopEffect')[0].disabled = false;
        $('#newMember')[0].disabled = false;
    }
})
 // 混音成功,创建一个新用户进去听混音结果
$('#newMember').click(async() => {
    roomID = $('#roomId').val();
    userID = 'newMember' + new Date().getTime();
    userName = 'newMember';

    zgNew = new ZegoExpressEngine(_config.appid,_config.server);
    await login(zgNew,roomID);

    const remoteStream = await zgNew.startPlayingStream(audioStreamID);
    mixAudio = document.getElementById('previewVideo');
    mixAudio.srcObject = remoteStream;
    $(mixAudio).show();
})
//停止混音
$('#stopEffect').on('click',async() => {
    zg.stopMixingAudio(audioStreamID)
    $('#mixAudio')[0].disabled = false;
    $('#stopEffect')[0].disabled = true;
})

//退出房间
$('#leaveRoom').on('click',function(){
    roomID = $('#roomId').val();
    logoutRoom(zg,roomID,audioStreamID,'previewVideo');
    logoutRoom(zgNew,roomID,audioStreamID,'previewVideo');
    $('#previewVideo').hide();

    $('#mixAudio').attr('disabled',true)
    $('#stopEffect').attr('disabled',true)
    $('#newMember').attr('disabled',true)
})