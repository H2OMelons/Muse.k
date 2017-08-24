var popupOpen;

var defaultIcon = "images/default_user.png"
var playlistCollection;
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

var repeatOn;
var shuffleOn;

var orderToPlayVideos = [];

var tag = document.createElement('script');

tag.src = "https://www.youtube.com/iframe_api";
var firstScriptTag = document.getElementsByTagName('script')[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

var player;
function onYouTubeIframeAPIReady() {
  player = new YT.Player('player', {
    events: {
      'onReady': onBackgroundPlayerReady,
      'onStateChange': onPlayerStateChange,
      'onPlaybackQualityChange': onPlaybackQualityChange
    }
  });
}

function onPlaybackQualityChange(data){
  
}

function createVideo(id){
  backgroundPlayerStatus = "waitingForSync";
  player.loadVideoById(id, 0, "small");
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

function getCurrentTime(){
  return player.getCurrentTime();
}

function getVolume(){
  return player.getVolume();
}

function shufflePlaylist(startingVideo, playlistIndex){
  var startingVideoIndex = startingVideo;
  // If shuffle is on, then fill an array with all possible video indexes
  // Then randomly choose an index and append it to the playing order
  if(shuffleOn){
    var tempArr = [];
    orderToPlayVideos = [];
    for(i = 0; i < playlistCollection[playlistIndex].videos.length; i++){
      tempArr.push(i);
    }
    while(tempArr.length > 0){
      var randomIndex = Math.floor(Math.random() * tempArr.length);
      orderToPlayVideos.push(tempArr[randomIndex]);
      if(tempArr[randomIndex] == startingVideo){
        orderToPlayVideos[orderToPlayVideos.length - 1] = orderToPlayVideos[0];
        orderToPlayVideos[0] = startingVideo;
      }
      tempArr.splice(randomIndex, 1);
    }
  }
  // If shuffle is off then set playing order to be sequential
  else{
    orderToPlayVideos = [];
    for(i = 0; i < playlistCollection[playlistIndex].videos.length; i++){
      orderToPlayVideos.push(i);
    }
  }
}

function onBackgroundPlayerReady(event){
  backgroundPlayerStatus = "waitingForSync";
  
  chrome.storage.sync.get("volume", function(item){
    if(typeof item.volume == "undefined"){
      volume = 25;
    }
    else{
      volume = item.volume;
    }
    player.setVolume(volume);
  });
}

function onPlayerStateChange(event) {
  videoIsPlaying = false;
  if (event.data == YT.PlayerState.PLAYING) {
    if(backgroundPlayerStatus == "waitingForSync"){
      player.pauseVideo();
      player.seekTo(0);
      //backgroundPlayerStatus = "ready";
      chrome.runtime.sendMessage({request: "finishedLoading"});
    }
    else if(backgroundPlayerStatus == "ready"){
      videoIsPlaying = true; 
    }
    else if(backgroundPlayerStatus == "pausedByBackgroundPlayer"){
      //player.playVideo();
      //chrome.runtime.sendMessage({request: "play"});
    }
    else if(backgroundPlayerStatus == "pausedByPagePlayer"){
      //player.pauseVideo();
    }
  }
  else if(event.data == YT.PlayerState.BUFFERING){
    if(backgroundPlayerStatus == "ready"){
      //backgroundPlayerStatus = "pausedByBackgroundPlayer";
      //chrome.runtime.sendMessage({request: "pause"}); 
    }
  }
  else if(event.data == YT.PlayerState.ENDED){
    fastForward();
  }
  else if(event.data == YT.PlayerState.CUED){

  }
}

function fastForward(){
  // If need to go to next song and not at the end of the playlist
  if(videoBeingPlayed < (playlistCollection[playlistBeingPlayed].videos.length - 1)){
    videoBeingPlayed++;
    if(popupOpen){
      chrome.runtime.sendMessage({request:"playNextVideo", videoIndex:videoBeingPlayed, playlistIndex:playlistBeingPlayed});
    }
    else{
      var prevVideoId = playlistCollection[playlistBeingPlayed].videos[orderToPlayVideos[videoBeingPlayed - 1]].videoId;
      var currVideoId = playlistCollection[playlistBeingPlayed].videos[orderToPlayVideos[videoBeingPlayed]].videoId;
      if(prevVideoId != currVideoId){
        player.loadVideoById(currVideoId, 0, "small");
      }
      else{
        player.playVideo();
      }
    }
  }
  // If need to go to next song but at the end of the playlist with repeat on and the song has not ended
  else if(videoBeingPlayed == (playlistCollection[playlistBeingPlayed].videos.length - 1) &&
          player.getPlayerState() != YT.PlayerState.ENDED &&
          player.getPlayerState() >= 0 &&
          repeatOn){
    videoBeingPlayed = 0;
    if(popupOpen){
      chrome.runtime.sendMessage({request:"playNextVideo", videoIndex:videoBeingPlayed, playlistIndex:playlistBeingPlayed});
    }
    else{
      //console.log("If need to go to the next song but at the end of the playlist with repeat on and the song has not ended error");
    }
  }
  // If need to go to the next song but at the end of the playlist with repeat off and the song has ended
  else if(videoBeingPlayed == (playlistCollection[playlistBeingPlayed].videos.length - 1) &&
          player.getPlayerState() == YT.PlayerState.ENDED &&
          !repeatOn){
    if(popupOpen){
      chrome.runtime.sendMessage({request:"playlistEnded"});
    }
    else{
      //console.log("If need to go to the next song but at the end of the playlist with repeat off and the song has ended error");
    }
  }
  // If need to go to the next song but at the end of the playlist with repeat on and the song has ended
  else if(videoBeingPlayed == (playlistCollection[playlistBeingPlayed].videos.length - 1) &&
          player.getPlayerState() == YT.PlayerState.ENDED &&
          repeatOn){
    if(popupOpen){
      videoBeingPlayed = 0;
      chrome.runtime.sendMessage({request:"playNextVideo", videoIndex:videoBeingPlayed, playlistIndex:playlistBeingPlayed});
    }
    else{
      var prevVideoId = playlistCollection[playlistBeingPlayed].videos[orderToPlayVideos[videoBeingPlayed]].videoId;
      videoBeingPlayed = 0;
      var currVideoId = playlistCollection[playlistBeingPlayed].videos[orderToPlayVideos[videoBeingPlayed]].videoId;
      if(prevVideoId != currVideoId){
        player.loadVideoById(currVideoId, 0, "small");
      }
      else{
        player.playVideo();
      }
    }
  }
  else{
    //console.log(repeatOn);
  }
}

function rewind(){
  if(videoBeingPlayed < (playlistCollection[playlistBeingPlayed].videos.length) &&
     videoBeingPlayed > 0){
    videoBeingPlayed--;
    chrome.runtime.sendMessage({request:"playPrevVideo", videoIndex:videoBeingPlayed, playlistIndex:playlistBeingPlayed});
  }
}

function setCurrPlaylistPage(playlistNum){
  currPlaylistPage = playlistNum;
}

function setCurrVideoBeingPlayed(videoNum, playlistNum, callback){
  videoBeingPlayed = videoNum;
  playlistBeingPlayed = playlistNum;
  //chrome.runtime.sendMessage({request:"setControlImage", id:playlistCollection[playlistNum].videos[videoNum].videoId});
  if(callback){
    callback();
  }
}

function updateCurrPlaylist(playlist){
  playlistCollection[playlistBeingPlayed] = playlist;
  chrome.storage.local.set({"playlistCollection": playlistCollection}, undefined);
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
    return playlistCollection.length;
  }
  else if(data.id == "playlistCollection"){
    return playlistCollection;
  }
  else if(data.id == "playlist"){
    if(data.playlistNumber >= 0 && data.playlistNumber < playlistCollection.length){
      return playlistCollection[data.playlistNumber]
    }
    else{
      console.error("getInfo() with id playlist given invalid playlist number " + data.playlistNumber);
      return "undefined";
    }
  }
  else if(data.id == "playerState"){
    return player.getPlayerState();
  }
  else if(data.id == "displayIframe"){
    if(playlistCollection[currPlaylistPage].videos.length == 0){
      return false;   
    }
    if(typeof videoBeingPlayed != "undefined" && typeof playlistBeingPlayed != "undefined" && typeof currPlaylistPage != "undefined"){
      if(currPlaylistPage == playlistBeingPlayed){
        if(player.getPlayerState() >= 0 && player.getPlayerState() < 5){
          return true;
        }
        return false;
      }
      return false;
    }
    else{
      return false;
    }
  }
  else if(data.id == "currVideoId"){
    if(player.getPlayerState() >= 0 && player.getPlayerState() < 5){
      if(typeof playlistBeingPlayed == "undefined" || typeof videoBeingPlayed == "undefined"){
        return undefined;
      }
      return playlistCollection[playlistBeingPlayed].videos[orderToPlayVideos[videoBeingPlayed]].videoId; 
    }    
    return undefined;
  }
  else if(data.id == "currVideoBeingPlayed"){
    if(player.getPlayerState() >= 0 && typeof videoBeingPlayed != "undefined"){
      return playlistCollection[playlistBeingPlayed].videos[orderToPlayVideos[videoBeingPlayed]];
    } 
    
    return undefined;
  }
  else if(data.id == "video"){
    return playlistCollection[data.playlistNumber].videos[data.videoNumber];
  }
  else if(data.id == "currVideoInfo"){
    if(typeof videoBeingPlayed == "undefined" || typeof playlistBeingPlayed == "undefined"){
      return undefined;
    }
    return {videoIndex: orderToPlayVideos[videoBeingPlayed], playlistIndex: playlistBeingPlayed}
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
  player.setVolume(vol);
  chrome.storage.sync.set({"volume":volume}, undefined);
}

function setQuality(qual){
  quality = qual;
  chrome.storage.sync.set({"quality":qual},undefined);
}

function resetPlaylistCount(){
  playlistCollection = [];
  chrome.storage.sync.set({"playlistCollection": playlistCollection}, undefined);
}

function addPlaylist(playlist){
  playlistCollection.push(playlist);
  chrome.storage.local.set({"playlistCollection": playlistCollection}, undefined);
}

function deletePlaylist(deletePlaylistNum){
  if((typeof deletePlaylistNum != "undefined" && typeof playlistCollection != "undefined") 
     && ((deletePlaylistNum >= 0) && (deletePlaylistNum < playlistCollection.length))){
    playlistCollection.splice(deletePlaylistNum, 1);
    if(deletePlaylistNum == playlistBeingPlayed){
      player.stopVideo();
      currPlaylistPage = undefined;
      videoBeingPlayed = undefined;
      playlistBeingPlayed = undefined;
      chrome.storage.local.set({"playlistCollection": playlistCollection},undefined);
      return 0;
    }
    
    chrome.storage.local.set({"playlistCollection": playlistCollection},undefined);
    return 1;
  }
  else{
    return -1;
  }
}

function addVideoToPlaylist(playlistNum, videoId){
  var apiRequestRetVal = buildApiRequest("GET",
                                         "/youtube/v3/videos",
                                         {"id": videoId,
                                          "part": "snippet,contentDetails"});
  executeRequest(apiRequestRetVal, "videoInfo", function(videoInfo){
    playlistCollection[playlistNum].videos.push(videoInfo);
    var index = playlistCollection[playlistNum].videos.length - 1;
    var video = playlistCollection[playlistNum].videos[index];
    chrome.runtime.sendMessage({request: "finishedAddingVideo", video: video, index: index});
    chrome.storage.local.set({"playlistCollection": playlistCollection}, undefined);
  });
}

function deleteVideo(videoIndex, playlistIndex){
  var removedElem = playlistCollection[playlistIndex].videos.splice(videoIndex, 1);
  chrome.storage.local.set({"playlistCollection": playlistCollection},undefined);
}

function editVideo(newTitle, newArtist, videoIndex, playlistIndex){
  playlistCollection[playlistIndex].videos[videoIndex].videoTitle = newTitle;
  playlistCollection[playlistIndex].videos[videoIndex].channelTitle = newArtist;
  chrome.storage.local.set({"playlistCollection": playlistCollection},undefined);
}

function updateTags(start){
  for(i = start; i < playlistCollection.length; i++){
    playlistCollection[i].tag = "Playlist " + i + ":" + playlistCollection[i].name;
  }
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
      volume = 25;
    }
    else{
      volume = item.volume;
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
  chrome.storage.local.get("playlistCollection", function(item){
    if(typeof item.playlistCollection == "undefined"){
      playlistCollection = []; 
    }
    else{
      playlistCollection = item.playlistCollection;
    }
  });
}

function resetAccount(){
  chrome.storage.local.clear(function(){
    var error = chrome.runtime.lastError;
    if(error){
      console.log(error);
    }
    else{
      console.log("sync clear success");
    }
  });
  chrome.storage.sync.clear(function(){
    var error = chrome.runtime.lastError;
    if(error){
      console.log(error);
    }
    else{
      console.log("sync clear success");
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
    player.unMute();
  });
});