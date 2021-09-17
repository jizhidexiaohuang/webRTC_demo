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

//创建流
async function createStream(publish = true){
    if(!loginState){
        await login(zg, roomID);
    }

    // 调用 createStream 接口后，需要等待 ZEGO 服务器返回流媒体对象才能执行后续操作
    localStream = await zg.createStream({
        camera:{
            AEC: $('#AEC').val() === '1' ? true : false, //回声消除
            AGC: $('#AGC').val() === '1' ? true : false, //自动增益
            ANS: $('#ANS').val() === '1' ? true : false, //降噪
        }
    });
    // 获取页面的 video 标签
    // const localVideo = document.getElementById('previewVideo');
    // stream 为MediaStream对象，开发者可通过赋值给video或audio的srcObject属性进行渲染

    let video = document.createElement('video');
    video.setAttribute('autoplay',true);
    video.setAttribute('playsinline',true)
    let localVideoDiv = document.getElementById('localVideo');
    localVideoDiv.append(video);

    video.srcObject = localStream;

    // localStream 为创建流获取的 MediaStream 对象
    if(publish){
        zg.startPublishingStream(streamID, localStream);
        $('#newMember').attr('disabled',false);
    }
}

let zg, zgNew, roomID, localStream,
    streamID = 'streamID-'+new Date().getTime();
//初始化
zg = new ZegoExpressEngine(_config.appid,_config.server);
zgNew = new ZegoExpressEngine(_config.appid,_config.server);
enumDevices(zg)

//创建房间预览推流
$('#createRoom').on('click',function(){
    roomID = $('#roomId').val();
    if(roomID==''){
        alert('请填写roomID')
    }else{
        createStream(true)
    }
})
//创建房间只预览
$('#createRoomNoPublish').on('click',function(){
    roomID = $('#roomId').val();
    createStream(false)
})
//推流
$('#publishStream').on('click',async() => {
    if(!localStream){
        localStream = await zg.createStream({
            camera:{
                AEC: $('#AEC').val() === '1' ? true : false, //回声消除
                AGC: $('#AGC').val() === '1' ? true : false, //自动增益
                ANS: $('#ANS').val() === '1' ? true : false, //降噪
            }
        });
    }
    zg.startPublishingStream(streamID, localStream);
    $('#newMember').attr('disabled',false);
})
//进入房间
$('#openRoom').on('click',function(){
    roomID = $('#roomId').val();
    login(zg,roomID);
})
//新成成员进入房间拉流
$('#newMember').on('click',async() => {
    roomID = $('#roomId').val();
    userID = new Date().getTime() + '';
    userName = 'new' + new Date().getTime();

    await login(zgNew,roomID)

    const remoteStream = await zgNew.startPlayingStream(streamID);
    remoteVideo = document.getElementById('remoteVideo');
    remoteVideo.srcObject = remoteStream;
})
//退出房间
$('#leaveRoom').on('click',function(){
    roomID = $('#roomId').val();
    logoutRoom(zg,roomID,streamID,'previewVideo');
    if(zgNew){
        logoutRoom(zgNew,roomID,streamID,'remoteVideo');
    }
    $('#newMember').attr('disabled',true);
})

// 房间状态更新回调
zg.on('roomStateUpdate', (roomID,state,errorCode,extendedData) => {
    console.log(state)
    if (state == 'DISCONNECTED') {
        // 与房间断开了连接
    }

    if (state == 'CONNECTING') {
        // 与房间尝试连接中 
    }

    if (state == 'CONNECTED') {
        // 与房间连接成功
    }
})

// 用户状态更新回调
zg.on('roomUserUpdate', (roomID, updateType, userList) => {
    console.warn(
        `roomUserUpdate: room ${roomID}, user ${updateType === 'ADD' ? 'added' : 'left'} `,
        JSON.stringify(userList),
    );
});

// 流状态更新回调
zg.on('roomStreamUpdate', async (roomID, updateType, streamList, extendedData) => {
    if (updateType == 'ADD') {
        // 流新增，开始拉流
    } else if (updateType == 'DELETE') {
        // 流删除，停止拉流
    }
});

zg.on('publisherStateUpdate', result => {
    // 推流状态更新回调
    // ... 
    console.log(result)
})

zg.on('publishQualityUpdate', (streamID, stats) => {
    // 推流质量回调
    // ... 
})

//推流端音频开/关
$('#audioList').on('change',() => {
    console.log($('#audioList').val())
    let mute = $('#audioList').val() == '0' ? true : false; // true 表示不发送视频流
    zg.mutePublishStreamAudio(localStream,mute)
})

//推流端摄像头开/关
$('#videoList').on('change',() => {
    console.log($('#videoList').val())
    let mute = $('#videoList').val() == '0' ? true : false; // true 表示不发送视频流
    const videoStatus = zg.mutePublishStreamVideo(localStream,mute,true);
    console.log(videoStatus) // true 关闭成功
})

//拉流端监听
zgNew.on('remoteCameraStatusUpdate', (streamID, status) => {
    console.log(streamID + '---' + status) //OPEN || MUTE 开 / 关
})