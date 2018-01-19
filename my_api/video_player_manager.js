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