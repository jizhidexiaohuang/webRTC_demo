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

let zg, roomID, streamID = 'streamID-'+new Date().getTime(), localStream;

zg = new ZegoExpressEngine(_config.appid,_config.server);
enumDevices(zg)

//创建流
async function createStream(source){
    if(!loginState){
        await login(zg,roomID);
    }

    // 调用 createStream 接口后，需要等待 ZEGO 服务器返回流媒体对象才能执行后续操作
    localStream = await zg.createStream({
        custom: {
            source: source,
            bitrate: $('#audioBitrate').val() * 1,
            channelCount: $('#channelCount').val() * 1
        }
    });
    // 获取页面的 video 标签
    const localVideo = document.getElementById('previewVideo');
    // stream 为MediaStream对象，开发者可通过赋值给video或audio的srcObject属性进行渲染
    localVideo.srcObject = localStream;
    
    zg.startPublishingStream(streamID, localStream)
}

// 流推成功的回调
zg.on('publisherStateUpdate', resulte => {
    console.log(resulte.streamID)
    console.log('===========')
    
    if(resulte.state === 'PUBLISHING'){
        //推流成功
    }
});
//推第三方视频
$('#externalCaptureV').on('click',async function(){
    roomID = $('#roomId').val();
    streamID = 'streamID-'+new Date().getTime();
    let media = await changeStream($('#externerVideo')[0], {width: null, height: null})
    
    createStream(media);
})
//推第三方音频
$('#externalCaptureA').on('click',function(){
    roomID = $('#roomId').val();
    streamID = 'streamID-'+new Date().getTime();
    createStream($('#externerAudio')[0]);
})
//退出房间
$('#leaveRoom').on('click',function(){
    roomID = $('#roomId').val();
    logoutRoom(zg,roomID,streamID,'previewVideo');
})

function changeStream(source, config) {
    var version = getChromeVersion();
    if (version < 87.5) {
        return source
    }
    return new Promise((resolve, reject) => {
        let video = source;
        console.log(video)
        console.log(document.getElementById('externerVideo'))
        let canvas = document.createElement("canvas");
        canvas.setAttribute("style", "display:none");
        document.body.append(canvas);
        let stream = video.captureStream()
        video.oncanplay = function () {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            video.play();
        }
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        console.log(canvas.width, canvas.height)
        let ctx = canvas.getContext("2d");
        let media = canvas.captureStream(25);
        let track = media.getVideoTracks()[0];
        let draw = function () {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            // track.requestFrame && track.requestFrame();
            var timer = setTimeout(() => {
                draw();
            }, 60);
            // video.srcObject = stream;

        }
        draw();
        let q = track.stop
        track.stop = () => {
            q.call(track);
            draw();
            video.remove();
            canvas.width = 0;
            canvas.remove();
            video = canvas = null;
        }
        if (stream instanceof MediaStream && stream.getAudioTracks().length) {
            let micro = stream.getAudioTracks()[0];
            media.addTrack(micro)
        }
        resolve(media)
    })
}

//判断浏览器版本  必须是谷歌88 版本
function getChromeVersion() {
    var arr = navigator.userAgent.split(' ');
    var chromeVersion = '';
    for (var i = 0; i < arr.length; i++) {
        if (/chrome/i.test(arr[i]))
            chromeVersion = arr[i]
    }
    if (chromeVersion) {
        return Number(chromeVersion.split('/')[1].split('.')[0]);
    } else {
        return false;
    }
}