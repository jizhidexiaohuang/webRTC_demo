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
//创建一条消息
function createMes(textContent){
    $('#chatBoxInfo').append(`
        <div class="clearfloat">
            <div class="author-name">
                <small class="chat-date"> ${new Date().toLocaleString()}</small>
            </div>
            <div class="right">
                <div class="chat-message"> ${textContent} </div>
                <div class="chat-avatars">
                    <img src="./img/icon01.png" alt="头像" />
                </div>
            </div>
        </div>
    `);
    chatMessageNum += 1;
    $('#chatMessageNum').html(chatMessageNum)
}
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
    zg.startPublishingStream(streamID, localStream)
}

let zg, zgNew, roomID, streamID = 'streamID-'+new Date().getTime(),
    localStream, toUserIDList, chatMessageNum = 0;

zg = new ZegoExpressEngine(_config.appid,_config.server);
zgNew = new ZegoExpressEngine(_config.appid,_config.server);

enumDevices(zg);

$('.chatBox').hide();
//打开/关闭聊天框
$('.chatBtn').click(function() {
    $('.chatBox').toggle();
});

//接收广播消息
zgNew.on('IMRecvBroadcastMessage',(roomId,message) => {
    console.log('接收广播消息')
    console.log(roomId)
    console.log(message)
    createMes(message[0].message)
})
//接收弹幕消息
zgNew.on('IMRecvBarrageMessage',(roomId,message) => {
    console.log('接收弹幕消息')
    console.log(roomId)
    console.log(message)
    createMes(message[0].message)
})
//接收自定义信令
zgNew.on('IMRecvCustomCommand',(roomId,fromUser, command) => {
    console.log('接收自定义信令')
    console.log(roomId)
    console.log(fromUser)
    console.log(command)
    createMes(command)
})
// 接收房间附加消息
zgNew.on('roomExtraInfoUpdate', (roomID, extraInfoList) => {
    console.log('接收房间附加消息')
    console.log(`roomExtraInfo: room ${roomID} `);
    console.log(extraInfoList);
    createMes(extraInfoList[0].value)
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
//发送广播消息
$('#BroadcastMessage').on('click',async()=>{
    roomID = $('#roomId').val();
    const result = await zg.sendBroadcastMessage(roomID,'发送一条广播消息');
   
    if (result.errorCode === 0) {
        console.warn('send BroadcastMessage success');
    } else {
        console.error('send BroadcastMessage fail ', result.errorCode);
    }
})

//发送弹幕消息
$('#BarrageMessage').on('click',async()=>{
    roomID = $('#roomId').val();
    const result = await zg.sendBarrageMessage(roomID,'发送一条弹幕消息');
    if (result.errorCode === 0) {
        console.warn('send BarrageMessage success');
    } else {
        console.error('send BarrageMessage fail ', result.errorCode);
    }
})

//房间用户变化
zg.on('roomUserUpdate',(roomId, undateType, userList) => {
    console.log(undateType)
    console.log(userList)
    if(undateType == 'ADD'){
        toUserIDList = userList.map(item=>{
            return item.userID +''
        });
        $('#newMemberID').html(userList[0].userID)
        $('#newMemberName').html(userList[0].userName)
        $('#newMemberMes').show()
    }else if(undateType == 'DELETE'){

    }
})

//发送自定义信令 dstMembers must be strijg array
$('#sendCustomrMsg').on('click',async()=>{
    roomID = $('#roomId').val();
    zg.sendCustomCommand(roomID,'自定义信令',toUserIDList)
})

//发送房间附加消息
$('#ReliableMessage').on('click',async()=>{
    roomID = $('#roomId').val();
    const result = await zg.setRoomExtraInfo(roomID,'2','发送一条附加消息');
    if (result.errorCode === 0) {
        console.warn('setRoomExtraInfo suc');
    } else {
        console.error('setRoomExtraInfo err', result.errorCode);
    }
})

$('#newMember').click(async ()=>{
    roomID = $('#roomId').val();
    userID = 'newMember_' + new Date().getTime(),
    userName = 'newMember'
    await login(zgNew,roomID);
})

//退出房间
$('#leaveRoom').on('click',function(){
    roomID = $('#roomId').val();
    logoutRoom(zg,roomID,streamID,'previewVideo');
    logoutRoom(zgNew,roomID,streamID,'previewVideo');
    $('#newMemberMes').hide()
})
