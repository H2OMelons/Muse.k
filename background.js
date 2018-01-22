var popupOpen;
var online = navigator.onLine;

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

var currCycle = 0;

var backgroundPlayerStatus;

var videoIsPlaying = false;
var currPlaylistPage = undefined;
var videoBeingPlayed = undefined;
var playlistBeingPlayed = undefined;

var repeatOn;
var shuffleOn;
var seeking = false;

var orderToPlayVideos = [];
var playlistUids = [];

var queue = {playlist: [],
             totalVideos: 0,
             current: 0,
             startIndex: 0,
             tempNext: false,
             tempPrev: false};

var tag;
var firstScriptTag;



function loadIframeAPI(){
  tag = document.createElement('script');
  tag.src = "https://www.youtube.com/iframe_api";
  firstScriptTag = document.getElementsByTagName('script')[0];
  firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
}

var playlistCollectionManager;

var videoPlayerManager = new VideoPlayerManager();



var player;

function onYouTubeIframeAPIReady() {
  player = new YT.Player('player', {
    playerVars:{
      "enablejsapi": 1
    },
    events: {
      'onReady': onBackgroundPlayerReady,
      'onStateChange': onPlayerStateChange
    }
  });
}

function onBackgroundPlayerReady(event){
  chrome.storage.sync.get("volume", function(item){
    if(typeof item.volume == "undefined"){
      volume = {"volume": 25, "mute": false};
    }
    else{
      volume = item.volume;
    }
    player.setVolume(volume.volume);
  });
  
  videoPlayerManager.setBackgroundVideoPlayer(new VideoPlayer(player));
}

var testForRestrictedVideo = [5, -1, 3, -1];
var testForPlayable = [];
var startTestForPlayable = false;
var numInARow = 0;

function onPlayerStateChange(event) {
  var backgroundPlayer = videoPlayerManager.getBackgroundVideoPlayer();
  if(navigator.onLine){
    if(startTestForPlayable){
      testForPlayable.push(event.data);
    }
    if(event.data == testForRestrictedVideo[numInARow]){
      // Video is restricted so fast forward to the next song
      if(numInARow == testForRestrictedVideo.length - 1){
        startTestForPlayable = true;
        setTimeout(function(){
          // If testForPlayable is empty then that means that the video is not playable
          if(testForPlayable.length == 0){
            if(popupOpen && currCycle < videoPlayerManager.getQueue().length){
              currCycle++;
              chrome.runtime.sendMessage({request: "videoNotPlayablePopup", 
                                          video: videoPlayerManager.getVideoBeingPlayed(),
                                          id: videoPlayerManager.getCurrPlayButtonId(),
                                          remove: playlistCollectionManager.getViewingPlaylistUid() == 
                                                  playlistCollectionManager.getPlayingPlaylistUid()});
            }
            if(currCycle < videoPlayerManager.getQueue().length){
              videoPlayerManager.fastForward();
            }
            else{
              videoPlayerManager.pauseVideo();
              chrome.runtime.sendMessage({request: "playlistEnded"});
              currCycle = 0;
            }
          }
          else{
            testForPlayable = [];
          }
          startTestForPlayable = false;
          numInARow = 0;
        }, 250);
      }
      else{
        numInARow++;
      }
    }
    else if(numInARow != 0){
      numInARow = 0;
    }
  }
  
  if(backgroundPlayer.stopped){
    return;
  }
  
  if(event.data == -1){
    
  }
  else if(event.data == YT.PlayerState.PLAYING){
    if(videoPlayerManager.fastForwarding){
      videoPlayerManager.fastForwarding = false;
    }
  }
  else if(event.data == YT.PlayerState.PAUSED){
    
  }
  else if(event.data == YT.PlayerState.BUFFERING){
    
  }
  else if(event.data == YT.PlayerState.CUED){
    backgroundPlayer.play();
  }
  else if(event.data == YT.PlayerState.ENDED){
    if(!videoPlayerManager.fastForwarding && !seeking){
      videoPlayerManager.fastForward();
      videoPlayerManager.fastForwarding = true;
    }
  }
  seeking = false;
}

function createVideo(videoId, callback){
  var apiRequestRetVal = buildApiRequest("GET",
                                         "/youtube/v3/videos",
                                         {"id": videoId,
                                          "part": "snippet,contentDetails,status"});
  executeRequest(apiRequestRetVal, "videoInfo", function(videoInfo){
    if(callback){
      callback(videoInfo);
    }
  });
}

function cleanVideoArrayByUid(uid){
  var playlist = playlistCollectionManager.getPlaylist(uid);
  var playlistLength = playlist.videos.length;
  for(i = 0; i < playlistLength; i++){
    if(playlist.videos[i] == -1){
      playlist.videos.splice(i, 1);
      i--;
    }
  }
  
  var obj = {};
  obj[uid] = playlistCollectionManager.getPlaylist(uid);
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
      if(typeof response.items[0] != "undefined"){
        var videoInfo = response.items[0].snippet;
        var video = {videoId: response.items[0].id,
                     channelId: videoInfo.channelId,
                     channelTitle: videoInfo.channelTitle,
                     tags: videoInfo.tags,
                     videoTitle: videoInfo.title,
                     duration: response.items[0].contentDetails.duration,
                     status: response.items[0].status};
        if(callback){
          callback(video);
        }
      }
      else{
        callback(undefined);
      }
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

function requestPlaylists(callback){
  chrome.identity.getAuthToken({"interactive" : false}, function(token){
    
    if(chrome.runtime.lastError){
      callback(undefined);
    }
    else{
      gapi.auth.setToken({access_token: token});
      executeRequest(buildApiRequest(
        "GET",
        "/youtube/v3/playlists",
        {"mine": "true",
         "maxResults": "50",
         "part": "snippet,contentDetails",
         "onBehalfOfContentOwner" : "",
         "onBehalfOfContentOwnerChannel": ""
        }
      ), "", function(response){
        callback(response);
      });
    }
  });
}

function retrieveFullPlaylist(id, callback){
  var videos = [];
  
  function getPlaylist(nextPageToken){
    executeRequest(buildApiRequest(
      "GET",
      "/youtube/v3/playlistItems",
      {
        "maxResults": "50",
        "pageToken": nextPageToken,
        "part": "snippet,contentDetails",
        "playlistId": id
      }
    ), "", function(response){
      for(i = 0; i < response.items.length; i++){
        videos.push(response.items[i]);
      }
      
      if(response.nextPageToken){
        getPlaylist(response.nextPageToken);
      }
      else{
        callback(videos);
      }
    });  
  } 
  
  getPlaylist(undefined);
}

function getPlaylistById(id, callback){
  executeRequest(buildApiRequest(
    "GET",
    "/youtube/v3/playlistItems",
    {
      "maxResults": "50",
      "part": "snippet,contentDetails",
      "playlistId": id
    }
  ), "", function(response){
    callback(response);
  });
}

function getPlaylistByIdNextPage(id, nextPageToken, callback){
  executeRequest(buildApiRequest(
    "GET",
    "/youtube/v3/playlistItems",
    {
      "maxResults": "50",
      "pageToken": nextPageToken,
      "part": "snippet,contentDetails",
      "playlistId": id
    }
  ), "", function(response){
    callback(response);
  });
}

function search(keywords, callback){
  executeRequest(buildApiRequest(
    "GET",
    "/youtube/v3/search",
    {"maxResults": "25",
     "part": "snippet",
     "q": keywords,
     "type": 'video'
    }
  ), "", function(response){
    callback(response);
  });
}

function editVideoByUid(newTitle, newArtist, videoIndex, uid, startMin, startSec, endMin, endSec){
  
  if(typeof uid == "number"){
    uid = uid.toString();
  }
  
  var playlist = playlistCollectionManager.getPlaylist(uid);
  var video = playlist.videos[videoIndex];
  video.videoTitle = newTitle;
  video.channelTitle = newArtist;
  
  var start = video.duration.indexOf("PT") + 2;
  var end = video.duration.indexOf("M");
  var min = parseInt(video.duration.slice(start, end));
  var sec = parseInt(video.duration.slice(end + 1, video.duration.indexOf("S")));
  
  if(startMin >= min){
    startMin = min;
    if(startSec > sec){
      startSec = sec;
    }
  }
  
  if(endMin >= min){
    endMin = min;
    if(endSec > sec){
      endSec = sec;
    }
  }
  
  video.startTime = (startMin * 60) + startSec;
  video.endTime = (endMin * 60) + endSec;
  
  var obj = {};
  obj[uid] = playlist;
  chrome.storage.local.set(obj, function(){
    if(chrome.runtime.lastError){
      console.error(chrome.runtime.lastError.message);
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
  });
}

function onInstall(){
  
}

function onStart(){
  loadIframeAPI();
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
      
      var numPlaylistsLoaded = 0;
      var numLoadErrors = 0;
      var playlistCollection = new Map();
      for(i = 0; i < playlistUids.length; i++){
        chrome.storage.local.get(playlistUids[i], function(playlist){
          if(chrome.runtime.lastError){
            numLoadErrors++;
            console.warn("playlist could not be loaded");
          }
          else{
            numPlaylistsLoaded++;
            var uid = Object.keys(playlist)[0];
            playlistCollection.set(uid, playlist[uid]);
          }
          if(numPlaylistsLoaded + numLoadErrors == playlistUids.length){
            playlistCollectionManager = new PlaylistCollectionManager(playlistCollection);
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
      console.error(error.message);
    }
  });
  chrome.storage.sync.clear(function(){
    var error = chrome.runtime.lastError;
    if(error){
      console.error(error.message);
    }
  });
}

chrome.runtime.onStartup.addListener(function(){
  onStart();
});

chrome.runtime.onInstalled.addListener(function(details){
  if(details.reason == "install"){
    onStart();
  }
  else if(details.reason == "update"){
    
    
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
    gapi.client.setApiKey("AIzaSyBwpCPpLRdifG4iv5kKRDqVpQbANJgzAMI"); 
  });
  
  port.onDisconnect.addListener(function(){
    popupOpen = false;
  });
});

function setRepeat(status){
  repeatOn = status;
  chrome.storage.sync.set({"repeat" : status}, undefined);
}

function setShuffle(status){
  shuffleOn = status;
  chrome.storage.sync.set({"shuffle": status}, undefined);
}

function saveToLocal(obj, callback){
  chrome.storage.local.set(obj, callback);
}

function loadFromLocal(name, callback){
  chrome.storage.local.get(name, function(item){
    if(callback){
      callback(item);
    }
  });
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

function setToken(token){
  gapi.client.setToken(token);
}

function getPlaylistImageByUid(uid, type){
  
  if(typeof uid == "number"){
    uid = uid.toString();
  }
  
  if(!playlistCollectionManager.getPlaylist(uid).usingDefaultImage){
    return playlistCollectionManager.getPlaylist(uid).image; 
  }
  
  var videos = playlistCollectionManager.getPlaylist(uid).videos;
  var firstAvailableIndex = -1;
  
  for(i = 0; i < videos.length; i++){
    if(videos[i] != -1){
      firstAvailableIndex = i;
      i = videos.length;
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

function getPlaylistUsingDefaultImageByUid(uid, type){
  return playlistCollectionManager.getPlaylist(uid).usingDefaultImage;
}

function getPlaylistCollectionManager(){
  return playlistCollectionManager;
}

function getVideoPlayerManager(){
  return videoPlayerManager;
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

function getNumVideosByUid(uid){
  
  if(typeof uid == "name"){
    uid = uid.toString();
  }
  
  var playlist = playlistCollectionManager.getPlaylist(uid);
  if(typeof playlist == "undefined" || typeof playlist.videos == "undefined"){
    return -1;
  }
  
  var numVideos = 0;
  for(i = 0; i < playlist.videos.length; i++){
    if(playlist.videos[i] != -1){
      numVideos++;
    }
  }
  return numVideos;
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
  var video = videoPlayerManager.getVideoBeingPlayed();
  if(typeof video == "undefined"){
    return undefined;
  }
  return video.videoId;
}

function getCurrentTime(){
  return player.getCurrentTime();
}

function getVolume(){
  return volume;
}

function getVideoByUid(uid, videoIndex){
  return playlistCollectionManager.getPlaylist(uid).videos[videoIndex];
}

/**
 * Returns info depending on the data.id given
 */
function getInfo(data){
  if(data.id == "repeatStatus"){
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

window.addEventListener('online', function(){
  online = navigator.onLine;
  loadIframeAPI();
  if(popupOpen){
    chrome.runtime.sendMessage({request: "network_status",
                                status: online});
  }
});

window.addEventListener('offline', function(){
  online = navigator.online;
  
  if(popupOpen){
    chrome.runtime.sendMessage({request: "network_status",
                                status: online});
    chrome.runtime.sendMessage({request: "error_popup",
                                error: "You are not connected to the internet"});
  }
  
});