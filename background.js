var popupOpen;

var defaultIcon = "images/default_user.png"

var profileIcon;
var username;
var accountStatus;
var volume;
var quality;

var leftMargin = 30;
var topMargin = 100;
var x_spacing = 245;
var y_spacing = 125;

var backgroundPlayerStatus;

var videoIsPlaying = false;
var currPlaylistPage = undefined;
var videoBeingPlayed = undefined;
var playlistBeingPlayed = undefined;

var playlistInfo = {playingPlaylist: undefined,
                    viewingPlaylist: undefined,
                    playlist: undefined};

var repeatOn;
var shuffleOn;

var orderToPlayVideos = [];
var playlistCollection = new Map();
var playlistUids = [];

var queue = {playlist: [],
             totalVideos: 0,
             current: 0,
             startIndex: 0,
             tempNext: false,
             tempPrev: false};

var tag = document.createElement('script');

tag.src = "https://www.youtube.com/iframe_api";
var firstScriptTag = document.getElementsByTagName('script')[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

var player;
function onYouTubeIframeAPIReady() {
  player = new YT.Player('player', {
    playerVars:{
      "enablejsapi": 1
    },
    events: {
      'onReady': onBackgroundPlayerReady,
      'onStateChange': onPlayerStateChange,
      'onPlaybackQualityChange': onPlaybackQualityChange
    }
  });
}

function onPlaybackQualityChange(data){
  
}

function onBackgroundPlayerReady(event){
  backgroundPlayerStatus = "waitingForSync";
  
  chrome.storage.sync.get("volume", function(item){
    if(typeof item.volume == "undefined"){
      volume = {"volume": 25, "mute": false};
    }
    else{
      volume = item.volume;
    }
    player.setVolume(volume.volume);
  });
}

function onPlayerStateChange(event) {
  videoIsPlaying = false;
  if (event.data == YT.PlayerState.PLAYING) {
    if(backgroundPlayerStatus == "waitingForSync"){
      player.pauseVideo();
      player.seekTo(0);
      chrome.runtime.sendMessage({request: "finishedLoading"});
    }
    else if(backgroundPlayerStatus == "ready"){
      videoIsPlaying = true; 
    }
  }
  else if(event.data == YT.PlayerState.BUFFERING){
    if(backgroundPlayerStatus == "ready"){
      
    }
  }
  else if(event.data == YT.PlayerState.ENDED){
    playNextInQueue();
  }
  else if(event.data == YT.PlayerState.CUED){

  }
}


function playVideo(){
  backgroundPlayerStatus = "ready";
  player.playVideo();
}

function pauseVideo(){
  backgroundPlayerStatus = "pausedByPagePlayer";
  player.pauseVideo();
}

function seekTo(time){
  player.seekTo(time);
}

function createVideo(id){
  backgroundPlayerStatus = "waitingForSync";
  player.loadVideoById(id, 0, "small");
}


function initQueue(startVideoIndex, playlistIndex){
  var videos = playlistCollection.get(playlistUids[playlistIndex]).videos;
  
  for(i = startVideoIndex - 1; i >= 0; i--){
    if(videos[i] == -1){
      startVideoIndex--;   
    }
  }
  
  if(videos.length != getPlaylistLength(playlistIndex)){
    cleanVideoArray(playlistIndex);
  }
  
  queue.playlist = shuffle(playlistCollection.get(playlistUids[playlistIndex]).videos, startVideoIndex);
  queue.totalVideos = queue.playlist.length;
  queue.tempNext = false;
  queue.tempPrev = false;
  if(shuffleOn){
    queue.startIndex = 0;
    queue.current = 0;
  }
  else{
    queue.startIndex = startVideoIndex;
    queue.current = startVideoIndex;
  }
}

function shuffle(videoArr, startVideoIndex){
  var arr = [];
  for(i = 0; i < videoArr.length; i++){
    arr[i] = {video: videoArr[i],
              index: i};
  }

  if(shuffleOn){
    // When shuffling a playlist we want the video that is being played to be
    // the first video in the playlist
    var temp = arr[0];
    arr[0] = arr[startVideoIndex];
    arr[startVideoIndex] = temp;
    for(i = arr.length - 1; i > 0; i--){
      var randomIndex = Math.floor((Math.random() * i) + 1);
      var temp = arr[randomIndex];
      arr[randomIndex] = arr[i];
      arr[i] = temp;
    }
  }

  return arr;
}

function startQueue(){
  createVideo(queue.playlist[queue.startIndex].video.videoId);
}

function queueHasNext(){
  if(queue.current == queue.playlist.length - 1 && !repeatOn){
    return false;
  }
  return true;
}

function previewNextInQueue(){
  if(queueHasNext()){
    return queue.playlist[queue.current + 1].video;
  }
  return undefined;
}

function playNextInQueue(){
  if(queue.tempNext){
    queue.current = 0;
    chrome.runtime.sendMessage({request: "playNextVideo",
                                video: queue.playlist[queue.current].video,
                                videoIndex: queue.playlist[queue.current].index,
                                prevVideoIndex: undefined});
    queue.tempNext = false;
  }
  else if(queueHasNext()){

    var prevId = queue.playlist[queue.current].video.videoId;
    var prevIndex = queue.playlist[queue.current].index;
    queue.current++;
    
    if(queue.current >= queue.playlist.length){
      queue.current = 0;
    }

    if(popupOpen){
      chrome.runtime.sendMessage({request:"playNextVideo", 
                                  video: queue.playlist[queue.current].video,
                                  videoIndex: queue.playlist[queue.current].index, 
                                  prevVideoIndex: prevIndex});
    }
    else{
      // If the next video to play is the same as the current one then restart the player
      if(prevId == queue.playlist[queue.current].video.videoId){
        player.playVideo();
      }
      // Otherwise load the new video
      else{
        player.loadVideoById(queue.playlist[queue.current].video.videoId, 0, "small");
      }
    }
  }
  else if(player.getPlayerState() == YT.PlayerState.ENDED){
    chrome.runtime.sendMessage({request:"playlistEnded", 
                                  videoIndex: queue.playlist[queue.current].index});
  }
}

function queueHasPrev(){
  if(queue.current == 0){
    return false;
  }
  return true;
}

function previewPrevInQueue(){
  if(queueHasPrev()){
    return queue.playlist[queue.current - 1].video;
  }
  return undefined;
}

function playPrevInQueue(){
  if(queue.tempPrev){
    queue.current = 0;
    queue.current = 0;
    chrome.runtime.sendMessage({request: "playPrevVideo",
                                video: queue.playlist[queue.current].video,
                                videoIndex: queue.playlist[queue.current].index,
                                prevVideoIndex: undefined});
    queue.tempPrev = false;
  }
  else if(queueHasPrev()){
    queue.current--;
    if(popupOpen){
      chrome.runtime.sendMessage({request: "playPrevVideo",
                                  video: queue.playlist[queue.current].video,
                                  videoIndex: queue.playlist[queue.current].index,
                                  prevVideoIndex: queue.playlist[queue.current + 1].index});
    } 
  }
}

function deleteFromQueue(indexToRemove){
  var length = queue.playlist.length;
  
  for(i = 0; i < length; i++){
    if(queue.playlist[i].index == indexToRemove){
      queue.playlist.splice(i, 1);
      return 1;
    }
  }
  return -1;
}

function addToQueue(video, index){
  queue.playlist.push({video: video,
                       index: index});
}



function updateCurrPlaylist(playlist){
  playlistCollection.delete(playlistUids[playlistInfo.viewingPlaylist]);
  playlistCollection.set(playlistUids[playlistInfo.viewingPlaylist], playlist);
  var obj = {};
  obj[playlistUids[playlistInfo.viewingPlaylist]] = playlist;
  chrome.storage.local.set(obj, function(){
    if(chrome.runtime.lastError){
      console.warn(chrome.runtime.lastError.message);
    }
  });
}



function addPlaylist(playlist){
  playlistUids.push(playlist.uid);
  playlistCollection.set(playlist.uid, playlist);
  chrome.storage.local.set({playlistUids: playlistUids}, function(){
    if(chrome.runtime.lastError){
      console.warn(chrome.runtime.lastError.message);   
    }
  });
  var obj = {};
  obj[playlist.uid] = playlist;
  chrome.storage.local.set(obj, function(){
    if(chrome.runtime.lastError){
      console.warn(chrome.runtime.lastError.message);
    }
  });
}

function deletePlaylist(playlistIndex){
  var returnStatus = 1;
  if(typeof playlistUids[playlistIndex] == "undefined" &&
     playlistIndex < 0 && playlistIndex >= playlistUids.length){
    returnStatus = -1; 
  }
  else{
    playlistInfo.viewingPlaylist = -1;
    if(playlistInfo.playingPlaylist == playlistIndex){
      player.stopVideo();
      playlistInfo.playingPlaylist = -1;
      queue.playlist = [];
      queue.current = 0;
      queue.startIndex = 0;
      queue.totalVideos = 0; 
      returnStatus = 0;
    }
    chrome.storage.local.remove(playlistUids[playlistIndex], function(){
      if(chrome.runtime.lastError){
        console.warn(chrome.runtime.lastError.message);
      }
    });
    playlistCollection.delete(playlistUids[playlistIndex]);
    playlistUids[playlistIndex] = -1;
    chrome.storage.local.set({playlistUids:playlistUids}, function(){
      if(chrome.runtime.lastError){
        console.warn(chrome.runtime.lastError.message);
      }
    });
  }
  return returnStatus;
}

function addVideoToPlaylist(playlistIndex, videoId){
  var apiRequestRetVal = buildApiRequest("GET",
                                         "/youtube/v3/videos",
                                         {"id": videoId,
                                          "part": "snippet,contentDetails"});
  executeRequest(apiRequestRetVal, "videoInfo", function(videoInfo){
    playlistCollection.get(playlistUids[playlistIndex]).videos.push(videoInfo);
    var index = playlistCollection.get(playlistUids[playlistIndex]).videos.length - 1;
    var video = playlistCollection.get(playlistUids[playlistIndex]).videos[index];
    chrome.runtime.sendMessage({request: "finishedAddingVideo", video: video, index: index});
    var obj = {};
    obj[playlistUids[playlistIndex]] = playlistCollection.get(playlistUids[playlistIndex]);
    chrome.storage.local.set(obj, function(){
      if(chrome.runtime.lastError){
        console.warn(chrome.runtime.lastError.message);
      }
    });
  });
}

function deleteVideo(videoIndex, playlistIndex){
  
  if(playlistInfo.playingPlaylist == playlistInfo.viewingPlaylist){
    if(videoIndex == queue.playlist[queue.current].index &&
       queue.playlist.length == 2){
      if(queueHasNext()){
        queue.tempNext = true;
      }
      else if(queueHasPrev()){
        queue.tempPrev = true;
      }
    }
    var retStatus = deleteFromQueue(videoIndex);
  }
  
  playlistCollection.get(playlistUids[playlistIndex]).videos[videoIndex] = -1;
  var obj = {};
  obj[playlistUids[playlistIndex]] = playlistCollection.get(playlistUids[playlistIndex]);
  chrome.storage.local.set(obj, function(){
    if(chrome.runtime.lastError){
      console.warn(chrome.runtime.lastError.message);
    }
  });
}

function cleanVideoArray(playlistIndex){
  for(i = 0; i < playlistCollection.get(playlistUids[playlistIndex]).videos.length; i++){
    if(playlistCollection.get(playlistUids[playlistIndex]).videos[i] == -1){
      playlistCollection.get(playlistUids[playlistIndex]).videos.splice(i, 1);
      i--;
    }
  }
  
  var obj = {};
  obj[playlistUids[playlistIndex]] = playlistCollection.get(playlistUids[playlistIndex]);
  chrome.storage.local.set(obj, function(){
    if(chrome.runtime.lastError){
      console.warn(chrome.runtime.lastError.message);
    }
  });
}

function createResource(properties) {
  var resource = {};
  var normalizedProps = properties;
  for (var p in properties) {
    var value = properties[p];
    if (p && p.substr(-2, 2) == '[]') {
      var adjustedName = p.replace('[]', '');
      if (value) {
        normalizedProps[adjustedName] = value.split(',');
      }
      delete normalizedProps[p];
    }
  }
  for (var p in normalizedProps) {
    // Leave properties that don't have values out of inserted resource.
    if (normalizedProps.hasOwnProperty(p) && normalizedProps[p]) {
      var propArray = p.split('.');
      var ref = resource;
      for (var pa = 0; pa < propArray.length; pa++) {
        var key = propArray[pa];
        if (pa == propArray.length - 1) {
          ref[key] = normalizedProps[p];
        } else {
          ref = ref[key] = ref[key] || {};
        }
      }
    };
  }
  return resource;
}

function removeEmptyParams(params){
  for(var p in params){
    if(!params[p] || params[p] == "undefined"){
       delete params[p];
    }
  }
  return params;
}

function executeRequest(request, type, callback){
  request.execute(function(response){
    if(type == "videoInfo"){
      var videoInfo = response.items[0].snippet;
      var video = {videoId: response.items[0].id,
                   channelId: videoInfo.channelId,
                   channelTitle: videoInfo.channelTitle,
                   tags: videoInfo.tags,
                   videoTitle: videoInfo.title,
                   duration: response.items[0].contentDetails.duration};
      callback(video);
    }
    else{
      callback(response);
    }
  });
}

function buildApiRequest(requestMethod, path, params, properties){
  params = removeEmptyParams(params);
  var request;
  if(properties){
    var resource = createResource(properties);
    request = gapi.client.request({
      "body": resource,
      "method": requestMethod,
      "path": path,
      "params": params
    }); 
  }
  else{
    request = gapi.client.request({
      "method": requestMethod,
      "path": path,
      "params": params
    });
  }
  return request; 
}

function requestUserInfo(object, callback){
  gapi.auth.setToken({access_token: object.token});
  gapi.client.setApiKey("AIzaSyBGdafgREooeIB9WYU3B_0_-n6yvzLhyds"); 
  callback(buildApiRequest(
    "GET",
    "/youtube/v3/channels",
    {"mine": "true",
     "part": "snippet"
  }));
}

function requestPlaylists(callback){
  chrome.identity.getAuthToken({"interactive" : false}, function(token){
    gapi.auth.setToken({access_token: token});
    callback(buildApiRequest(
      "GET",
      "youtube/v3/playlists",
      {"mine": "true",
       "maxResults": "50",
       "part": "snippet,contentDetails",
       "onBehalfOfContentOwner" : "",
       "onBehalfOfContentOwnerChannel": ""}));
  });
}

function search(keywords, callback){
  gapi.client.setApiKey("AIzaSyBGdafgREooeIB9WYU3B_0_-n6yvzLhyds"); 
  executeRequest(buildApiRequest(
    "GET",
    "/youtube/v3/search",
    {"maxResults": "25",
     "part": "snippet",
     "q": keywords,
     "type": 'video'
  }), "", function(response){
    callback(response);
  });
}

function updateProfileIcon(icon){
  profileIcon = icon;
  chrome.storage.sync.set({"profileIcon" : icon}, undefined); 
}

function updateUsername(name){
  username = name;
  chrome.storage.sync.set({"username": name}, undefined);
}

function updateUserAccountStatus(status){
  accountStatus = status;
  chrome.storage.sync.set({"account" : status}, undefined);
}





function editVideo(newTitle, newArtist, videoIndex, playlistIndex){
  var playlist = playlistCollection.get(playlistUids[playlistIndex]);
  playlist.videos[videoIndex].videoTitle = newTitle;
  playlist.videos[videoIndex].channelTitle = newArtist;
  var obj = {};
  obj[playlistUids[playlistIndex]] = playlist;
  chrome.storage.local.set(obj, function(){
    if(chrome.runtime.lastError){
      console.log(chrome.runtime.lastError.message);
    }
  });
}

function firstInstallSetup(){
  gapi.load("client", undefined); 
  updateUserAccountStatus("pending");
}

function userSetup(){
  chrome.identity.getAuthToken({'interactive' : false}, function(token){
    gapi.load("client", undefined);
    if(chrome.runtime.lastError){
      profileIcon = "images/default_user.png";
      username = "user";
      updateUserAccountStatus("pending");
    }
    else{
      chrome.storage.sync.get("profileIcon", function(item){
        profileIcon = item.profileIcon;
      });
      chrome.storage.sync.get("username", function(item){
        username = item.username;
      })
      updateUserAccountStatus("true");
    }
  });
}

function onInstall(){
  
}

function onStart(){
  chrome.storage.sync.get("profileIcon", function(item){
    if(typeof item.profileIcon == "undefined"){
      updateProfileIcon(defaultIcon);
    }
    else{
      updateProfileIcon(item.profileIcon);
    }
  });
  chrome.storage.sync.get("username", function(item){
    if(typeof item.username == "undefined"){
      updateUsername("user");
    }
    else{
      updateUsername(item.username);
    }
  });
  chrome.storage.sync.get("account", function(item){
    if(typeof item.account == "undefined"){
      updateUserAccountStatus("pending");   
    }
    else{
      updateUserAccountStatus(item.account);
    }
  });
  chrome.storage.sync.get("repeat", function(item){
    repeatOn = item.repeat;
  });
  chrome.storage.sync.get("shuffle", function(item){
    shuffleOn = item.shuffle;
  });
  chrome.storage.sync.get("volume", function(item){
    if(typeof item.volume == "undefined"){
      volume = {"volume": 25, "mute": false};
    }
    else{
      volume = {"volume": item.volume.volume, "mute": item.volume.mute};
    }
  });
  chrome.storage.sync.get("quality", function(item){
    if(typeof item.quality == "undefined"){
      quality = "default";
    }
    else{
      quality = item.quality;
    }
  });
  
  chrome.storage.local.get("playlistUids", function(item){
    if(typeof item.playlistUids == "undefined"){
      playlistUids = [];
    }
    else{
      playlistUids = item.playlistUids;
      
      for(i = playlistUids.length - 1; i >= 0; i--){
        if(playlistUids[i] == -1){
          playlistUids.splice(i, 1);
        }
      }
      
      var tempUids = playlistUids.slice();
      for(i = 0; i < playlistUids.length; i++){
        chrome.storage.local.get(playlistUids[i], function(playlist){
          if(chrome.runtime.lastError){
            console.warn("playlist could not be loaded");
          }
          else{
            var uid;
            var counter = 0;
            while(!playlist.hasOwnProperty(tempUids[counter])){
              counter++;
            }
            playlistCollection.set(tempUids[counter], playlist[tempUids[counter]]);
            tempUids.splice(counter, 1);
          }
        });
      }
    }
  });
}

function resetAccount(){
  chrome.storage.local.clear(function(){
    var error = chrome.runtime.lastError;
    if(error){
      console.log(error.message);
    }
  });
  chrome.storage.sync.clear(function(){
    var error = chrome.runtime.lastError;
    if(error){
      console.log(error.message);
    }
  });
}

chrome.runtime.onStartup.addListener(function(){
  //userSetup();
  onStart();
});

chrome.runtime.onInstalled.addListener(function(details){
  if(details.reason == "install"){
    //firstInstallSetup();
    onStart();
  }
  else if(details.reason == "update"){
    //userSetup();
    /*var obj = {"volume": 25, "mute": false};
    chrome.storage.sync.set({"volume": obj}, function(){
      onStart();
    });*/
    onStart();
    //resetAccount();
  }
});

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse){
  if(message.request == "backgroundPlayerStatus"){
    
  }
});

chrome.runtime.onConnect.addListener(function(port){
  popupOpen = true;
  gapi.load("client", function(){
    gapi.client.setApiKey("AIzaSyBGdafgREooeIB9WYU3B_0_-n6yvzLhyds"); 
  });
  
  port.onDisconnect.addListener(function(){
    popupOpen = false;
    
    if(playlistUids.length != playlistCollection.size){
      for(i = playlistUids.length - 1; i >= 0; i--){
        if(playlistUids[i] == -1){
          playlistUids.splice(i, 1);
        }
      }
    }
  });
});

function setCurrPlaylistPage(playlistNum){
  playlistInfo.viewingPlaylist = playlistNum;
}

function setPlayingPlaylist(playlistNum){
  playlistInfo.playingPlaylist = playlistNum;
}

function setRepeat(status){
  repeatOn = status;
  chrome.storage.sync.set({"repeat" : status}, undefined);
}

function setShuffle(status){
  shuffleOn = status;
  chrome.storage.sync.set({"shuffle": status}, undefined);
}

function setVolume(vol){
  volume = vol;
  if(vol.mute){
    player.setVolume(0);
  }
  else{
    player.setVolume(vol.volume);
  }
  chrome.storage.sync.set({"volume": vol}, undefined);
}

function getPlaylistImage(playlistIndex, type){
  if(!getPlaylistUsingDefaultImage(playlistIndex)){
    return playlistCollection.get(playlistUids[playlistIndex]).image;
  }
  
  var videos = playlistCollection.get(playlistUids[playlistIndex]).videos;
  var firstAvailableIndex = -1;

  for(i = 0; i < videos.length; i++){
    if(videos[i] != -1){
      firstAvailableIndex = i;
    }
  }
  
  if(firstAvailableIndex != -1){
    if(type == 1){
      return "https://img.youtube.com/vi/"+videos[firstAvailableIndex].videoId+"/sddefault.jpg";
    }
    else if(type == 0){
      return "https://img.youtube.com/vi/"+videos[firstAvailableIndex].videoId+"/mqdefault.jpg";
    }
    else{
      return "https://img.youtube.com/vi/"+videos[firstAvailableIndex].videoId+"/default.jpg";
    }
  }
  else{
    return "images/default_playlist_img.png";
  }
}

function getPlaylistUsingDefaultImage(playlistIndex){
  return playlistCollection.get(playlistUids[playlistIndex]).usingDefaultImage;
}

function getPlaylistLength(playlistIndex){
  var videos = playlistCollection.get(playlistUids[playlistIndex]).videos;
  var length = videos.length;
  
  for(i = 0; i < length; i++){
    if(videos[i] == -1){
      length--;
    }
  }
  
  return length;
}

function getPlaylist(playlistIndex){
  return playlistCollection.get(playlistUids[playlistIndex]);
}

function setQuality(qual){
  quality = qual;
  chrome.storage.sync.set({"quality":qual},undefined);
}

function getQueue(){
  return queue;
}

function getQueueLength(){
  return queue.playlist.length;
}

function getCurrVideo(){
  if(queue.playlist.length == 0){
    return undefined;
  }
  return queue.playlist[queue.current].video;
}

function getCurrVideoIndex(){
  if(queue.playlist.length == 0){
    return undefined;
  }
  return queue.playlist[queue.current].index;
}

function getCurrVideoId(){
  if(queue.playlist.length == 0){
    return undefined;
  }
  return queue.playlist[queue.current].video.videoId;
}

function getPlaylistInfo(){
  return playlistInfo;
}

function getCurrentTime(){
  return player.getCurrentTime();
}

function getVolume(){
  return volume;
}

/**
 * Returns info depending on the data.id given
 */
function getInfo(data){
  if(data.id == "profileIcon"){
    return profileIcon;
  }
  else if(data.id == "username"){
    return username;
  }
  else if(data.id == "accountStatus"){
    return accountStatus;
  }
  else if(data.id == "playlistCount"){
    //return playlistCollection.length;
    return playlistCollection.size;
  }
  else if(data.id == "playlistCollection"){
    var tempArr = [];
    
    for(i = 0; i < playlistUids.length; i++){
      if(playlistUids[i] != -1){
        tempArr.push(playlistCollection.get(playlistUids[i]));
      }
    }
    return tempArr;
  }
  else if(data.id == "playlist"){
    if(data.playlistNumber >= 0 && data.playlistNumber < playlistUids.length){
      //return playlistCollection[data.playlistNumber];
      return playlistCollection.get(playlistUids[data.playlistNumber]);
    }
    else{
      console.error("getInfo() with id playlist given invalid playlist number " + data.playlistNumber);
      return "undefined";
    }
  }
  else if(data.id == "playerState"){
    return player.getPlayerState();
  }
  else if(data.id == "currVideoId"){
    if(player.getPlayerState() >= 0 && player.getPlayerState() < 5){
      if(typeof playlistBeingPlayed == "undefined" || typeof videoBeingPlayed == "undefined"){
        return undefined;
      }
      return playlistCollection.get(playlistUids[playlistBeingPlayed]).videos[orderToPlayVideos[videoBeingPlayed]].videoId;
    }    
    return undefined;
  }
  else if(data.id == "currVideoBeingPlayed"){
    if(player.getPlayerState() >= 0 && typeof videoBeingPlayed != "undefined"){
      //return playlistCollection[playlistBeingPlayed].videos[orderToPlayVideos[videoBeingPlayed]];
      return playlistCollection.get(playlistUids[playlistBeingPlayed]).videos[orderToPlayVideos[videoBeingPlayed]];
    } 
    
    return undefined;
  }
  else if(data.id == "video"){
    //return playlistCollection[data.playlistNumber].videos[data.videoNumber];
    return playlistCollection.get(playlistUids[data.playlistNumber]).videos[data.videoNumber];
  }
  else if(data.id == "repeatStatus"){
    if(typeof repeatOn == "undefined"){
      return false;
    }
    return repeatOn;
  }
  else if(data.id == "shuffleStatus"){
    if(typeof shuffleOn == "undefined"){
      return false;
    }
    return shuffleOn;
  }
  else if(data.id == "order"){
    return orderToPlayVideos;
  }
  else if(data.id == "quality"){
    return quality;
  }
  else{
    console.error("Stupid developer can't spell correctly and made a bug: " + data.id);
  }
}