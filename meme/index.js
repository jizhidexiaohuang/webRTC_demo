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
let localVideo;

zg = new ZegoClient();
zg.config(_config);
bindListener();
zg.setUserStateUpdate(true);

// 1. 检测设备
ZegoClient.supportDetection(function (result) {
    console.log(result)
    if (!result.webRtc) {
        alert('当前浏览器不支持webRTC')
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
                // 推流
                zg.startPublishingStream(streamid = roomid, localVideo);
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

// 5. 主播退出房间
function logoutRoom() {
    zg.logout()
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
            })
        } else {
            streamList.forEach((item) => {
                zg.stopPlayingStream(item.stream_id);
                let div = document.getElementById(item.stream_id);
                document.getElementsByClassName('row-remote')[0].removeChild(div);
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