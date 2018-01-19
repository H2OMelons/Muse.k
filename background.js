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
function PlaylistCollectionManager(playlistCollection){
  this.playlistManagers = new Map();
  this.createPlaylistCollection(playlistCollection);
  this.editingPlaylistUid = undefined;
  this.playingPlaylistUid = undefined;  
  this.viewingPlaylistUid = undefined;
}

PlaylistCollectionManager.prototype.setEditingPlaylistUid = function(uid){
  this.editingPlaylistUid = uid;
}

PlaylistCollectionManager.prototype.getEditingPlaylistUid = function(){
  return this.editingPlaylistUid;
}

PlaylistCollectionManager.prototype.getEditingPlaylist = function(){
  return this.getPlaylist(this.getEditingPlaylistUid());
}

PlaylistCollectionManager.prototype.setPlayingPlaylistUid = function(uid){
  this.playingPlaylistUid = uid;
}

PlaylistCollectionManager.prototype.getPlayingPlaylistUid = function(){
  return this.playingPlaylistUid;
}

PlaylistCollectionManager.prototype.getPlayingPlaylist = function(){
  return this.getPlaylist(this.getPlayingPlaylistUid());
}

PlaylistCollectionManager.prototype.getPlayingManager = function(){
  return this.playlistManagers.get(this.getPlayingPlaylistUid());
}

PlaylistCollectionManager.prototype.setViewingPlaylistUid = function(uid){
  this.viewingPlaylistUid = uid;
}

PlaylistCollectionManager.prototype.getViewingPlaylistUid = function(uid){
  return this.viewingPlaylistUid;
}

PlaylistCollectionManager.prototype.getViewingPlaylist = function(){
  return this.getPlaylist(this.getViewingPlaylistUid());
}

PlaylistCollectionManager.prototype.getViewingManager = function(){
  return this.playlistManagers.get(this.getViewingPlaylistUid());
}

PlaylistCollectionManager.prototype.createPlaylistCollection = function(playlistCollection){
  var tempThis = this;
  playlistCollection.forEach(function(value, key){
    tempThis.playlistManagers.set(key, new PlaylistManager(value));
  });
}

PlaylistCollectionManager.prototype.editPlaylist = function(playlist){
  this.playlistManagers.get(playlist.uid).editPlaylist(playlist);
}

PlaylistCollectionManager.prototype.editViewingPlaylist = function(name){
  var playlist = this.getViewingPlaylist();
  if(playlist.name != name){
    playlist.name = name;
    this.playlistManagers.get(playlist.uid).editPlaylist(playlist);
  }
}

PlaylistCollectionManager.prototype.deletePlaylist = function(){
  this.deletePlaylistByUid(this.editingPlaylistUid);
}

PlaylistCollectionManager.prototype.deletePlaylistByUid = function(uid){
  if(this.viewingPlaylistUid == this.editingPlaylistUid){
    this.viewingPlaylistUid = undefined;
  }
  if(this.editingPlaylistUid == this.playingPlaylistUid){
    this.playingPlaylistUid = undefined;
  }
  this.editingPlaylistUid = undefined;
  this.playlistManagers.delete(uid);
  var playlistUids = Array.from(this.playlistManagers.keys());
  chrome.storage.local.remove(uid, function(){
      if(chrome.runtime.lastError){
        console.warn(chrome.runtime.lastError.message);
      }
    });
    
    // Update the list of uids in local storage
    chrome.storage.local.set({playlistUids:playlistUids}, function(){
      if(chrome.runtime.lastError){
        console.warn(chrome.runtime.lastError.message);
      }
    });
}

PlaylistCollectionManager.prototype.insertPlaylist = function(playlist){
  this.playlistManagers.set(playlist.uid, new PlaylistManager(playlist));
  var playlistUids = Array.from(this.playlistManagers.keys());
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

PlaylistCollectionManager.prototype.editVideo = function(video){
  this.playlistManagers.get(this.getViewingPlaylistUid()).editVideo(video);
}

PlaylistCollectionManager.prototype.deleteVideo = function(videoUid){
  if(this.getViewingPlaylistUid() == this.getPlayingPlaylistUid()){
    videoPlayerManager.removeFromQueue(videoUid);
  }
  this.playlistManagers.get(this.getViewingPlaylistUid()).deleteVideo(videoUid);
}

PlaylistCollectionManager.prototype.deleteVideoFromPlaying = function(videoUid){
  videoPlayerManager.removeFromQueue(videoUid);
  this.playlistManagers.get(this.getPlayingPlaylistUid()).deleteVideo(videoUid);
}

PlaylistCollectionManager.prototype.insertVideo = function(playlistUid, videoId){
  if(typeof playlistUid == "number"){
    playlistUid = playlistUid.toString();
  }
  var tempThis = this;
  createVideo(videoId, function(videoInfo){
    if(typeof videoInfo.uid == "undefined"){
      videoInfo.uid = playlistCollectionManager.getPlaylist(playlistUid).videoUidGenerator;
      playlistCollectionManager.getPlaylist(playlistUid).videoUidGenerator++;
    }
    if(playlistUid == tempThis.getPlayingPlaylistUid()){
      videoPlayerManager.addToQueue(videoInfo);
    }
    tempThis.playlistManagers.get(playlistUid).insertVideo(videoInfo);
  });
}

PlaylistCollectionManager.prototype.getPlaylist = function(uid){
  return this.playlistManagers.get(uid).getPlaylist();
}

PlaylistCollectionManager.prototype.getPlaylistLength = function(uid){
  return this.getPlaylist(uid).videos.length;
}

PlaylistCollectionManager.prototype.getPlaylistCollection = function(){
  var temp = [];
  this.playlistManagers.forEach(function(value, key){
    temp.push(value.playlist);  
  });
  return temp;
}

PlaylistCollectionManager.prototype.getPlaylistCollectionLength = function(){
  return this.getPlaylistCollection().length;
}

PlaylistCollectionManager.prototype.size = function(){
  return this.playlistManagers.size;
}

function PlaylistManager(playlist){
  this.playlist = playlist;
}

PlaylistManager.prototype.editPlaylist = function(editedPlaylist){
  if(this.playlist.uid != editedPlaylist.uid){
    console.error("Playlist edit has different uids");
  }
  this.playlist = editedPlaylist;
  chrome.storage.local.remove(editedPlaylist.uid, function(){
    if(chrome.runtime.lastError){
      console.warn(chrome.runtime.lastError.message);
    }
    
    var obj = {};
    obj[editedPlaylist.uid] = editedPlaylist;
    chrome.storage.local.set(obj, function(){
      if(chrome.runtime.lastError){
        console.warn(chrome.runtime.lastError.message);
      }
    });
  });
}

PlaylistManager.prototype.getPlaylist = function(){
  return this.playlist;
}

PlaylistManager.prototype.editVideo = function(video){
  var i;
  for(i = 0; i < this.playlist.videos.length; i++){
    if(this.playlist.videos[i].uid == video.uid){
      this.playlist.videos[i] = video;
      playlistCollectionManager.editPlaylist(this.playlist);
      i = this.playlist.videos.length;
    }
  }
}

PlaylistManager.prototype.insertVideo = function(video){  
  this.playlist.videos.push(video);
  this.editPlaylist(this.playlist);
  var videoIndex = this.playlist.videos.length - 1;
  if(this.playlist.uid == playlistCollectionManager.getViewingPlaylistUid()){
    chrome.runtime.sendMessage({request: "createVideoDiv", video: video});
  }
}

PlaylistManager.prototype.deleteVideo = function(videoUid){
  var i;
  for(i = 0; i < this.playlist.videos.length; i++){
    if(this.playlist.videos[i].uid == videoUid){
      this.playlist.videos.splice(i, 1);
      playlistCollectionManager.editPlaylist(this.playlist);
      i = this.playlist.videos.length;
    }
  }
}

function VideoPlayerManager(){
  this.backgroundVideoPlayer = undefined;
  this.queue = undefined;
  this.queueIndex = 0;
  this.playlistManager = undefined;
  this.playButtonsMap = undefined;
  this.userPause = false;
  this.userPlay = false;
  this.fastForwarding = false;
}

VideoPlayerManager.prototype.UNSTARTED = -1;
VideoPlayerManager.prototype.ENDED = 0;
VideoPlayerManager.prototype.PLAYING = 1;
VideoPlayerManager.prototype.PAUSED = 2;
VideoPlayerManager.prototype.BUFFERING = 3;
VideoPlayerManager.prototype.CUED = 5;

VideoPlayerManager.prototype.setBackgroundVideoPlayer = function(player){
  this.backgroundVideoPlayer = player;
  var tempThis = this;
}

VideoPlayerManager.prototype.setPlaylistManager = function(manager){
  this.playlistManager = manager;
}

VideoPlayerManager.prototype.initQueue = function(startUid){
  if(typeof this.playlistManager == "undefined"){
    throw 'Error: can\'t init queue when playlist manager is undefined';
  }
  
  this.queue = [];
  this.queueIndex = 0;
  var videos = this.playlistManager.playlist.videos.slice(0);
  var startIndex = 0;
  
  // Find the index where the queue should start
  if(typeof startUid != "undefined"){
    var i;
    for(i = 0; i < videos.length; i++){
      if(videos[i].uid == startUid){
        startIndex = i;
        i = videos.length;
      }
    }
  }

  // If shuffle is turned on, then shuffle the playlist and then push the videos into the queue
  if(shuffleOn){
    // Move the video at the start index to the front
    var temp = videos[0];
    videos[0] = videos[startIndex];
    videos[startIndex] = temp;
    var i;
    for(i = arr.length - 1; i > 0; i--){
      var randomIndex = Math.floor((Math.random() * i) + 1);
      var temp = videos[randomIndex];
      videos[randomIndex] = videos[i];
      videos[i] = temp;
    }
    for(i = 0; i < videos.length; i++){
      this.queue.push(videos[i]);
    }
  }
  // If shuffle is turned off, push everything after the start index into the queue first
  // then everything in front of the start index
  else{
    this.queue = videos.slice();
    this.queueIndex = startIndex;
  }
}

VideoPlayerManager.prototype.startQueue = function(){
  currCycle = 0;
  this.cueVideo();
}

VideoPlayerManager.prototype.addToQueue = function(video){
  if(typeof this.queue == "undefined"){
    return;
  }
  this.queue.push(video);
}

VideoPlayerManager.prototype.getQueue = function(){
  return this.queue;
}

VideoPlayerManager.prototype.removeFromQueue = function(videoUid){
  var temp = this.queue.slice();
  var i;
  for(i = 0; i < this.queue.length; i++){
    if(this.queue[i].uid == videoUid){
      this.queue.splice(i, 1);
      if(i == this.queueIndex){
        this.queueIndex--;
      }
      i = this.queue.length;
    }
  }
}

VideoPlayerManager.prototype.cueVideo = function(){
  if(typeof this.queue == "undefined"){
    return;
  }
  this.backgroundVideoPlayer.cueVideo(this.queue[this.queueIndex]);
}

VideoPlayerManager.prototype.playVideo = function(){
  if(typeof this.queue == "undefined"){
    return;
  }
  this.userPlay = true;
  this.backgroundVideoPlayer.play();
  if(typeof this.playButtonsMap != "undefined"){
    var videoUid = this.queue[this.queueIndex].uid;
    this.playButtonsMap.get(videoUid).childNodes[0].style.display = "none";
    this.playButtonsMap.get(videoUid).childNodes[1].style.display = "block";
  }
}

VideoPlayerManager.prototype.pauseVideo = function(){
  if(typeof this.queue == "undefined"){
    return;
  }
  this.userPause = true;
  this.backgroundVideoPlayer.pause();
  var videoUid = this.queue[this.queueIndex].uid;
  this.playButtonsMap.get(videoUid).childNodes[0].style.display = "block";
  this.playButtonsMap.get(videoUid).childNodes[1].style.display = "none";
}

VideoPlayerManager.prototype.stopVideo = function(){
  if(typeof this.queue == "undefined"){
    return;
  }
  this.backgroundVideoPlayer.stop();
}

VideoPlayerManager.prototype.seekTo = function(time){
  if(typeof this.queue == "undefined"){
    return;
  }
  // Prevent fast forwarding to next video when video player is not playing and user seeks to 
  // the end of the video
  if(this.getBackgroundVideoPlayer().getPlayerState() != videoPlayerManager.PLAYING){
    seeking = true;
  }
  this.getBackgroundVideoPlayer().seekTo(time);
}

VideoPlayerManager.prototype.fastForward = function(){
  if(typeof this.queue == "undefined"){
    return;
  }
  var hasNext = false;
  var prevIndex = this.queueIndex;
  this.fastForwarding = true;
  if(this.queueIndex == (this.queue.length - 1) && repeatOn && this.queueIndex != -1){
    this.queueIndex = 0;
    this.cueVideo();
    hasNext = true;
  }
  else if(this.queueIndex == (this.queue.length - 1) && !repeatOn){
    if(this.getBackgroundVideoPlayer().getPlayerState() == this.PLAYING){
      this.stopVideo();
      if(popupOpen){
        chrome.runtime.sendMessage({request: "resetTimeBar"});
      }
    }
    if(playlistCollectionManager.getViewingPlaylistUid() == playlistCollectionManager.getPlayingPlaylistUid()){
      this.playButtonsMap.get(this.queue[this.queueIndex].uid).childNodes[0].style.display = "block";
      this.playButtonsMap.get(this.queue[this.queueIndex].uid).childNodes[1].style.display = "none";
      this.playButtonsMap.get(this.queue[this.queueIndex].uid).parentNode.childNodes[3].style.color = "white";
    }
    playlistCollectionManager.setPlayingPlaylistUid(undefined);
    this.resetQueue();
    if(popupOpen){
      chrome.runtime.sendMessage({request: "playlistEnded"});
    }
  }
  else if(this.queueIndex != this.queue.length - 1){
    this.queueIndex++;
    this.cueVideo();
    hasNext = true;
  }
  if(hasNext && popupOpen &&
     playlistCollectionManager.getPlayingPlaylistUid() == playlistCollectionManager.getViewingPlaylistUid() &&
     typeof this.playButtonsMap != "undefined"){
    if(prevIndex >= 0){
      this.playButtonsMap.get(this.queue[prevIndex].uid).childNodes[0].style.display = "block";
      this.playButtonsMap.get(this.queue[prevIndex].uid).childNodes[1].style.display = "none";
      this.playButtonsMap.get(this.queue[prevIndex].uid).parentNode.childNodes[3].style.color = "white";
    }
    this.playButtonsMap.get(this.queue[this.queueIndex].uid).childNodes[0].style.display = "none";
    this.playButtonsMap.get(this.queue[this.queueIndex].uid).childNodes[1].style.display = "block";
    this.playButtonsMap.get(this.queue[this.queueIndex].uid).parentNode.childNodes[3].style.color = "turquoise";
  }
  if(hasNext && popupOpen){
    chrome.runtime.sendMessage({request: "updateControlButton", play: true});
  }
}

VideoPlayerManager.prototype.rewind = function(){
  if(typeof this.queue == "undefined"){
    return;
  }
  if(this.queueIndex > 0){
    this.queueIndex--;
    this.cueVideo();
    if(playlistCollectionManager.getPlayingPlaylistUid() == playlistCollectionManager.getViewingPlaylistUid() &&
       typeof this.playButtonsMap != "undefined"){
      if(this.queueIndex + 1 < this.queue.length){
        this.playButtonsMap.get(this.queue[this.queueIndex + 1].uid).childNodes[0].style.display = "block";
        this.playButtonsMap.get(this.queue[this.queueIndex + 1].uid).childNodes[1].style.display = "none";
        this.playButtonsMap.get(this.queue[this.queueIndex + 1].uid).parentNode.childNodes[3].style.color = "white";
      }
      this.playButtonsMap.get(this.queue[this.queueIndex].uid).childNodes[0].style.display = "none";
      this.playButtonsMap.get(this.queue[this.queueIndex].uid).childNodes[1].style.display = "block";
      this.playButtonsMap.get(this.queue[this.queueIndex].uid).parentNode.childNodes[3].style.color = "turquoise";
    }
    chrome.runtime.sendMessage({request: "updateControlButton", play: true});
  }
}

VideoPlayerManager.prototype.getBackgroundVideoPlayer = function(){
  return this.backgroundVideoPlayer;
}

VideoPlayerManager.prototype.getVideoBeingPlayed = function(){
  if(typeof this.queue == "undefined" || this.queue.length == 0){
    return undefined;
  }
  return this.queue[this.queueIndex];
}

VideoPlayerManager.prototype.getPlayButton = function(id){
  var returnVal = undefined;
  this.playButtonsMap.forEach(function(value, key){
    if(value.parentNode.id == id){
      returnVal = value;
    }
  });
  return returnVal;
}

VideoPlayerManager.prototype.getCurrPlayButtonId = function(){
  var temp = this.playButtonsMap.get(this.getVideoBeingPlayed().uid).parentNode.id;
  return temp;
}

VideoPlayerManager.prototype.getPrevVideoBeingPlayed = function(){
  if(typeof this.queue == "undefined" || this.queue.length == 0){
    return undefined;
  }
  else if(this.queue.length == 1){
    return this.queue[this.queueIndex];
  }
  else{
    var index = this.queueIndex - 1;
    if(index < 0){
      index = this.queue.length - 1;
    }
    return this.queue[index];
  }
}

VideoPlayerManager.prototype.setPlayButtons = function(playButtonsMap){
  this.playButtonsMap = playButtonsMap;
}

VideoPlayerManager.prototype.resetQueue = function(){
  this.queue = undefined;
  this.queueIndex = 0;
}

var videoPlayerManager = new VideoPlayerManager();

function VideoPlayer(player){
  this.player = player;
  this.userPause = false;
  this.stopped = false;
}

VideoPlayer.prototype.SYNC = 0;
VideoPlayer.prototype.SEEK = 1;

VideoPlayer.prototype.loadVideo = function(video){
  if(typeof video.startTime == "undefined" || typeof video.endTime == "undefined"){
    this.player.loadVideoById(video.videoId, 0, "small");
  }
  else{
    this.player.loadVideoById({"videoId": video.videoId,
                          "startSeconds": video.startTime,
                          "endSeconds": video.endTime,
                          "suggestedQuality": "small"});  
  }
}

VideoPlayer.prototype.cueVideo = function(video){
  var startTime = 0;
  var endTime = 0;
  if(typeof video.startTime == "undefined" && typeof video.endTime == "undefined"){
    this.player.cueVideoById(video.videoId, 0, "small");
    var start = video.duration.indexOf("PT") + 2;
    var end = video.duration.indexOf("M");
    var min = parseInt(video.duration.slice(start, end));
    var sec = parseInt(video.duration.slice(end + 1, video.duration.indexOf("S")));
    endTime = min * 60 + sec;
  }
  else if(typeof video.startTime == "undefined"){
    this.player.cueVideoById({"videoId": video.videoId,
                              "startSeconds": 0,
                              "endSeconds": video.endTime,
                              "suggestedQuality": "small"
      
    });
    endTime = video.endTime;
  }
  else if(typeof video.endTime == "undefined"){
    this.player.cueVideoById(video.videoId, video.startTime, "small");
    var start = video.duration.indexOf("PT") + 2;
    var end = video.duration.indexOf("M");
    var min = parseInt(video.duration.slice(start, end));
    var sec = parseInt(video.duration.slice(end + 1, video.duration.indexOf("S")));
    startTime = video.starTime;
    endTime = min * 60 + sec;
  }
  else{
    this.player.cueVideoById({"videoId": video.videoId,
                              "startSeconds": video.startTime,
                              "endSeconds": video.endTime,
                              "suggestedQuality": "small"
    });
    startTime = video.startTime;
    endTime = video.endTime
  }
  chrome.runtime.sendMessage({request: "initTimeBar", startTime: startTime, endTime: endTime});
}

VideoPlayer.prototype.getPlayerState = function(){
  return this.player.getPlayerState();
}

VideoPlayer.prototype.play = function(){
  this.stopped = false;
  this.player.playVideo();
}

VideoPlayer.prototype.pause = function(){
  this.player.pauseVideo();
}

VideoPlayer.prototype.stop = function(){
  this.stopped = true;
  this.player.stopVideo();
}

VideoPlayer.prototype.seekTo = function(time){
  this.player.seekTo(time);
}

VideoPlayer.prototype.getCurrentTime = function(){
  return this.player.getCurrentTime();
}

VideoPlayer.prototype.getDuration = function(){
  return this.player.getDuration();
}

VideoPlayer.prototype.getVideoUrl = function(){
  return this.player.getVideoUrl();
}

VideoPlayer.prototype.setVolume = function(volume){
  this.player.setVolume(volume);
}

VideoPlayer.prototype.mute = function(){
  this.player.mute();
}

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
  
  videoPlayerManager.setBackgroundVideoPlayer(new VideoPlayer(player));
}

var testForRestrictedVideo = [5, -1, 3, -1];
var numInARow = 0;

function onPlayerStateChange(event) {
  var backgroundPlayer = videoPlayerManager.getBackgroundVideoPlayer();
  if(navigator.onLine){
    if(event.data == testForRestrictedVideo[numInARow]){
      // Video is restricted so fast forward to the next song
      if(numInARow == testForRestrictedVideo.length - 1){
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
        numInARow = 0;
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