var appID = 1739272706, // 必填，应用id，请从 即构管理控制台-https://console.zego.im/acount/register 或邮件中获取
    _config = {
        appid: appID * 1,
        server: 'wss://webliveroom-test.zego.im/ws',//必填，接入服务器地址，请从 即构管理控制台-https://console.zego.im/acount/register 或邮件中获取
    };
var tokenUrl = 'https://wsliveroom-alpha.zego.im:8282/token';
var userID = '123';
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

let zg, roomID, localStream,
    streamID = 'streamID-'+new Date().getTime();
let position = [0,0,0],
    axisForward = [1,0,0],
    axisRight = [0,1,0],
    axisUp = [0,0,1];
    
zg = new ZegoExpressEngine(_config.appid,_config.server);
enumDevices(zg)
const rangeAudio = zg.createRangeAudioInstance();
rangeAudio.setRangeAudioMode(0) // 范围语音接受模式 ---全世界

const isSupport = rangeAudio.isAudioContextRunning();
console.log(`是否支持自动播放====${isSupport}`)
async function enableAutoPlay() {
    // result 标识是否启用成功
    const result = await rangeAudio.resumeAudioContext();
    console.log(`标识是否启用成功====${result}`)
}


//初始化
async function createStream(){
    if(!loginState){
        await login(zg,roomID);
    }
    rangeAudio.updateSelfPosition(position, axisForward, axisRight, axisUp); // 初始化听者自身的位置和朝向 
    rangeAudio.enableSpatializer(true); //是否开启3D效果 仅对小队外人生效
    rangeAudio.enableMicrophone(true);  //打开麦克风
}

//进入房间
$('#openRoom').on('click',function(){
    roomID = $('#roomId').val();
    createStream()
})

//退出房间
$('#leaveRoom').on('click',function(){
    roomID = $('#roomId').val();
    logoutRoom(zg,roomID,streamID,'previewVideo');
})

//监听麦克风更新回调状态
rangeAudio.on("microphoneStateUpdate", (state, errorCode, extendedData) => {
    console.log(`microphoneStateUpdate====${state}`)
    if (state === 0) {
      // 关闭麦克风声音
    } else if(state === 1) {
      // 开启麦克风中
    } else if(state === 2) {
      // 打开麦克风发送声音
    }
})