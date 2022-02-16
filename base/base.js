// var appID = 1739272706, // 必填，应用id，请从 即构管理控制台-https://console.zego.im/acount/register 或邮件中获取
var appID = 1739272706, // 必填，应用id，请从 即构管理控制台-https://console.zego.im/acount/register 或邮件中获取
    _config = {
        appid: appID * 1,
        server: 'wss://webliveroom-test.zego.im/ws',//必填，接入服务器地址，请从 即构管理控制台-https://console.zego.im/acount/register 或邮件中获取
        // server: 'wss://webliveroom173230341-api.zego.im/ws'
    };
var tokenUrl = 'https://wsliveroom-alpha.zego.im:8282/token';
var userID = new Date().getTime() + '';
// var userID = '666';
var userName = 'u' + new Date().getTime();
var loginState = false;  //登录状态

// 获取token 登录房间
async function login(zg,roomID){
    const token = await $.get(tokenUrl,{
        app_id:_config.appid,
        id_name:userID
    })
    // token = '03AAAAAGHxKLAAEDI1b3ZxaHhpbjFrbGF5dzUAoBKelzUy4ku4v9kkIo8PE1gmd1mT58mf9XdvkPHHmYy5ktoMRXTvC3YeR7Svq5ZeSE/44CkvQ4mVQUhrzx+hsugBl8aTm+OTOuRfL1x4LbVFrOzFVaAKEafL7XLLo7RHWf+I74EyusPhLJ3kevA4Wlb8o/j01CWp5e/K50tx3aKmecLqaHD+lr9EjXdchAflGrhX4paA39nQxX8p1eeySC4='
    const result = await zg.loginRoom(roomID, token, {userID, userName}, {userUpdate: true, maxMemberCount: 10});
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
    // debugger
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
    console.log(deviceInfo)
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
    
    let config = {
        // AEC: $('#AEC').val() === '1' ? true : false, //回声消除
        // AGC: $('#AGC').val() === '1' ? true : false, //自动增益
        // ANS: $('#ANS').val() === '1' ? true : false, //降噪
        videoQuality: parseInt($('#videoQuality').val()) ,
    }
    console.log($('#videoQuality').val())
    if(parseInt($('#videoQuality').val()) == 4){
        config.width = parseInt($('#width').val()),
        config.height = parseInt($('#height').val()),
        config.frameRate = parseInt($('#frameRate').val()),
        config.bitrate = parseInt($('#bitrate').val())
    }
    console.log(config)
    // 调用 createStream 接口后，需要等待 ZEGO 服务器返回流媒体对象才能执行后续操作
    localStream = await zg.createStream({
        camera:config
    });
    console.log(localStream)
    // 美颜接口
    // await zg.setEffectsBeauty(localStream, true, {
    //     whitenIntensity: 100,
    //     rosyIntensity: 100,
    //     smoothIntensity: 100,
    //     sharpenIntensity: 100
    // })
    // let audioTrack = localStream.getAudioTracks()[0];
    // localStream.removeTrack(audioTrack);


    // let volume = await zg.setCaptureVolume(localStream, 30);
    // console.log('调节采集音量createStream====='+JSON.stringify(volume))


    // 获取页面的 video 标签
    const localVideo = document.getElementById('previewVideo');
    // stream 为MediaStream对象，开发者可通过赋值给video或audio的srcObject属性进行渲染

    // let video = document.createElement('video');
    // let localVideoDiv = document.getElementById('localVideo');
    // localVideoDiv.append(video);
    localVideo.srcObject = localStream;
    localVideo.play();

    // localStream 为创建流获取的 MediaStream 对象
    if(publish){
        zg.startPublishingStream(streamID, localStream);
        $('#newMember').attr('disabled',false);
    }
}

let zg, roomID, localStream,
    streamID = 'streamID-'+new Date().getTime(), 
    // streamID = 'streamID-'+userID
    streamIDList = [];
//初始化
zg = new ZegoExpressEngine(_config.appid,_config.server);
zg.checkSystemRequirements("webRTC").then(res=>{
    console.log('检查能力===',res)
});

zg.setLogConfig({logLevel:'debug', remoteLogLevel:'debug'});
// zg.enableMultiRoom(true)
zg.setDebugVerbose(false)
zg.setSoundLevelDelegate(true,1000);
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
$('#changeVideoConfig').on('click', async()=>{
    let res = await zg.setVideoConfig(localStream,{
        width: parseInt($('#width').val()) ,
        height: parseInt($('#height').val()) ,
        frameRate: parseInt($('#frameRate').val()) ,
        maxBitrate: parseInt($('#bitrate').val()) ,
    })
    console.log(res)
})
//进入房间
$('#openRoom').on('click',function(){
    roomID = $('#roomId').val();
    login(zg,roomID);
})

//退出房间
$('#leaveRoom').on('click',function(){
    roomID = $('#roomId').val();
    logoutRoom(zg,roomID,streamID,'previewVideo');
    $('#newMember').attr('disabled',true);
})

// 设置流附加消息
$('#streamExtraInfo').on('click', async function(){
    let res = await zg.setStreamExtraInfo(streamID, '流附加消息')
    console.log('设置流附加消息====', res);
})

//关闭正在推流的画面
$('#muteStreamVideo').on('click', async function(){
    let res = await zg.mutePublishStreamVideo(localStream, true)
    console.log('关闭推流画面====', res);
})

//关闭正在推流的声音
$('#muteStreamAudio').on('click', async function(){
    let res = await zg.mutePublishStreamAudio(localStream, true)
    console.log('关闭推流声音====', res);
})

//停止拉流画面及声音
$('#muteAudioAndVideo').on('click', async ()=>{
    let streamID = streamIDList[0];
    console.log(streamID)
    try {
        let audioRes = await zg.mutePlayStreamAudio(streamID, true); //停止拉流音频的流不能是纯视频
        console.log('停止拉流音频===', audioRes);
    } catch (error) {
        console.log(error)
    }
    let videoRes = await zg.mutePlayStreamVideo(streamID, true);
    console.log('停止拉流视频===', videoRes); //停止拉流视频的流不能是纯音频
})

// 切换摄像头
function useVideoDevice(event) {
    console.log('修改video设备')
    console.log(event.target.value)
    deviceID = event.target.value
    zg.useVideoDevice(localStream, deviceID)
}
//切换麦克风
function useAudioDevice(event){
    console.log('修改audio设备')
    console.log(event.target.value)
    deviceID = event.target.value
    zg.useAudioDevice(localStream, deviceID)
}
//关闭/打开麦克风
$('#muteMicrophone').on('click', async () =>{
    let flag = zg.isMicrophoneMuted();
    zg.muteMicrophone(!flag);
    console.log(`${flag ? '打开' : '关闭'}麦克风成功`)
})

// 调节采集音量
$('#setCaptureVolume').on('click', async function(){
    let volume = await zg.setCaptureVolume(localStream, 30);
    console.log('调节采集音量====='+JSON.stringify(volume))
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
    console.log(userList)
    console.log('=================')
    console.warn(
        `roomUserUpdate: room ${roomID}, user ${updateType === 'ADD' ? 'added' : 'left'} `,
        JSON.stringify(userList),
    );
});
// 房间在线人数
zg.on('roomOnlineUserCountUpdate',(roomID, count) => {
    console.log('%c' + count, 'font-size: 20px')
})

// 流状态更新回调
zg.on('roomStreamUpdate', async (roomID, updateType, streamList, extendedData) => {
    console.log('%c' + updateType, 'font-size: 50px')
    console.log(streamList)
    if (updateType == 'ADD') {
        console.log('%c ADD', 'font-size: 50px')
        // 流新增，开始拉流
        streamList.forEach(async(item) => {
            let remoteStream = await zg.startPlayingStream(item.streamID)
            let video = document.createElement('video');
            video.srcObject = remoteStream;
            video.setAttribute('streamid',item.streamID)
            video.setAttribute('id','remoteVideo_'+item.streamID)
            video.setAttribute('muted',true)
            video.autoplay = true;
            streamIDList.push(item.streamID)
            document.getElementById('remoteVideo').append(video);
        })

    } else if (updateType == 'DELETE') {
        // 流删除，停止拉流
        console.log('%c DELETE', 'font-size: 20px')
        streamList.forEach(async(item) => {
            await zg.stopPlayingStream(item.streamID)
            document.getElementById('remoteVideo_'+item.streamID).srcObject = null;
        })
    }
});



zg.on('publishQualityUpdate', (streamID, stats) => {
    // 推流质量回调
    // ... 
    // console.log('%c' + streamID+'===='+ JSON.stringify(stats), 'font-size: 20px')
})
zg.on('publisherStateUpdate', async (result) => {
    // 推流状态更新回调
    // ... 
    console.log('%c' + JSON.stringify(result), 'font-size: 20px')
    if(result.state === 'PUBLISHING'){
        // let volume = await zg.setCaptureVolume(localStream, 30);
        // console.log('调节采集音量publisherStateUpdate====='+JSON.stringify(volume))
    }
})
zg.on('playQualityUpdate', (streamID, stats) => {
    // 拉流质量回调
    // ... 
    // console.log('%c' + streamID+'===='+ JSON.stringify(stats), 'font-size: 20px')
})
zg.on('playerStateUpdate', (result) => {
    // 拉流状态更新回调
    // ... 
    // console.log('%c' + JSON.stringify(result), 'font-size: 20px')
})

zg.on('soundLevelUpdate', (data) => {
    // ... 
    data.forEach(item => {
        // console.log('%c' + item.type+'==='+item.soundLevel, 'font-size: 20px')
    })
})

zg.on('capturedSoundLevelUpdate', (soundLevel) => {
    // ... 
    // console.log('%c' + soundLevel, 'font-size: 20px')
})
//推流端音频开/关
// $('#audioList').on('change',() => {
//     console.log($('#audioList').val())
//     let mute = $('#audioList').val() == '0' ? true : false; // true 表示不发送视频流
//     zg.mutePublishStreamAudio(localStream,mute)
// })

//推流端摄像头开/关
// $('#videoList').on('change',() => {
//     console.log($('#videoList').val())
//     let mute = $('#videoList').val() == '0' ? true : false; // true 表示不发送视频流
//     const videoStatus = zg.mutePublishStreamVideo(localStream,mute,true);
//     console.log(videoStatus) // true 关闭成功
// })

//拉流端监听
zg.on('remoteCameraStatusUpdate', (streamID, status) => {
    console.log(streamID + '---' + status) //OPEN || MUTE 开 / 关
})

// 流附加消息
zg.on('streamExtraInfoUpdate', (roomID, streamList) => {
    console.log('extraInfo====', streamList[0].streamID, streamList[0].extraInfo);
})

//监听音频设备
zg.on('audioDeviceStateChanged', (updateType, deviceType, deviceInfo) =>{
    console.log('%c 设备改变' + updateType+'===='+ deviceType+ '====' +JSON.stringify(deviceInfo), 'font-size: 20px')
})
zg.on('deviceError', (errorCode, deviceName)=>{
    console.log('%c 设备' + errorCode+'===='+ deviceName, 'font-size: 20px')
})

zg.on("tokenWillExpire", function(roomID){
    console.log('tokenWillExpire==',roomID);
    let token = '03AAAAAGHesQIAEHNhNTQ5eTU5dWVxdWl2MncAoFZEutet8GsO8RPnlKbnJfXoPeTK+QzJy+IqhwyGQ16B8S6yAt6YUMOjKo9ERJ5GnR6O4iyQTkt1hGtVKRF2zgq0p2VJVtNr7VW6SBI8y7lSKQrIMIk7g7DJjA3vNNTdDwv6dZuuER9u1b1krtRYk2VLExsL+KWSyvTmY4Aq3ZVXupxpCtWoV/DaqGTWC6zQQtSVAy5MychoTPYHOdOJopA='
    zg.renewToken(token,roomID);
})