let _config = {
    appid: 173230341,
    server: 'wss://webliveroom173230341-api.zego.im/ws',
    logLevel: 1,
    remoteLogLevel: 1,
    idName: 'userId' + new Date().getTime(),
    nickName: 'userName' + new Date().getTime(),
    audienceCreateRoom: false,
}
let tokenUrl = 'https://wsliveroom-alpha.zego.im:8282/token';
let roomid;
let token = '';
let localVideo = document.getElementById('localVideo');
let lianmaiList = [];

zg = new ZegoClient();
zg.config(_config);
bindListener();
zg.setUserStateUpdate(true);

// 1. 检测设备
ZegoClient.supportDetection(function (result) {
    console.log(result)
    if (!result.webRtc) {
        alert('当前浏览器不支持webRTC')
    } else if (!result.capture) {
        alert('当前浏览器不支持捕获摄像头麦克风设备')
    } else if (!result.videoDecodeType.H264) {
        alert('浏览器不支持视频H.264编码');
    } else if (!result.videoDecodeType.VP8) {
        alert('浏览器不支持视频VP8编码');
    }
}, function (err) {
    console.error(err);
})
// 2. 获取token，登入房间
async function getToken() {
    let response = await fetch(tokenUrl + '?app_id=' + _config.appid + '&id_name=' + _config.idName);
    if (response.status >= 200 && response.status < 300) {
        await response.text().then(res => {
            token = res;
        })
    } else {
        throw new Error(response.statusText);
    }
}

let btn = document.getElementById('startPublish')
btn.onclick = async function () {
    try {
        await getToken()
        roomid = document.getElementById('roomid').value;
        if(!roomid){
            alert('请输入roomid');
            return ;
        }
        zg.login(roomid, 1, token, (streamlist) => {
            console.log(streamlist);
            // 3. 预览，推流
            const { div, video } = createVideoTag(true, _config.idName, roomid);
            localVideo = video;
            video.setAttribute('id', 'localVideo')
            document.getElementsByClassName('row-local')[0].appendChild(div);
            zg.startPreview(localVideo, { video: true, audio: true }, (success) => {
                console.log('预览成功！', success)
                // 设置音浪回调
                zg.setSoundLevelDelegate(true, 200);
                zg.onSoundLevelUpdate = (soundLevelList) => {
                    soundLevelList.forEach(item => {
                        // console.log('%c' + item.type+'==='+item.soundLevel, 'font-size: 20px')
                    })
                };
                // 推流
                zg.startPublishingStream(streamid = roomid, localVideo);
                btn.setAttribute('disabled', true)
                document.getElementById('lianmai').removeAttribute('disabled');
                document.getElementById('userID').innerHTML = `当前主播userID: ${_config.idName}`
                document.getElementById('streamID').innerHTML = `当前主播streamID: ${roomid}`
                lianmaiList.push(streamid)
                // 转推cdn  rtmp://test.aliyun.zego.im/livestream/{流名}
                zg.publishTarget({
                    type: 'addpush',
                    streamId: roomid,
                    pushUrl: `rtmp://publish-memetest-aliyun.zego.im/memetest/${roomid}`
                }, (success) => {
                    console.log('转推成功==', success, 'rtmp://publish-memetest-aliyun.zego.im/memetest' + roomid)
                    console.log('拉流cdn地址==', `https://play-memetest-aliyun.zego.im/memetest/${roomid}.flv`)
                    setReliable()
                }, (err) => {
                    console.log('转推失败==', err)
                })
            }, (error) => {
                console.log('预览失败！', error)
            })
        }, err => {
            console.log(err)
        })
    } catch (err) {
        console.log(err)
    }
}

function pushStream(){
    const { div, video } = createVideoTag(true, _config.idName, '456');
    let localVideo456 = video;
    document.getElementsByClassName('row-local')[0].appendChild(div);
    zg.startPreview(localVideo456, 
    {
        video: true,
        audio: true,
        // horizontal: true,
        videoQuality: 4,
        width: 480,
        height: 640,
        frameRate: 15,
        bitRate: {
            maxBitRate: 1500,
            minBitRate: 1000, 
        },
        // bitRate: 600,
        audioBitRate: 48000,
        noiseSuppression: true,
        autoGainControl: true,
        echoCancellation: true,
    },(success) => {
        console.log('推流成功===')
        zg.startPublishingStream('456',localVideo456, '444',
            {cdnUrl: 'rtmp://publish-memetest-aliyun.zego.im/memetest/456'},
        );
    },(error) => {

    })
}

// 关闭/打开摄像头
function enableCamera(){
    let localVideo = document.getElementById('localVideo');
    zg.enableCamera(localVideo, false)
}
function enableMic(){
    let localVideo = document.getElementById('localVideo');
    zg.enableMicrophone(localVideo, false)
}

function change(){
    zg.setPublishStreamConstraints('456', {
        width: 800,
        height: 600,
        maxBitRate: 1500,
        minBitRate: 1000,
        noiseSuppression: false,
        autoGainControl: false,
        echoCancellation: true,
        frameRate: 20
    }, (success)=>{
        console.log('修改推流参数成功==',success,roomid)
    },(error) =>{
        console.log('修改推流参数失败==',error)
    })
}
function startMixing(){
    let mixConfig = {
        outputStreamId: 'mixStreamID',
        outputUrl: `rtmp://publish-memetest-aliyun.zego.im/memetest/${roomid}`,
        outputBitrate: 10000,
        outputFps: 20,
        outputWidth: 400,
        outputHeight: 600,
        streamList:[
            {
                streamId: '123',
                top: 0,
                left: 0,
                bottom: 600,
                right:400
            },
            {
                streamId: '456',
                top: 0,
                left: 0,
                bottom: 300,
                right:400
            }
        ]
    }
    zg.updateMixStream(mixConfig, (success)=>{
        console.log('混流成功==',success)
    }, (error) => {
        console.log('混流失败==',error)
    })
}
function stopMixing(){
    zg.stopMixStream({
        outputStreamId: 'mixStreamID'
    }, (success)=>{
        console.log('停止混流成功==',success)
    }, (error) => {
        console.log('停止混流失败==',error)
    })
}
// 5. 主播退出房间
function logoutRoom() {
    // 删除转推CDN
    zg.publishTarget({
        type: 'delpush',
        streamId: roomid,
        pushUrl: `rtmp://publish-memetest-aliyun.zego.im/memetest/${roomid}`
    }, (success) => {
        console.log('删除转推成功==')
        // 停止推流，预览
        zg.stopPublishingStream(roomid)
        zg.stopPreview(localVideo)

        // 停止拉流
        if (lianmaiList.length > 0) {
            lianmaiList.forEach((item) => {
                zg.stopPlayingStream(item);
                if(item!==roomid){
                    let div = document.getElementById(item);
                    document.getElementsByClassName('row-remote')[0].removeChild(div);
                }
            })
        }
        lianmaiList = [];
        // 同步msg
        setReliable().then(res=>{
            zg.logout();
        })
        let div = document.getElementById(roomid);
        document.getElementById('row-local').removeChild(div);
        document.getElementById('startPublish').removeAttribute('disabled')
        document.getElementById('stop-lianmai').setAttribute('disabled', true)
        document.getElementById('lianmai').setAttribute('disabled', true)
    }, (err) => {
        console.log('删除转推失败==', err)
    })
    
}

// 6. 新观众进入房间
function newAudience() {
    roomid = document.getElementById('roomid').value;
    if(!roomid){
        alert('请输入roomid');
        return ;
    }
    window.open('./audience.html?roomid=' + roomid)
}

// 主播发起与主播的连麦
function lianmaiPK() {
    let val = document.getElementById('lianmai-streamid').value;
    if (!val || val === '') {
        alert('请填写连麦主播的streamID')
        return
    }
    if(lianmaiList.length>1){
        alert('正在连麦中')
        return
    }
    lianmaiList.push(val);
    const { div, video } = createVideoTag(false, 'pk主播', val)
    document.getElementsByClassName('row-remote')[0].appendChild(div);
    zg.startPlayingStream(val, video);
    setReliable()
    // 结束连麦按钮
    if (lianmaiList.length > 0) {
        document.getElementById('stop-lianmai').removeAttribute('disabled');
    }
    document.getElementById('lianmai').setAttribute('disabled', true)
}
//更新msg
function setReliable() {
    let sendMsg = lianmaiList.length ? lianmaiList.join(',') : " ";
    // pk成功后，告知观众去拉cdn流
    return new Promise((resolve, reject)=>{
        zg.sendReliableMessage("streaminfo", sendMsg, (seq) => {
            console.log('发送成功==', seq)
            resolve(true)
        }, (err, seq) => {
            console.log('发送失败==', err)
            reject(err)
        })
    })
    
}
// 主播结束与主播的连麦
function stopLianmai() {
    let val = document.getElementById('lianmai-streamid').value;
    if (val) {
        zg.stopPlayingStream(val);
        let index = lianmaiList.indexOf(val);
        lianmaiList.splice(index, 1);
        let div = document.getElementById(val);
        document.getElementsByClassName('row-remote')[0].removeChild(div);
    } else {
        if (lianmaiList.length > 0) {
            lianmaiList.forEach((item) => {
                zg.stopPlayingStream(item);
                let div = document.getElementById(item);
                document.getElementsByClassName('row-remote')[0].removeChild(div);
            })
        }
    }
    document.getElementById('stop-lianmai').setAttribute('disabled', true)
    document.getElementById('lianmai').removeAttribute('disabled');

    // 告诉观众，与连麦主播结束连麦 停止拉cdn
    setReliable();
}

// 发起与观众的连麦
function lianmaiAudience() {
    let val = document.getElementById('andience-streamid').value;
    if (!val || val === '') {
        alert('请填写连麦主播的streamID')
        return
    }

    // 通知观众去推流
    zg.sendRoomMsg(1, 1, val, (seq, msgId, msg_category, msg_type, msg_content) => {
        console.log('发送成功==', msg_content)
    }, (err, seq, msg_category, msg_type, msg_content) => {
        console.log('发送失败==', err)
    })
}

// 结束与观众的连麦
function stopLianmaiToAudience() {
    let val = document.getElementById('andience-streamid').value;
    let stopLianmaiList = [];
    if (val) {
        stopLianmaiList.push(val)
    } else {
        stopLianmaiList = lianmaiList;
    }

    // 告诉连麦观众 停止推流
    zg.sendRoomMsg(1, 2, stopLianmaiList.join(','), (seq, msgId, msg_category, msg_type, msg_content) => {
        console.log('发送成功==', msg_content)
    }, (err, seq, msg_category, msg_type, msg_content) => {
        console.log('发送失败==', err)
    })
}

// 绑定事件
function bindListener() {
    zg.onDisconnect = function (err) {
        // 网络断开后的回调处理
        console.log('网络断开后的回调处理', err)
    }
    zg.onKickOut = function (err) {
        // 踢出房间后的回调处理
    }
    zg.onPlayStateUpdate = (type, streamid, error)=>{
        console.log('onPlayStateUpdate==', type, streamid, error)
    }
    zg.onPublishStateUpdate = (type, streamid, error)=>{
        console.log('onPublishStateUpdate==', type, streamid, error)
    }
    zg.onVideoSizeChanged = (streamid, videoWidth, videoHeight) => {
        console.log('onVideoSizeChanged==', streamid, videoWidth, videoHeight)
    }
    zg.onStreamUpdated = function (type, streamList) {
        if (type === 0) {
            streamList.forEach((item) => {
                const { div, video } = createVideoTag(false, item.stream_id, item.stream_id)
                document.getElementsByClassName('row-remote')[0].appendChild(div);
                zg.startPlayingStream(item.stream_id, video);
                lianmaiList.push(item.stream_id)
                // 通知其他观众去拉连麦观众的的cdn
                setReliable()
            })
        } else {
            streamList.forEach((item) => {
                zg.stopPlayingStream(item.stream_id);
                let div = document.getElementById(item.stream_id);
                console.log(document.getElementsByClassName('row-remote')[0])
                document.getElementsByClassName('row-remote')[0].removeChild(div);
                let index = lianmaiList.indexOf(item.stream_id);
                lianmaiList.splice(index, 1);
                setReliable()
            })
        }
    }
    zg.onUserStateUpdate = function (roomId, userList) {
        console.log('有新观众进入房间==', userList);
        let dstMemberList = [];
        userList.forEach((item) => {
            let p = document.createElement('p');
            if (item.action === 1) {
                p.innerHTML = `欢迎用户${item.idName}进入直播间`
                dstMemberList.push(item.idName)
            } else {
                p.innerHTML = `用户${item.idName}离开直播间`
            }
            document.getElementsByClassName('user-div')[0].appendChild(p);
        })
    }
}
// 创建video
function createVideoTag(bool, userId, streamId) {
    let div = document.createElement('div');
    div.setAttribute('class', 'video');
    div.setAttribute('id', streamId)
    let spanUserid = document.createElement('span');
    spanUserid.setAttribute('class', 'video-userid')
    spanUserid.innerHTML = `主播的userId: ${userId}`
    let spanStreamid = document.createElement('span');
    spanStreamid.setAttribute('class', 'video-streamid');
    spanStreamid.innerHTML = `主播的streamId: ${streamId}`
    let video = document.createElement('video');
    video.autoplay = true;
    video.muted = bool;
    div.appendChild(video);
    div.appendChild(spanUserid);
    div.appendChild(spanStreamid);
    return { div, video };
}

function createJoinTag(userId) {
    let joinDiv = document.createElement('div');
    joinDiv.setAttribute('class', 'lianmai-join');
    let str = `<p>收到观众：${userId}的连麦邀请</p>
    <button onclick="agreeLianmai()" class="btn btn-primary btn-sm btn-success">同意</button>
    <button onclick="rejectLianmai()" class="btn btn-primary btn-sm btn-danger">拒绝</button>`
    joinDiv.innerHTML = str;
    document.getElementsByClassName('row-btn')[0].appendChild(joinDiv);
}

function hideJoinTag() {
    let joinDiv = document.getElementsByClassName('lianmai-join')[0];
    document.getElementsByClassName('row-btn')[0].removeChild(joinDiv);
}

function createTips(noticeStr) {
    let tipsDiv = document.createElement('div');
    tipsDiv.setAttribute('class', 'tips');
    tipsDiv.innerHTML = noticeStr;
    document.getElementsByClassName('row-btn')[0].appendChild(tipsDiv);
    setTimeout(() => {
        document.getElementsByClassName('row-btn')[0].removeChild(tipsDiv);
    }, 2000)
}